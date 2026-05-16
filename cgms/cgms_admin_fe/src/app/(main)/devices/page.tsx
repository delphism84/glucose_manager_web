'use client'

import { useCallback, useState } from 'react'

import AdminFilterToolbar, { type AdminFilterValues } from '@/components/AdminFilterToolbar'
import { adminFetch } from '@/lib/adminApi'

type Row = {
  id: string
  serial: string
  bleMac: string
  userEmail: string
  userLabel: string
  createdAt: string
  updatedAt: string
}

const emptyFilter: AdminFilterValues = { user: '', sn: '', mac: '', from: '', to: '' }

function buildQuery(f: AdminFilterValues, page: number, limit: number) {
  const p = new URLSearchParams()
  if (f.user.trim()) p.set('user', f.user.trim())
  if (f.sn.trim()) p.set('sn', f.sn.trim())
  if (f.mac.trim()) p.set('mac', f.mac.trim())
  if (f.from) p.set('from', f.from)
  if (f.to) p.set('to', f.to)
  p.set('page', String(page))
  p.set('limit', String(limit))
  return p.toString()
}

export default function DevicesPage() {
  const [filter, setFilter] = useState<AdminFilterValues>(emptyFilter)
  const [applied, setApplied] = useState<AdminFilterValues>(emptyFilter)
  const [rows, setRows] = useState<Row[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [limit] = useState(25)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  const load = useCallback(
    async (p: number, f: AdminFilterValues) => {
      setErr('')
      setLoading(true)
      try {
        const qs = buildQuery(f, p + 1, limit)
        const res = await adminFetch(`/api/admin/devices?${qs}`)
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

  const onSearch = () => {
    setApplied(filter)
    setPage(0)
    load(0, filter)
  }

  return (
    <div>
      <h1 className='h4 fw-semibold mb-4'>기기 관리</h1>
      <AdminFilterToolbar value={filter} onChange={setFilter} onSearch={onSearch} loading={loading} />
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
                <th>S/N</th>
                <th>MAC</th>
                <th>사용자</th>
                <th>이메일</th>
                <th>등록일</th>
                <th>수정일</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className='text-secondary text-center py-4'>
                    조건에 맞는 기기가 없거나 조회를 실행하세요.
                  </td>
                </tr>
              ) : (
                rows.map(r => (
                  <tr key={r.id}>
                    <td className='text-nowrap'>{r.serial}</td>
                    <td className='text-nowrap font-monospace small'>{r.bleMac}</td>
                    <td>{r.userLabel}</td>
                    <td>{r.userEmail}</td>
                    <td className='text-nowrap small'>{r.createdAt ? new Date(r.createdAt).toLocaleString('ko-KR') : '—'}</td>
                    <td className='text-nowrap small'>{r.updatedAt ? new Date(r.updatedAt).toLocaleString('ko-KR') : '—'}</td>
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
          <button type='button' className='btn btn-outline-secondary' disabled={page === 0 || loading} onClick={() => load(page - 1, applied)}>
            이전
          </button>
          <button
            type='button'
            className='btn btn-outline-secondary'
            disabled={loading || (page + 1) * limit >= total}
            onClick={() => load(page + 1, applied)}
          >
            다음
          </button>
        </div>
      </div>
    </div>
  )
}
