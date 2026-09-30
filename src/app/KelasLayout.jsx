import { Outlet } from 'react-router-dom'
import ProtectedRoute from './ProtectedRoute'
import RequireKelas from './RequireKelas'
import BottomNav from '@/components/layout/BottomNav'
import ThemeToggle from '@/components/ui/ThemeToggle'
import NotifikasiBell from '@/features/notifikasi/components/NotifikasiBell'

// Kerangka semua halaman kelas: butuh login + sudah punya kelas, plus menu bawah di mobile.
// Dipasang sebagai layout route, jadi menu tidak dibuat ulang tiap pindah halaman dan
// info kelas cukup diambil sekali.
//
// Di mobile, konten diberi ruang bawah setinggi menu (biar tidak tertutup), dan tinggi
// minimum halaman dikurangi jumlah yang sama supaya halaman pendek tidak jadi bisa di-scroll.
export default function KelasLayout() {
  return (
    <ProtectedRoute>
      <RequireKelas>
        <div className="pb-[calc(4.5rem_+_env(safe-area-inset-bottom))] max-md:[&>div]:min-h-[calc(100dvh_-_4.5rem_-_env(safe-area-inset-bottom))] md:pb-0">
          <Outlet />
        </div>
        <ThemeToggle className="fixed right-4 top-4 z-30" />
        <NotifikasiBell />
        <BottomNav />
      </RequireKelas>
    </ProtectedRoute>
  )
}
