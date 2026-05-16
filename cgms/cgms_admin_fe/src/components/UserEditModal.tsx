'use client'

import { useCallback, useEffect, useState } from 'react'

import { adminFetch } from '@/lib/adminApi'

export type AdminUserDetail = {
  id: string
  email: string
  firstName: string
  lastName: string
  name: string
  dateOfBirth: string
  gender: string
  unit: string
  countryCode: string
  language: string
  provider: string | null
  providerId: string
  hasPassword: boolean
  createdAt: string
  updatedAt: string
}

type Props = {
  userId: string | null
  open: boolean
  onClose: () => void
  onSaved: () => void
}

const empty: AdminUserDetail = {
  id: '',
  email: '',
  firstName: '',
  lastName: '',
  name: '',
  dateOfBirth: '',
  gender: '',
  unit: 'mg/dL',
  countryCode: '',
  language: '',
  provider: null,
  providerId: '',
  hasPassword: false,
  createdAt: '',
  updatedAt: ''
}

export default function UserEditModal({ userId, open, onClose, onSaved }: Props) {
  const [form, setForm] = useState<AdminUserDetail>(empty)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [pw1, setPw1] = useState('')
  const [pw2, setPw2] = useState('')
  const [err, setErr] = useState('')
  const [msg, setMsg] = useState('')

  const load = useCallback(async () => {
    if (!userId) return
    setErr('')
    setMsg('')
    setLoading(true)
    try {
      const res = await adminFetch(`/api/admin/users/${userId}`)
      if (res.status === 401) {
        setErr('인증 만료')
        return
      }
      if (!res.ok) {
        setErr(`불러오기 실패 (${res.status})`)
        return
      }
      const data = (await res.json()) as AdminUserDetail
      setForm({ ...empty, ...data })
      setPw1('')
      setPw2('')
    } catch {
      setErr('네트워크 오류')
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    if (open && userId) void load()
  }, [open, userId, load])

  const patchField = (k: keyof AdminUserDetail, v: string) => {
    setForm((f) => ({ ...f, [k]: v }))
  }

  const saveProfile = async () => {
    if (!userId) return
    setErr('')
    setMsg('')
    setSaving(true)
    try {
      const res = await adminFetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          email: form.email,
          firstName: form.firstName,
          lastName: form.lastName,
          name: form.name,
          dateOfBirth: form.dateOfBirth,
          gender: form.gender,
          unit: form.unit,
          countryCode: form.countryCode,
          language: form.language
        })
      })
      const data = await res.json().catch(() => ({}))
      if (res.status === 401) {
        setErr('인증 만료')
        return
      }
      if (res.status === 409) {
        setErr('이미 사용 중인 이메일입니다.')
        return
      }
      if (!res.ok) {
        setErr(typeof data?.error === 'string' ? data.error : `저장 실패 (${res.status})`)
        return
      }
      if (data?.user) setForm({ ...empty, ...(data.user as AdminUserDetail) })
      setMsg('저장되었습니다.')
      onSaved()
    } catch {
      setErr('네트워크 오류')
    } finally {
      setSaving(false)
    }
  }

  const savePassword = async () => {
    if (!userId) return
    setErr('')
    setMsg('')
    if (pw1.length < 8) {
      setErr('새 비밀번호는 8자 이상이어야 합니다.')
      return
    }
    if (pw1 !== pw2) {
      setErr('새 비밀번호 확인이 일치하지 않습니다.')
      return
    }
    setSaving(true)
    try {
      const res = await adminFetch(`/api/admin/users/${userId}/password`, {
        method: 'POST',
        body: JSON.stringify({ password: pw1 })
      })
      if (res.status === 401) {
        setErr('인증 만료')
        return
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setErr(typeof data?.error === 'string' ? data.error : `비밀번호 변경 실패 (${res.status})`)
        return
      }
      setPw1('')
      setPw2('')
      setMsg('비밀번호가 변경되었습니다.')
      void load()
      onSaved()
    } catch {
      setErr('네트워크 오류')
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  return (
    <div className='modal fade show d-block' tabIndex={-1} style={{ background: 'rgba(15,23,42,0.45)' }} role='dialog'>
      <div className='modal-dialog modal-lg modal-dialog-scrollable'>
        <div className='modal-content'>
          <div className='modal-header'>
            <h2 className='modal-title h5'>회원 상세 · 편집</h2>
            <button type='button' className='btn-close' aria-label='닫기' onClick={onClose} />
          </div>
          <div className='modal-body'>
            {loading ? (
              <p className='text-secondary mb-0'>불러오는 중…</p>
            ) : (
              <>
                {err ? (
                  <div className='alert alert-danger py-2' role='alert'>
                    {err}
                  </div>
                ) : null}
                {msg ? (
                  <div className='alert alert-success py-2' role='alert'>
                    {msg}
                  </div>
                ) : null}

                <div className='row g-3'>
                  <div className='col-md-6'>
                    <label className='form-label'>이메일</label>
                    <input
                      className='form-control form-control-sm'
                      value={form.email}
                      onChange={(e) => patchField('email', e.target.value)}
                      autoComplete='off'
                    />
                  </div>
                  <div className='col-md-6'>
                    <label className='form-label'>표시 이름</label>
                    <input className='form-control form-control-sm' value={form.name} onChange={(e) => patchField('name', e.target.value)} />
                  </div>
                  <div className='col-md-6'>
                    <label className='form-label'>이름 (성)</label>
                    <input className='form-control form-control-sm' value={form.firstName} onChange={(e) => patchField('firstName', e.target.value)} />
                  </div>
                  <div className='col-md-6'>
                    <label className='form-label'>이름 (이름)</label>
                    <input className='form-control form-control-sm' value={form.lastName} onChange={(e) => patchField('lastName', e.target.value)} />
                  </div>
                  <div className='col-md-6'>
                    <label className='form-label'>생년월일</label>
                    <input
                      type='date'
                      className='form-control form-control-sm'
                      value={form.dateOfBirth ? form.dateOfBirth.slice(0, 10) : ''}
                      onChange={(e) => patchField('dateOfBirth', e.target.value)}
                    />
                  </div>
                  <div className='col-md-6'>
                    <label className='form-label'>성별</label>
                    <select className='form-select form-select-sm' value={form.gender} onChange={(e) => patchField('gender', e.target.value)}>
                      <option value=''>—</option>
                      <option value='male'>male</option>
                      <option value='female'>female</option>
                      <option value='other'>other</option>
                    </select>
                  </div>
                  <div className='col-md-6'>
                    <label className='form-label'>단위</label>
                    <select className='form-select form-select-sm' value={form.unit} onChange={(e) => patchField('unit', e.target.value)}>
                      <option value='mg/dL'>mg/dL</option>
                      <option value='mmol'>mmol</option>
                    </select>
                  </div>
                  <div className='col-md-6'>
                    <label className='form-label'>국가 코드</label>
                    <input className='form-control form-control-sm' value={form.countryCode} onChange={(e) => patchField('countryCode', e.target.value)} />
                  </div>
                  <div className='col-md-6'>
                    <label className='form-label'>언어</label>
                    <input className='form-control form-control-sm' value={form.language} onChange={(e) => patchField('language', e.target.value)} />
                  </div>
                  <div className='col-md-6'>
                    <label className='form-label'>가입 경로</label>
                    <input className='form-control form-control-sm' value={form.provider || 'local'} readOnly disabled />
                  </div>
                  <div className='col-md-6'>
                    <label className='form-label'>Provider ID</label>
                    <input className='form-control form-control-sm' value={form.providerId} readOnly disabled />
                  </div>
                  <div className='col-12'>
                    <small className='text-secondary'>
                      가입 {form.createdAt ? new Date(form.createdAt).toLocaleString('ko-KR') : '—'} · 수정{' '}
                      {form.updatedAt ? new Date(form.updatedAt).toLocaleString('ko-KR') : '—'}
                      {form.hasPassword ? '' : ' · 비밀번호 미설정(소셜 전용 가능)'}
                    </small>
                  </div>
                </div>

                <hr className='my-4' />
                <h3 className='h6'>비밀번호 변경 (관리자 · 기존 비밀번호 불필요)</h3>
                <div className='row g-3 align-items-end'>
                  <div className='col-md-5'>
                    <label className='form-label'>새 비밀번호 (8자 이상)</label>
                    <input
                      type='password'
                      className='form-control form-control-sm'
                      value={pw1}
                      onChange={(e) => setPw1(e.target.value)}
                      autoComplete='new-password'
                    />
                  </div>
                  <div className='col-md-5'>
                    <label className='form-label'>새 비밀번호 확인</label>
                    <input
                      type='password'
                      className='form-control form-control-sm'
                      value={pw2}
                      onChange={(e) => setPw2(e.target.value)}
                      autoComplete='new-password'
                    />
                  </div>
                  <div className='col-md-2'>
                    <button type='button' className='btn btn-outline-primary btn-sm w-100' disabled={saving || !pw1} onClick={() => void savePassword()}>
                      비밀번호 적용
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
          <div className='modal-footer'>
            <button type='button' className='btn btn-secondary btn-sm' onClick={onClose}>
              닫기
            </button>
            <button type='button' className='btn btn-primary btn-sm' disabled={saving || loading} onClick={() => void saveProfile()}>
              프로필 저장
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
