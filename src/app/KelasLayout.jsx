import { Outlet } from 'react-router-dom'
import ProtectedRoute from './ProtectedRoute'
import RequireKelas from './RequireKelas'
import BottomNav from '@/components/layout/BottomNav'
import NotifikasiBell from '@/features/notifikasi/components/NotifikasiBell'

export default function KelasLayout() {
  return (
    <ProtectedRoute>
      <RequireKelas>
        <div className="pb-[calc(4.5rem_+_env(safe-area-inset-bottom))] max-md:[&>div]:min-h-[calc(100dvh_-_4.5rem_-_env(safe-area-inset-bottom))] md:pb-0">
          <Outlet />
        </div>
        <NotifikasiBell />
        <BottomNav />
      </RequireKelas>
    </ProtectedRoute>
  )
}