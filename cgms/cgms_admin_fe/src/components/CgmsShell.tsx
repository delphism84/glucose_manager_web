'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, Cpu, Database, LogOut } from 'lucide-react'

import { ADMIN_TOKEN_KEY } from '@/lib/adminApi'

const nav = [
  { href: '/dashboard', label: '대시보드', icon: LayoutDashboard },
  { href: '/users', label: '사용자 관리', icon: Users },
  { href: '/devices', label: '기기 관리', icon: Cpu },
  { href: '/data', label: '데이터 관리', icon: Database }
]

export default function CgmsShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  const logout = () => {
    if (typeof window !== 'undefined') localStorage.removeItem(ADMIN_TOKEN_KEY)
    window.location.href = '/login'
  }

  return (
    <div className='d-flex min-vh-100'>
      <aside className='d-flex flex-column border-end bg-white shadow-sm' style={{ width: 240, minWidth: 240 }}>
        <div className='p-3 border-bottom'>
          <Link href='/dashboard' className='text-decoration-none fw-semibold text-dark'>
            EMPECS CGMS
          </Link>
          <div className='small text-secondary'>Admin</div>
        </div>
        <nav className='nav flex-column p-2 gap-1 flex-grow-1'>
          {nav.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== '/dashboard' && pathname?.startsWith(href))
            return (
              <Link
                key={href}
                href={href}
                className={`nav-link d-flex align-items-center gap-2 rounded py-2 px-3 ${
                  active ? 'bg-primary text-white' : 'text-dark'
                }`}
              >
                <Icon size={18} />
                {label}
              </Link>
            )
          })}
        </nav>
        <div className='p-2 mt-auto border-top'>
          <button type='button' className='btn btn-outline-danger btn-sm w-100 d-flex align-items-center justify-content-center gap-2' onClick={logout}>
            <LogOut size={16} />
            로그아웃
          </button>
        </div>
      </aside>
      <main className='flex-grow-1 overflow-auto' style={{ background: 'var(--bs-body-bg)' }}>
        <div className='container-fluid py-4 px-4'>{children}</div>
      </main>
    </div>
  )
}
