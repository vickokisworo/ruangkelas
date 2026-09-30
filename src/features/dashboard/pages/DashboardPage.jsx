import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { dashboardService } from '@/features/dashboard/services/dashboardService'
import { ROLE_LABEL, PENGURUS_ROLES } from '@/config/constants'
import { LoadingScreen } from '@/components/ui'
import RingkasanKelas from '@/features/dashboard/components/RingkasanKelas'

export default function DashboardPage() {
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

  if (loading) return <LoadingScreen />

  return (
    <div className="min-h-screen px-5 py-8">
      <div className="mx-auto max-w-2xl">
        <header className="mb-8 border-b border-line pb-5 pr-10">
          <p className="text-sm text-pencil">
            RuangKelas · {kelasInfo?.role && ROLE_LABEL[kelasInfo.role]}
          </p>
          <h1 className="text-xl font-semibold text-ink">
            {kelasInfo?.kelas?.nama_kelas ?? 'Belum ada kelas'}
          </h1>
        </header>

        {PENGURUS_ROLES.includes(kelasInfo?.role) && (
          <div className="mb-8 rounded-md border border-line bg-ink/5 p-4">
            <p className="text-sm text-pencil">Kode kelas kamu (bagikan ke teman sekelas):</p>
            <p className="mt-1 font-display text-2xl tracking-widest text-chalk">
              {kelasInfo.kelas.kode_unik}
            </p>
          </div>
        )}

        {ringkasan && <RingkasanKelas kelasId={kelasId} ringkasan={ringkasan} />}
      </div>
    </div>
  )
}
