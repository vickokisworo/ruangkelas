import { Outlet, useLocation } from 'react-router-dom'
import ProtectedRoute from './ProtectedRoute'
import RequireKelas from './RequireKelas'
import BottomNav from '@/components/layout/BottomNav'
import NotifikasiBell from '@/features/notifikasi/components/NotifikasiBell'
import AktifkanNotifikasi from '@/components/pwa/AktifkanNotifikasi'

export default function KelasLayout() {
  const { pathname } = useLocation()
  const detailPengumuman = /\/kelas\/[^/]+\/pengumuman\/[^/]+$/.test(pathname)

  return (
    <ProtectedRoute>
      <RequireKelas>
        <div
          className={
            detailPengumuman
              ? 'pb-[calc(5.5rem_+_env(safe-area-inset-bottom))]'
              : 'pb-[calc(4.5rem_+_env(safe-area-inset-bottom))] max-md:[&>div]:min-h-[calc(100dvh_-_4.5rem_-_env(safe-area-inset-bottom))] md:pb-0'
          }
        >
          <Outlet />
        </div>
        <AktifkanNotifikasi />
        {!detailPengumuman && <NotifikasiBell />}
        {!detailPengumuman && <BottomNav />}
      </RequireKelas>
    </ProtectedRoute>
  )
}
