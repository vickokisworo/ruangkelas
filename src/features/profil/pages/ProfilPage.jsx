import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useKelas } from '@/context/KelasContext'
import { authService } from '@/features/auth/services/authService'
import { profilService } from '@/features/profil/services/profilService'
import { ROUTES } from '@/config/routes'
import { ROLE_LABEL } from '@/config/constants'
import { Field, Button, LoadingScreen } from '@/components/ui'

export default function ProfilPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { role } = useKelas()
  const [profil, setProfil] = useState(null)
  const [nama, setNama] = useState('')
  const [loading, setLoading] = useState(true)
  const [menyimpan, setMenyimpan] = useState(false)
  const [error, setError] = useState('')
  const [tersimpan, setTersimpan] = useState(false)

  useEffect(() => {
    if (!user) return
    profilService.getProfil(user.id).then(({ data, error: muatError }) => {
      if (muatError) setError('Gagal memuat profil.')
      setProfil(data)
      setNama(data?.nama ?? '')
      setLoading(false)
    })
  }, [user])

  const handleSimpan = async (e) => {
    e.preventDefault()
    setError('')
    setTersimpan(false)
    setMenyimpan(true)
    const { error: simpanError } = await profilService.updateNama(user.id, nama)
    setMenyimpan(false)
    if (simpanError) {
      setError(simpanError.message)
      return
    }
    setProfil((prev) => ({ ...prev, nama: nama.trim() }))
    setTersimpan(true)
  }

  const handleLogout = async () => {
    await authService.signOut()
    navigate(ROUTES.LOGIN)
  }

  if (loading) return <LoadingScreen />

  return (
    <div className="min-h-screen px-5 py-8">
      <div className="mx-auto max-w-2xl">
        <header className="mb-6 border-b border-line pb-5">
          <button
            type="button"
            onClick={() => navigate(ROUTES.DASHBOARD)}
            className="mb-1 text-sm text-pencil hover:text-ink"
          >
            ← Kembali ke dashboard
          </button>
          <h1 className="text-xl font-semibold text-ink">Profil</h1>
          {role && <p className="mt-1 text-sm text-pencil">{ROLE_LABEL[role]}</p>}
        </header>

        {error && <p className="mb-4 text-sm text-marker">{error}</p>}
        {tersimpan && <p className="mb-4 text-sm text-chalk">Nama disimpan.</p>}

        <form onSubmit={handleSimpan} className="mb-8 space-y-4">
          <Field
            label="Nama"
            name="nama"
            value={nama}
            maxLength={80}
            onChange={(e) => setNama(e.target.value)}
            required
          />
          <Field label="Email" name="email" value={profil?.email ?? user?.email ?? ''} disabled />
          <Button type="submit" disabled={menyimpan || !nama.trim()}>
            {menyimpan ? 'Menyimpan...' : 'Simpan'}
          </Button>
        </form>

        <button
          type="button"
          className="text-sm text-pencil hover:text-ink"
          onClick={handleLogout}
        >
          Keluar
        </button>
      </div>
    </div>
  )
}
