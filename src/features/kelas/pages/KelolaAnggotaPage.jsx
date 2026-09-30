import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useKelas } from '@/context/KelasContext'
import { anggotaService } from '@/features/kelas/services/anggotaService'
import { ROUTES } from '@/config/routes'
import { ROLE, ROLE_LABEL, MAX_WAKIL_KETUA, MIN_MAX_ANGGOTA, ABSOLUT_MAX_ANGGOTA } from '@/config/constants'
import { Button, Field, LoadingScreen } from '@/components/ui'

export default function KelolaAnggotaPage() {
  const navigate = useNavigate()
  const { kelasId } = useParams()
  const { user } = useAuth()
  const { role } = useKelas()
  const [anggota, setAnggota] = useState([])
  const [maxAnggota, setMaxAnggota] = useState('')
  const [maxInput, setMaxInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState(null)
  const [menyimpanBatas, setMenyimpanBatas] = useState(false)
  const [error, setError] = useState('')
  const isKetua = role === ROLE.KETUA

  const muatAnggota = async () => {
    const [{ data, error: fetchError }, { data: kelasData }] = await Promise.all([
      anggotaService.listAnggota(kelasId),
      anggotaService.getPengaturanKelas(kelasId),
    ])
    if (fetchError) {
      setError('Gagal memuat daftar anggota.')
    } else {
      // Urutan tampilan: ketua, wakil ketua, lalu anggota
      const urutan = { [ROLE.KETUA]: 0, [ROLE.WAKIL_KETUA]: 1, [ROLE.ANGGOTA]: 2 }
      setAnggota((data ?? []).sort((a, b) => urutan[a.role] - urutan[b.role]))
    }
    if (kelasData?.max_anggota) {
      setMaxAnggota(kelasData.max_anggota)
      setMaxInput(String(kelasData.max_anggota))
    }
    setLoading(false)
  }

  useEffect(() => {
    muatAnggota()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kelasId])

  const jumlahWakilKetua = anggota.filter((a) => a.role === ROLE.WAKIL_KETUA).length
  const jumlahAnggota = anggota.length
  const kelasPenuh = maxAnggota && jumlahAnggota >= maxAnggota

  const handleSimpanBatas = async (e) => {
    e.preventDefault()
    setError('')
    const nilai = Number(maxInput)
    if (!Number.isInteger(nilai) || nilai < MIN_MAX_ANGGOTA || nilai > ABSOLUT_MAX_ANGGOTA) {
      setError(`Batas anggota harus antara ${MIN_MAX_ANGGOTA} dan ${ABSOLUT_MAX_ANGGOTA}.`)
      return
    }
    if (nilai < jumlahAnggota) {
      setError('Batas anggota tidak boleh lebih kecil dari jumlah anggota sekarang.')
      return
    }
    setMenyimpanBatas(true)
    const { error: simpanError } = await anggotaService.setMaxAnggota(kelasId, nilai)
    setMenyimpanBatas(false)
    if (simpanError) {
      setError(simpanError.message)
      return
    }
    setMaxAnggota(nilai)
  }

  const handleAksi = async (aksi, memberId) => {
    setError('')
    setProcessingId(memberId)

    const { error: aksiError } = await aksi(memberId)

    setProcessingId(null)
    if (aksiError) {
      setError(aksiError.message)
      return
    }
    muatAnggota()
  }

  if (loading) return <LoadingScreen />

  return (
    <div className="min-h-screen px-5 py-8">
      <div className="mx-auto max-w-2xl">
        <header className="mb-6 flex items-center justify-between border-b border-line pb-5">
          <div>
            <button
              onClick={() => navigate(ROUTES.DASHBOARD)}
              className="mb-1 text-sm text-pencil hover:text-ink"
            >
              ← Kembali ke dashboard
            </button>
            <h1 className="text-xl font-semibold text-ink">Kelola Anggota</h1>
          </div>
        </header>

        <p className="mb-4 text-sm text-pencil">
          Anggota: {jumlahAnggota}/{maxAnggota || '—'}
          {kelasPenuh && <span className="ml-1 font-medium text-marker">· Kelas penuh</span>}
          {' · '}
          Wakil ketua: {jumlahWakilKetua}/{MAX_WAKIL_KETUA}
        </p>

        {isKetua && (
          <form onSubmit={handleSimpanBatas} className="mb-6 flex flex-wrap items-end gap-3">
            <div className="w-40">
              <Field
                label="Batas anggota"
                type="number"
                min={Math.max(MIN_MAX_ANGGOTA, jumlahAnggota)}
                max={ABSOLUT_MAX_ANGGOTA}
                value={maxInput}
                onChange={(e) => setMaxInput(e.target.value)}
                required
              />
            </div>
            <Button
              type="submit"
              variant="secondary"
              className="w-auto px-3 py-2.5 text-sm"
              disabled={menyimpanBatas}
            >
              {menyimpanBatas ? 'Menyimpan...' : 'Simpan batas'}
            </Button>
          </form>
        )}

        {error && <p className="mb-4 text-sm text-marker">{error}</p>}

        <div className="space-y-2">
          {anggota.map((a) => (
            <div
              key={a.id}
              className="flex items-center justify-between rounded-md border border-line p-4"
            >
              <div>
                <p className="font-medium text-ink">
                  {a.user?.nama ?? 'Pengguna'}
                  {a.user_id === user.id && <span className="text-pencil"> (kamu)</span>}
                </p>
                <p className="text-sm text-pencil">{ROLE_LABEL[a.role]}</p>
              </div>

              {a.role !== ROLE.KETUA && (
                <div className="flex items-center gap-3">
                  {a.role === ROLE.ANGGOTA ? (
                    <button
                      type="button"
                      className="text-xs text-pencil hover:text-ink disabled:opacity-50"
                      disabled={processingId === a.id || jumlahWakilKetua >= MAX_WAKIL_KETUA}
                      onClick={() => handleAksi(anggotaService.jadikanWakilKetua, a.id)}
                    >
                      Wakil
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="text-xs text-pencil hover:text-ink disabled:opacity-50"
                      disabled={processingId === a.id}
                      onClick={() => handleAksi(anggotaService.turunkanKeAnggota, a.id)}
                    >
                      Turunkan
                    </button>
                  )}
                  <button
                    type="button"
                    className="text-xs text-marker hover:underline disabled:opacity-50"
                    disabled={processingId === a.id}
                    onClick={() => handleAksi(anggotaService.keluarkanAnggota, a.id)}
                  >
                    Keluarkan
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
