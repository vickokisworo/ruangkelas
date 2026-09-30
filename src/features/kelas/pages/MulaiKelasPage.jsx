import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { kelasService } from '@/features/kelas/services/kelasService'
import { dashboardService } from '@/features/dashboard/services/dashboardService'
import { ROUTES } from '@/config/routes'
import { KODE_KELAS_LENGTH } from '@/config/constants'
import AuthLayout from '@/components/layout/AuthLayout'
import { Field, Button } from '@/components/ui'

const MODE = { BUAT: 'buat', GABUNG: 'gabung' }

export default function MulaiKelasPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [mode, setMode] = useState(MODE.BUAT)
  const [namaKelas, setNamaKelas] = useState('')
  const [kodeInput, setKodeInput] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Kalau user sudah punya kelas, tidak perlu buat/gabung lagi
  useEffect(() => {
    if (!user) return
    dashboardService.getKelasUser(user.id).then(({ data }) => {
      if (data?.kelas) navigate(ROUTES.DASHBOARD, { replace: true })
    })
  }, [user, navigate])

  const handleBuatKelas = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error: kelasError } = await kelasService.buatKelas({ namaKelas, adminId: user.id })

    setLoading(false)
    if (kelasError) {
      setError(kelasError.message)
      return
    }
    navigate(ROUTES.DASHBOARD)
  }

  const handleGabungKelas = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error: joinError } = await kelasService.gabungKelas({
      kode: kodeInput,
      userId: user.id,
    })

    setLoading(false)
    if (joinError) {
      setError(joinError.message)
      return
    }
    navigate(ROUTES.DASHBOARD)
  }

  return (
    <AuthLayout
      eyebrow="Langkah terakhir"
      title={mode === MODE.BUAT ? 'Buat kelas baru' : 'Gabung kelas'}
      subtitle={
        mode === MODE.BUAT
          ? 'Kamu jadi admin kelas ini.'
          : 'Masukkan kode yang dibagikan admin kelas kamu. Jika kelas sudah penuh, kamu tidak bisa gabung.'
      }
    >
      <div className="mb-6 flex rounded-md border border-line p-1">
        <button
          className={`flex-1 rounded px-3 py-2 text-sm font-medium transition-colors ${
            mode === MODE.BUAT ? 'bg-chalk text-paper' : 'text-pencil'
          }`}
          onClick={() => setMode(MODE.BUAT)}
        >
          Buat kelas
        </button>
        <button
          className={`flex-1 rounded px-3 py-2 text-sm font-medium transition-colors ${
            mode === MODE.GABUNG ? 'bg-chalk text-paper' : 'text-pencil'
          }`}
          onClick={() => setMode(MODE.GABUNG)}
        >
          Gabung kelas
        </button>
      </div>

      {mode === MODE.BUAT ? (
        <form onSubmit={handleBuatKelas} className="space-y-4">
          <Field
            label="Nama kelas"
            type="text"
            placeholder="Contoh: XI IPA 1"
            value={namaKelas}
            onChange={(e) => setNamaKelas(e.target.value)}
            required
          />
          {error && <p className="text-sm text-marker">{error}</p>}
          <Button type="submit" disabled={loading}>
            {loading ? 'Membuat...' : 'Buat kelas'}
          </Button>
        </form>
      ) : (
        <form onSubmit={handleGabungKelas} className="space-y-4">
          <Field
            label="Kode kelas"
            type="text"
            placeholder="Contoh: 7F3K2M"
            value={kodeInput}
            onChange={(e) => setKodeInput(e.target.value)}
            maxLength={KODE_KELAS_LENGTH}
            required
          />
          {error && <p className="text-sm text-marker">{error}</p>}
          <Button type="submit" disabled={loading}>
            {loading ? 'Bergabung...' : 'Gabung kelas'}
          </Button>
        </form>
      )}
    </AuthLayout>
  )
}
