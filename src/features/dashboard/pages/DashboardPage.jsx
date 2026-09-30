import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { authService } from '@/features/auth/services/authService'
import { dashboardService } from '@/features/dashboard/services/dashboardService'
import { ROUTES, kelolaAnggotaPath, mapelPath } from '@/config/routes'
import { ROLE, ROLE_LABEL, PENGURUS_ROLES } from '@/config/constants'
import { Button, LoadingScreen } from '@/components/ui'
import RingkasanKelas from '@/features/dashboard/components/RingkasanKelas'

export default function DashboardPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [kelasInfo, setKelasInfo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [ringkasan, setRingkasan] = useState(null)

  useEffect(() => {
    if (!user) return
    dashboardService.getKelasUser(user.id).then(({ data }) => {
      setKelasInfo(data)
      setLoading(false)
    })
  }, [user])

  const kelasId = kelasInfo?.kelas?.id
  useEffect(() => {
    if (!kelasId) return
    dashboardService.getRingkasan(kelasId, user.id).then(setRingkasan)
  }, [kelasId, user.id])

  const handleLogout = async () => {
    await authService.signOut()
    navigate(ROUTES.LOGIN)
  }

  if (loading) return <LoadingScreen />

  return (
    <div className="min-h-screen px-5 py-8">
      <div className="mx-auto max-w-2xl">
        <header className="mb-8 flex items-center justify-between border-b border-line pb-5">
          <div>
            <p className="text-sm text-pencil">
              RuangKelas · {kelasInfo?.role && ROLE_LABEL[kelasInfo.role]}
            </p>
            <h1 className="text-xl font-semibold text-ink">
              {kelasInfo?.kelas?.nama_kelas ?? 'Belum ada kelas'}
            </h1>
          </div>
          <button
            type="button"
            className="mr-8 text-xs text-pencil hover:text-ink"
            onClick={handleLogout}
          >
            Keluar
          </button>
        </header>

        {PENGURUS_ROLES.includes(kelasInfo?.role) && (
          <div className="mb-8 rounded-md border border-line bg-ink/5 p-4">
            <p className="text-sm text-pencil">Kode kelas kamu (bagikan ke teman sekelas):</p>
            <p className="mt-1 font-display text-2xl tracking-widest text-chalk">
              {kelasInfo.kelas.kode_unik}
            </p>
            {kelasInfo.role === ROLE.KETUA && (
              <>
                <p className="mt-2 text-sm text-pencil">
                  Batas anggota: {kelasInfo.kelas.max_anggota ?? 40} orang (ubah di kelola anggota)
                </p>
                <Button
                  variant="secondary"
                  className="mt-3 w-auto px-3 py-1.5 text-sm"
                  onClick={() => navigate(kelolaAnggotaPath(kelasInfo.kelas.id))}
                >
                  Kelola anggota
                </Button>
              </>
            )}
          </div>
        )}

        {kelasInfo?.role === ROLE.KETUA && (
          <div className="mb-8">
            <Button
              variant="secondary"
              className="w-auto px-3 py-1.5 text-sm"
              onClick={() => navigate(mapelPath(kelasInfo.kelas.id))}
            >
              Kelola mata pelajaran
            </Button>
          </div>
        )}

        {ringkasan && <RingkasanKelas kelasId={kelasId} ringkasan={ringkasan} />}
      </div>
    </div>
  )
}
