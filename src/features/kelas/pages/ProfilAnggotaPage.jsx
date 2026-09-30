import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useKelas } from '@/context/KelasContext'
import { anggotaService } from '@/features/kelas/services/anggotaService'
import { ROUTES, kelolaAnggotaPath } from '@/config/routes'
import { ROLE, ROLE_LABEL, MAX_WAKIL_KETUA } from '@/config/constants'
import { LoadingScreen, ConfirmDialog } from '@/components/ui'

function formatTanggal(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export default function ProfilAnggotaPage() {
  const navigate = useNavigate()
  const { kelasId, userId } = useParams()
  const { user } = useAuth()
  const { role } = useKelas()
  const [anggota, setAnggota] = useState(null)
  const [jumlahWakil, setJumlahWakil] = useState(0)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')
  const [konfirmasi, setKonfirmasi] = useState(null)
  const isKetua = role === ROLE.KETUA

  const muat = async () => {
    const [{ data, error: muatError }, wakil] = await Promise.all([
      anggotaService.getAnggota(kelasId, userId),
      anggotaService.jumlahWakil(kelasId),
    ])
    if (muatError || !data) {
      setError('Profil anggota tidak ditemukan.')
      setAnggota(null)
    } else {
      setAnggota(data)
      setJumlahWakil(wakil.count ?? 0)
    }
    setLoading(false)
  }

  useEffect(() => {
    if (!isKetua) {
      navigate(ROUTES.DASHBOARD, { replace: true })
      return
    }
    muat()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kelasId, userId, isKetua])

  const handleAksi = async (aksi) => {
    if (!anggota) return
    setError('')
    setProcessing(true)
    const { error: aksiError } = await aksi(anggota.id)
    setProcessing(false)
    const jenis = konfirmasi
    setKonfirmasi(null)
    if (aksiError) {
      setError(aksiError.message)
      return
    }
    if (jenis === 'keluarkan') {
      navigate(kelolaAnggotaPath(kelasId))
      return
    }
    muat()
  }

  const handleSerahKetua = async () => {
    if (!anggota) return
    setError('')
    setProcessing(true)
    const { error: serahError } = await anggotaService.serahKetua(kelasId, anggota.id)
    setProcessing(false)
    if (serahError) {
      setError(serahError.message || 'Gagal menyerahkan ketua.')
      setKonfirmasi(null)
      return
    }
    window.location.assign(ROUTES.DASHBOARD)
  }

  if (!isKetua || loading) return <LoadingScreen />

  const nama = anggota?.user?.nama ?? 'Pengguna'
  const punyaAksi = anggota && anggota.role !== ROLE.KETUA && anggota.user_id !== user.id

  return (
    <div className="min-h-screen px-5 py-8">
      <div className="mx-auto max-w-2xl">
        <header className="mb-6 border-b border-line pb-5 pr-10">
          <button
            type="button"
            onClick={() => navigate(kelolaAnggotaPath(kelasId))}
            className="mb-1 text-sm text-pencil hover:text-ink"
          >
            ← Kembali ke anggota
          </button>
          <h1 className="text-xl font-semibold text-ink">Profil anggota</h1>
        </header>

        {error && <p className="mb-4 text-sm text-marker">{error}</p>}

        {!anggota ? (
          <p className="text-sm text-pencil">Anggota ini tidak ada di kelas.</p>
        ) : (
          <>
            <section className="rounded-md border border-line p-5">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-chalk text-base font-semibold text-paper">
                  {nama.slice(0, 1).toUpperCase()}
                </div>
                <div>
                  <p className="text-lg font-medium text-ink">{nama}</p>
                  <p className="mt-0.5 text-sm text-pencil">{ROLE_LABEL[anggota.role]}</p>
                  {anggota.joined_at && (
                    <p className="mt-1 text-sm text-pencil">
                      Bergabung {formatTanggal(anggota.joined_at)}
                    </p>
                  )}
                </div>
              </div>
            </section>

            {punyaAksi && (
              <section className="mt-6 space-y-3 border-t border-line pt-5">
                <button
                  type="button"
                  className="block text-sm text-pencil hover:text-ink disabled:opacity-50"
                  disabled={processing}
                  onClick={() => setKonfirmasi('ketua')}
                >
                  Jadikan ketua
                </button>
                {anggota.role === ROLE.ANGGOTA ? (
                  <button
                    type="button"
                    className="block text-sm text-pencil hover:text-ink disabled:opacity-50"
                    disabled={processing || jumlahWakil >= MAX_WAKIL_KETUA}
                    onClick={() => handleAksi(anggotaService.jadikanWakilKetua)}
                  >
                    Jadikan wakil ketua
                  </button>
                ) : (
                  <button
                    type="button"
                    className="block text-sm text-pencil hover:text-ink disabled:opacity-50"
                    disabled={processing}
                    onClick={() => handleAksi(anggotaService.turunkanKeAnggota)}
                  >
                    Turunkan ke anggota
                  </button>
                )}
                <button
                  type="button"
                  className="block text-sm text-marker hover:underline disabled:opacity-50"
                  disabled={processing}
                  onClick={() => setKonfirmasi('keluarkan')}
                >
                  Keluarkan
                </button>
              </section>
            )}
          </>
        )}
      </div>

      <ConfirmDialog
        terbuka={konfirmasi === 'ketua'}
        judul="Ganti ketua"
        isi={`Jadikan ${nama} ketua? Kamu akan menjadi anggota.`}
        yaLabel="Ya"
        bahaya
        disabled={processing}
        onYa={handleSerahKetua}
        onBatal={() => setKonfirmasi(null)}
      />
      <ConfirmDialog
        terbuka={konfirmasi === 'keluarkan'}
        judul="Keluarkan anggota"
        isi={`Keluarkan ${nama} dari kelas?`}
        yaLabel="Ya, keluarkan"
        bahaya
        disabled={processing}
        onYa={() => handleAksi(anggotaService.keluarkanAnggota)}
        onBatal={() => setKonfirmasi(null)}
      />
    </div>
  )
}
