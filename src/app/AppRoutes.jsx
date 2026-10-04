import { Navigate, Route, Routes } from 'react-router-dom'
import { ROUTES } from '@/config/routes'
import ProtectedRoute from './ProtectedRoute'
import KelasLayout from './KelasLayout'
import LoginPage from '@/features/auth/pages/LoginPage'
import RegisterPage from '@/features/auth/pages/RegisterPage'
import MulaiKelasPage from '@/features/kelas/pages/MulaiKelasPage'
import KelolaAnggotaPage from '@/features/kelas/pages/KelolaAnggotaPage'
import ProfilAnggotaPage from '@/features/kelas/pages/ProfilAnggotaPage'
import MapelPage from '@/features/mapel/pages/MapelPage'
import JadwalPage from '@/features/jadwal/pages/JadwalPage'
import TugasPage from '@/features/tugas/pages/TugasPage'
import PengumumanPage from '@/features/pengumuman/pages/PengumumanPage'
import DashboardPage from '@/features/dashboard/pages/DashboardPage'
import ProfilPage from '@/features/profil/pages/ProfilPage'
import PengaturanPage from '@/features/pengaturan/pages/PengaturanPage'

export default function AppRoutes() {
  return (
    <Routes>
      <Route path={ROUTES.HOME} element={<Navigate to={ROUTES.LOGIN} replace />} />
      <Route path={ROUTES.LOGIN} element={<LoginPage />} />
      <Route path={ROUTES.REGISTER} element={<RegisterPage />} />

      {/* Cukup login: user belum punya kelas harus bisa akses ini */}
      <Route
        path={ROUTES.MULAI_KELAS}
        element={
          <ProtectedRoute>
            <MulaiKelasPage />
          </ProtectedRoute>
        }
      />

      {/* Semua halaman kelas: login + sudah punya kelas + menu navigasi bawah (mobile) */}
      <Route element={<KelasLayout />}>
        <Route path={ROUTES.DASHBOARD} element={<DashboardPage />} />
        <Route path={ROUTES.PENGUMUMAN} element={<PengumumanPage />} />
        <Route path={ROUTES.JADWAL} element={<JadwalPage />} />
        <Route path={ROUTES.TUGAS} element={<TugasPage />} />
        <Route path={ROUTES.MAPEL} element={<MapelPage />} />
        <Route path={ROUTES.PROFIL_ANGGOTA} element={<ProfilAnggotaPage />} />
        <Route path={ROUTES.KELOLA_ANGGOTA} element={<KelolaAnggotaPage />} />
        <Route path={ROUTES.PROFIL} element={<ProfilPage />} />
        <Route path={ROUTES.PENGATURAN} element={<PengaturanPage />} />
      </Route>
    </Routes>
  )
}