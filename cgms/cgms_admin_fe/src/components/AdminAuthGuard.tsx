'use client'

import { useEffect, useState } from 'react'

import { ADMIN_TOKEN_KEY } from '@/lib/adminApi'

export default function AdminAuthGuard({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const t = localStorage.getItem(ADMIN_TOKEN_KEY)
    if (!t) {
      window.location.replace(`${window.location.origin}/login`)
      return
    }
    setReady(true)
  }, [])

  if (!ready) {
    return (
      <div className='d-flex min-vh-100 align-items-center justify-content-center flex-column gap-3 px-3 text-center'>
        <div className='spinner-border text-primary' role='status'>
          <span className='visually-hidden'>Loading</span>
        </div>
        <p className='text-secondary small mb-0'>세션 확인 중…</p>
        <a href='/login' className='small'>
          로그인으로 이동
        </a>
      </div>
    )
  }

  return <>{children}</>
}
