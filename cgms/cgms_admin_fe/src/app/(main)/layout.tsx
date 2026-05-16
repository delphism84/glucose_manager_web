import AdminAuthGuard from '@/components/AdminAuthGuard'
import CgmsShell from '@/components/CgmsShell'

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminAuthGuard>
      <CgmsShell>{children}</CgmsShell>
    </AdminAuthGuard>
  )
}
