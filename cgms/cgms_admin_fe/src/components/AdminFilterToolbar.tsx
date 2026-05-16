'use client'

export type AdminFilterValues = {
  user: string
  sn: string
  mac: string
  from: string
  to: string
}

type Props = {
  value: AdminFilterValues
  onChange: (v: AdminFilterValues) => void
  onSearch: () => void
  loading?: boolean
}

export default function AdminFilterToolbar({ value, onChange, onSearch, loading }: Props) {
  const patch = (partial: Partial<AdminFilterValues>) => onChange({ ...value, ...partial })

  return (
    <div className='row g-2 align-items-end mb-4'>
      <div className='col-12 col-md-6 col-lg'>
        <label className='form-label small text-secondary mb-1'>사용자 (이메일·이름)</label>
        <input
          type='text'
          className='form-control form-control-sm'
          value={value.user}
          onChange={e => patch({ user: e.target.value })}
        />
      </div>
      <div className='col-6 col-md-3 col-lg'>
        <label className='form-label small text-secondary mb-1'>S/N</label>
        <input type='text' className='form-control form-control-sm' value={value.sn} onChange={e => patch({ sn: e.target.value })} />
      </div>
      <div className='col-6 col-md-3 col-lg'>
        <label className='form-label small text-secondary mb-1'>MAC</label>
        <input
          type='text'
          className='form-control form-control-sm'
          placeholder='AA:BB:CC 또는 AABBCC'
          value={value.mac}
          onChange={e => patch({ mac: e.target.value })}
        />
      </div>
      <div className='col-6 col-md-3 col-lg'>
        <label className='form-label small text-secondary mb-1'>시작일</label>
        <input type='date' className='form-control form-control-sm' value={value.from} onChange={e => patch({ from: e.target.value })} />
      </div>
      <div className='col-6 col-md-3 col-lg'>
        <label className='form-label small text-secondary mb-1'>종료일</label>
        <input type='date' className='form-control form-control-sm' value={value.to} onChange={e => patch({ to: e.target.value })} />
      </div>
      <div className='col-auto'>
        <button type='button' className='btn btn-primary btn-sm px-4' onClick={onSearch} disabled={loading}>
          {loading ? '조회 중…' : '조회'}
        </button>
      </div>
    </div>
  )
}
