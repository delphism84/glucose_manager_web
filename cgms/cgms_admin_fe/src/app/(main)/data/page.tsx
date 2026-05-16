'use client'

import { useCallback, useEffect, useState } from 'react'

import UserTreePanel, { type UserTreeItem } from '@/components/UserTreePanel'
import { adminFetch } from '@/lib/adminApi'

type Row = {
  id: string
  eqsn: string
  value: number
  time: string
  trid?: number | string | null
  userEmail: string
  userLabel: string
}

function todayYmd() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function buildQuery(userId: string, from: string, to: string, page: number, limit: number, sn: string) {
  const p = new URLSearchParams()
  p.set('userId', userId)
  if (from) p.set('from', from)
  if (to) p.set('to', to)
  if (sn.trim()) p.set('sn', sn.trim())
  p.set('page', String(page))
  p.set('limit', String(limit))
  return p.toString()
}

export default function DataPage() {
  const [treeItems, setTreeItems] = useState<UserTreeItem[]>([])
  const [treeLoading, setTreeLoading] = useState(true)
  const [selected, setSelected] = useState<UserTreeItem | null>(null)
  const [from, setFrom] = useState(todayYmd)
  const [to, setTo] = useState(todayYmd)
  const [appliedFrom, setAppliedFrom] = useState(todayYmd)
  const [appliedTo, setAppliedTo] = useState(todayYmd)
  const [sn, setSn] = useState('')
  const [appliedSn, setAppliedSn] = useState('')
  const [rows, setRows] = useState<Row[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [limit] = useState(25)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setTreeLoading(true)
      try {
        const res = await adminFetch('/api/admin/users?page=1&limit=500')
        if (!res.ok) return
        const data = await res.json()
        const items = Array.isArray(data.items) ? data.items : []
        if (!cancelled) {
          setTreeItems(
            items.map((r: { id: string; email: string; name: string; provider: string }) => ({
              id: r.id,
              email: r.email,
              name: r.name,
              provider: r.provider
            }))
          )
        }
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setTreeLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const loadData = useCallback(
    async (p: number, uid: string, f: string, t: string, serial: string) => {
      setErr('')
      setLoading(true)
      try {
        const qs = buildQuery(uid, f, t, p + 1, limit, serial)
        const res = await adminFetch(`/api/admin/data?${qs}`)
        if (res.status === 401) {
          setErr('인증 만료')
          return
        }
        if (!res.ok) {
          setErr(`조회 실패 (${res.status})`)
          return
        }
        const data = await res.json()
        setRows(Array.isArray(data.items) ? data.items : [])
        setTotal(typeof data.total === 'number' ? data.total : 0)
        setPage(p)
      } catch {
        setErr('네트워크 오류')
      } finally {
        setLoading(false)
      }
    },
    [limit]
  )

  useEffect(() => {
    if (!selected) return
    void loadData(page, selected.id, appliedFrom, appliedTo, appliedSn)
  }, [selected, page, appliedFrom, appliedTo, appliedSn, loadData])

  const onSelectUser = (u: UserTreeItem) => {
    const t = todayYmd()
    setSelected(u)
    setFrom(t)
    setTo(t)
    setAppliedFrom(t)
    setAppliedTo(t)
    setSn('')
    setAppliedSn('')
    setPage(0)
    setErr('')
  }

  const onApplySearch = () => {
    setAppliedFrom(from)
    setAppliedTo(to)
    setAppliedSn(sn)
    setPage(0)
  }

  return (
    <div>
      <h1 className='h4 fw-semibold mb-4'>데이터 관리</h1>
      <div className='row g-3'>
        <div className='col-lg-4'>
          <UserTreePanel items={treeItems} selectedId={selected?.id ?? null} onSelect={onSelectUser} loading={treeLoading} />
        </div>
        <div className='col-lg-8'>
          {!selected ? (
            <div className='admin-console-grid p-4 text-secondary'>왼쪽 트리에서 사용자를 선택하면 혈당 데이터가 표시됩니다. (기본 조회: 오늘 날짜)</div>
          ) : (
            <>
              <div className='d-flex flex-wrap align-items-end gap-2 mb-3'>
                <div>
                  <label className='form-label small mb-1'>시작일</label>
                  <input type='date' className='form-control form-control-sm' value={from} onChange={(e) => setFrom(e.target.value)} />
                </div>
                <div>
                  <label className='form-label small mb-1'>종료일</label>
                  <input type='date' className='form-control form-control-sm' value={to} onChange={(e) => setTo(e.target.value)} />
                </div>
                <div className='flex-grow-1' style={{ minWidth: 140 }}>
                  <label className='form-label small mb-1'>EQ S/N (선택)</label>
                  <input className='form-control form-control-sm' value={sn} onChange={(e) => setSn(e.target.value)} placeholder='부분 일치' />
                </div>
                <button type='button' className='btn btn-primary btn-sm' disabled={loading} onClick={onApplySearch}>
                  조회
                </button>
              </div>
              <p className='small text-secondary mb-2'>
                선택: <strong>{selected.email}</strong> ({selected.name})
              </p>
              {err ? (
                <div className='alert alert-danger py-2' role='alert'>
                  {err}
                </div>
              ) : null}
              <div className='admin-console-grid'>
                <div className='table-responsive'>
                  <table className='table table-hover table-sm mb-0'>
                    <thead className='table-light'>
                      <tr>
                        <th>측정 시각</th>
                        <th>EQ S/N</th>
                        <th>값</th>
                        <th>사용자</th>
                        <th>이메일</th>
                        <th>trid</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading && rows.length === 0 ? (
                        <tr>
                          <td colSpan={6} className='text-secondary text-center py-4'>
                            불러오는 중…
                          </td>
                        </tr>
                      ) : rows.length === 0 ? (
                        <tr>
                          <td colSpan={6} className='text-secondary text-center py-4'>
                            해당 기간에 데이터가 없습니다.
                          </td>
                        </tr>
                      ) : (
                        rows.map((r) => (
                          <tr key={r.id}>
                            <td className='text-nowrap'>{r.time ? new Date(r.time).toLocaleString('ko-KR') : '—'}</td>
                            <td className='text-nowrap'>{r.eqsn}</td>
                            <td>{r.value}</td>
                            <td>{r.userLabel}</td>
                            <td>{r.userEmail}</td>
                            <td className='small text-break'>{r.trid ?? '—'}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className='d-flex justify-content-between align-items-center mt-3 flex-wrap gap-2'>
                <span className='small text-secondary'>
                  총 {total.toLocaleString()}건 · {rows.length ? `${page * limit + 1}–${page * limit + rows.length}` : '0'} 표시
                </span>
                <div className='btn-group btn-group-sm'>
                  <button
                    type='button'
                    className='btn btn-outline-secondary'
                    disabled={page === 0 || loading}
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                  >
                    이전
                  </button>
                  <button
                    type='button'
                    className='btn btn-outline-secondary'
                    disabled={loading || (page + 1) * limit >= total}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    다음
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
