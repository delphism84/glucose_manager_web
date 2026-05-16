'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'

import { adminFetch } from '@/lib/adminApi'

const PIE_COLORS = ['#6366f1', '#10b981', '#f59e0b']

type Stats = {
  totals: { users: number; devices: number; dataPoints: number }
  lineUsers: { day: string; count: number }[]
  barGlucose: { day: string; count: number }[]
  pieDevices: { name: string; value: number }[]
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setErr('')
    setLoading(true)
    try {
      const res = await adminFetch('/api/admin/stats')
      if (res.status === 401) {
        setErr('인증이 만료되었습니다. 다시 로그인해 주세요.')
        setStats(null)
        return
      }
      if (!res.ok) {
        setErr(`통계를 불러오지 못했습니다 (${res.status})`)
        setStats(null)
        return
      }
      setStats((await res.json()) as Stats)
    } catch {
      setErr('네트워크 오류')
      setStats(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (loading && !stats) {
    return (
      <div className='d-flex justify-content-center py-5'>
        <div className='spinner-border text-primary' role='status' />
      </div>
    )
  }

  return (
    <div>
      <h1 className='h4 fw-semibold mb-4'>대시보드</h1>
      {err ? (
        <div className='alert alert-danger' role='alert'>
          {err}
        </div>
      ) : null}
      {stats ? (
        <>
          <div className='row g-3 mb-4'>
            <div className='col-md-4'>
              <div className='card border-0 shadow-sm h-100'>
                <div className='card-body'>
                  <div className='text-secondary small'>총 회원</div>
                  <div className='fs-3 fw-semibold'>{stats.totals.users.toLocaleString()}</div>
                </div>
              </div>
            </div>
            <div className='col-md-4'>
              <div className='card border-0 shadow-sm h-100'>
                <div className='card-body'>
                  <div className='text-secondary small'>총 등록 기기</div>
                  <div className='fs-3 fw-semibold'>{stats.totals.devices.toLocaleString()}</div>
                </div>
              </div>
            </div>
            <div className='col-md-4'>
              <div className='card border-0 shadow-sm h-100'>
                <div className='card-body'>
                  <div className='text-secondary small'>총 데이터 건수</div>
                  <div className='fs-3 fw-semibold'>{stats.totals.dataPoints.toLocaleString()}</div>
                </div>
              </div>
            </div>
          </div>
          <div className='row g-3 mb-3'>
            <div className='col-lg-6'>
              <div className='card border-0 shadow-sm'>
                <div className='card-header bg-white border-0 py-3 fw-medium'>일별 신규 회원 (최근 14일)</div>
                <div className='card-body' style={{ height: 300 }}>
                  <ResponsiveContainer width='100%' height='100%'>
                    <LineChart data={stats.lineUsers} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray='3 3' />
                      <XAxis dataKey='day' tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Line type='monotone' dataKey='count' stroke='#6366f1' strokeWidth={2} dot={false} name='명' />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
            <div className='col-lg-6'>
              <div className='card border-0 shadow-sm'>
                <div className='card-header bg-white border-0 py-3 fw-medium'>일별 혈당 포인트 (최근 14일)</div>
                <div className='card-body' style={{ height: 300 }}>
                  <ResponsiveContainer width='100%' height='100%'>
                    <BarChart data={stats.barGlucose} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray='3 3' />
                      <XAxis dataKey='day' tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey='count' fill='#10b981' name='건' radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
          <div className='row g-3'>
            <div className='col-lg-6'>
              <div className='card border-0 shadow-sm'>
                <div className='card-header bg-white border-0 py-3 fw-medium'>사용자당 등록 기기 분포</div>
                <div className='card-body' style={{ height: 320 }}>
                  <ResponsiveContainer width='100%' height='100%'>
                    <PieChart>
                      <Pie
                        data={stats.pieDevices}
                        dataKey='value'
                        nameKey='name'
                        cx='50%'
                        cy='50%'
                        outerRadius={100}
                        label={({ name, value }) => (name != null && value != null ? `${name}: ${value}` : '')}
                      >
                        {stats.pieDevices.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}
