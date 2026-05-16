'use client'

import { User } from 'lucide-react'

export type UserTreeItem = {
  id: string
  email: string
  name: string
  provider: string
}

type Props = {
  items: UserTreeItem[]
  selectedId: string | null
  onSelect: (u: UserTreeItem) => void
  loading?: boolean
}

function bucketKey(email: string) {
  const ch = (email.trim()[0] || '?').toUpperCase()
  if (/[A-Z]/.test(ch)) return ch
  if (/[0-9]/.test(ch)) return '0–9'
  return '#'
}

export default function UserTreePanel({ items, selectedId, onSelect, loading }: Props) {
  const groups = new Map<string, UserTreeItem[]>()
  for (const u of items) {
    const k = bucketKey(u.email)
    if (!groups.has(k)) groups.set(k, [])
    groups.get(k)!.push(u)
  }
  const keys = Array.from(groups.keys()).sort((a, b) => a.localeCompare(b))

  return (
    <div className='admin-console-grid admin-console-grid--agent-tree h-100'>
      <div className='p-2 border-bottom bg-secondary bg-opacity-10'>
        <span className='small fw-semibold text-secondary'>사용자 ({items.length.toLocaleString()})</span>
      </div>
      <div className='p-2' style={{ maxHeight: 'min(78vh, 880px)', overflowY: 'auto' }}>
        {loading ? (
          <p className='small text-secondary mb-0'>불러오는 중…</p>
        ) : items.length === 0 ? (
          <p className='small text-secondary mb-0'>사용자가 없습니다.</p>
        ) : (
          keys.map((key) => {
            const list = groups.get(key)!
            return (
              <details key={key} className='mb-1' open>
                <summary className='small fw-semibold text-secondary user-select-none' style={{ cursor: 'pointer' }}>
                  {key} <span className='text-secondary fw-normal'>({list.length})</span>
                </summary>
                <div className='agent-tree-nested ms-1 mt-1'>
                  {list.map((u) => {
                    const active = selectedId === u.id
                    return (
                      <button
                        key={u.id}
                        type='button'
                        className={`btn btn-sm w-100 text-start mb-1 d-flex align-items-center gap-2 rounded-3 ${
                          active ? 'btn-primary' : 'btn-light border'
                        }`}
                        onClick={() => onSelect(u)}
                      >
                        <User size={14} className='flex-shrink-0 opacity-75' />
                        <span className='text-truncate' title={u.email}>
                          {u.email}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </details>
            )
          })
        )}
      </div>
    </div>
  )
}
