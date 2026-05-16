'use client'

import { useState } from 'react'
import type { FormEvent } from 'react'
import { useRouter } from 'next/navigation'

import { ADMIN_TOKEN_KEY, apiUrl } from '@/lib/adminApi'

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorText, setErrorText] = useState('')

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setErrorText('')
    setLoading(true)
    try {
      const res = await fetch(apiUrl('/api/admin/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setErrorText(res.status === 401 ? '아이디 또는 비밀번호가 올바르지 않습니다.' : `로그인 실패 (HTTP ${res.status})`)
        return
      }
      const token = typeof data?.token === 'string' ? data.token : ''
      if (!token) {
        setErrorText('서버 응답에 토큰이 없습니다.')
        return
      }
      localStorage.setItem(ADMIN_TOKEN_KEY, token)
      router.push('/dashboard')
    } catch {
      setErrorText('네트워크 오류입니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='min-vh-100 d-flex align-items-center justify-content-center p-4'>
      <div className='card shadow-sm border-0' style={{ maxWidth: 420, width: '100%' }}>
        <div className='card-body p-4 p-md-5'>
          <h1 className='h4 fw-semibold mb-1'>EMPECS CGMS Admin</h1>
          <p className='text-secondary small mb-4'>관리자 계정으로 로그인하세요.</p>
          <form onSubmit={onSubmit}>
            <div className='mb-3'>
              <label className='form-label'>아이디</label>
              <input
                className='form-control'
                autoComplete='username'
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
              />
            </div>
            <div className='mb-3'>
              <label className='form-label'>비밀번호</label>
              <input
                type='password'
                className='form-control'
                autoComplete='current-password'
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>
            {errorText ? (
              <div className='alert alert-danger py-2 small' role='alert'>
                {errorText}
              </div>
            ) : null}
            <button type='submit' className='btn btn-primary w-100' disabled={loading}>
              {loading ? '로그인 중…' : '로그인'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
