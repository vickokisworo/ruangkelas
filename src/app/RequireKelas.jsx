import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { KelasProvider } from '@/context/KelasContext'
import { dashboardService } from '@/features/dashboard/services/dashboardService'
import { ROUTES } from '@/config/routes'
import { LoadingScreen } from '@/components/ui'

// Dipasang di semua route yang butuh user sudah tergabung di sebuah kelas
// (dashboard, mapel, jadwal, tugas, pengumuman, kelola anggota). Kalau user
// login tapi belum sempat buat/gabung kelas (misal nutup browser di tengah
// alur daftar), otomatis diarahkan balik ke halaman mulai kelas — bukan
// dibiarkan "nyangkut" di dashboard kosong.
export default function RequireKelas({ children }) {
  const { user } = useAuth()
  const [status, setStatus] = useState('memeriksa') // 'memeriksa' | 'punya-kelas' | 'belum-punya-kelas'
  const [info, setInfo] = useState(null)

  useEffect(() => {
    if (!user) return
    dashboardService.getKelasUser(user.id).then(({ data }) => {
      setInfo(data?.kelas ? { kelas: data.kelas, kelasId: data.kelas.id, role: data.role } : null)
      setStatus(data?.kelas ? 'punya-kelas' : 'belum-punya-kelas')
    })
  }, [user])

  if (status === 'memeriksa') return <LoadingScreen />
  if (status === 'belum-punya-kelas') return <Navigate to={ROUTES.MULAI_KELAS} replace />

  return <KelasProvider value={info}>{children}</KelasProvider>
}
