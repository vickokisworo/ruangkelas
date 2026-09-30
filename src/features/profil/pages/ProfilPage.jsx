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
  const [namaTampil, setNamaTampil] = useState('')
  const [namaEdit, setNamaEdit] = useState('')
  const [mengedit, setMengedit] = useState(false)
  const [konfirmasiKeluar, setKonfirmasiKeluar] = useState(false)
  const [loading, setLoading] = useState(true)
  const [menyimpan, setMenyimpan] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user) return
    profilService.getProfil(user.id).then(({ data, error: muatError }) => {
      if (muatError) setError('Gagal memuat profil.')
      const nama = data?.nama ?? ''
      setNamaTampil(nama)
      setNamaEdit(nama)
      setLoading(false)
    })
  }, [user])

  const inisial = (namaTampil || 'U').slice(0, 1).toUpperCase()

  const batalEdit = () => {
    setNamaEdit(namaTampil)
    setMengedit(false)
    setError('')
  }

  const handleSimpan = async (e) => {
    e.preventDefault()
    setError('')
    setMenyimpan(true)
    const { error: simpanError } = await profilService.updateNama(user.id, namaEdit)
    setMenyimpan(false)
    if (simpanError) {
      setError(simpanError.message)
      return
    }
    setNamaTampil(namaEdit.trim())
    setMengedit(false)
  }

  const handleLogout = async () => {
    await authService.signOut()
    navigate(ROUTES.LOGIN)
  }

  if (loading) return <LoadingScreen />

  return (
    <div className="min-h-screen px-5 py-8">
      <div className="mx-auto max-w-2xl">
        <header className="mb-6 border-b border-line pb-5 pr-10">
          <button
            type="button"
            onClick={() => navigate(ROUTES.DASHBOARD)}
            className="mb-1 text-sm text-pencil hover:text-ink"
          >
            ← Kembali
          </button>
          <h1 className="text-xl font-semibold text-ink">Profil</h1>
        </header>

        {error && <p className="mb-4 text-sm text-marker">{error}</p>}

        <section className="rounded-md border border-line p-5">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-chalk text-base font-semibold text-paper">
              {inisial}
            </div>
            <div className="min-w-0 flex-1">
              {!mengedit ? (
                <>
                  <p className="text-lg font-medium text-ink">{namaTampil || 'Tanpa nama'}</p>
                  {role && <p className="mt-0.5 text-sm text-pencil">{ROLE_LABEL[role]}</p>}
                  <button
                    type="button"
                    className="mt-3 text-sm text-chalk hover:underline"
                    onClick={() => {
                      setNamaEdit(namaTampil)
                      setMengedit(true)
                      setKonfirmasiKeluar(false)
                    }}
                  >
                    Ubah nama
                  </button>
                </>
              ) : (
                <form onSubmit={handleSimpan} className="space-y-3">
                  <Field
                    label="Nama"
                    name="nama"
                    value={namaEdit}
                    maxLength={80}
                    autoFocus
                    onChange={(e) => setNamaEdit(e.target.value)}
                    required
                  />
                  <div className="flex gap-2">
                    <Button type="submit" className="w-auto px-4 py-2 text-sm" disabled={menyimpan || !namaEdit.trim()}>
                      {menyimpan ? 'Menyimpan...' : 'Simpan'}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      className="w-auto px-4 py-2 text-sm"
                      disabled={menyimpan}
                      onClick={batalEdit}
                    >
                      Batal
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </section>

        <section className="mt-8 border-t border-line pt-5">
          {!konfirmasiKeluar ? (
            <button
              type="button"
              className="text-sm text-pencil hover:text-ink"
              onClick={() => setKonfirmasiKeluar(true)}
            >
              Keluar
            </button>
          ) : (
            <div className="flex items-center gap-3 text-sm">
              <span className="text-ink">Keluar dari akun ini?</span>
              <button type="button" className="font-medium text-marker" onClick={handleLogout}>
                Ya, keluar
              </button>
              <button
                type="button"
                className="text-pencil hover:text-ink"
                onClick={() => setKonfirmasiKeluar(false)}
              >
                Batal
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
