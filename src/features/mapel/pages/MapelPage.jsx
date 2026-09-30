import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { mapelService } from '@/features/mapel/services/mapelService'
import { dashboardService } from '@/features/dashboard/services/dashboardService'
import { ROUTES } from '@/config/routes'
import { ROLE } from '@/config/constants'
import { Field, Button, LoadingScreen } from '@/components/ui'

export default function MapelPage() {
  const navigate = useNavigate()
  const { kelasId } = useParams()
  const { user } = useAuth()

  const [role, setRole] = useState(null)
  const [daftarMapel, setDaftarMapel] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [namaBaru, setNamaBaru] = useState('')
  const [menambah, setMenambah] = useState(false)

  const [editId, setEditId] = useState(null)
  const [namaEdit, setNamaEdit] = useState('')
  const [processingId, setProcessingId] = useState(null)

  const isKetua = role === ROLE.KETUA

  const muatMapel = async () => {
    const { data } = await mapelService.listMapel(kelasId)
    setDaftarMapel(data ?? [])
  }

  useEffect(() => {
    const muatSemua = async () => {
      const { data: kelasInfo } = await dashboardService.getKelasUser(user.id)
      setRole(kelasInfo?.role ?? null)
      await muatMapel()
      setLoading(false)
    }
    muatSemua()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kelasId, user])

  const handleTambah = async (e) => {
    e.preventDefault()
    if (!namaBaru.trim()) return
    setError('')

    const { error: tambahError } = await mapelService.tambahMapel({
      kelasId,
      namaMapel: namaBaru,
    })

    if (tambahError) {
      setError(tambahError.message)
      return
    }
    setNamaBaru('')
    setMenambah(false)
    muatMapel()
  }

  const mulaiEdit = (mapel) => {
    setEditId(mapel.id)
    setNamaEdit(mapel.nama_mapel)
  }

  const handleSimpanEdit = async (e) => {
    e.preventDefault()
    setError('')
    setProcessingId(editId)

    const { error: editError } = await mapelService.editMapel({ id: editId, namaMapel: namaEdit })

    setProcessingId(null)
    if (editError) {
      setError(editError.message)
      return
    }
    setEditId(null)
    muatMapel()
  }

  const handleHapus = async (id) => {
    setError('')
    setProcessingId(id)

    const { error: hapusError } = await mapelService.hapusMapel(id)

    setProcessingId(null)
    if (hapusError) {
      setError('Gagal menghapus mapel.')
      return
    }
    muatMapel()
  }

  if (loading) return <LoadingScreen />

  return (
    <div className="min-h-screen px-5 py-8">
      <div className="mx-auto max-w-2xl">
        <header className="mb-6 border-b border-line pb-5">
          <button
            onClick={() => navigate(ROUTES.DASHBOARD)}
            className="mb-1 text-sm text-pencil hover:text-ink"
          >
            ← Kembali ke dashboard
          </button>
          <h1 className="text-xl font-semibold text-ink">Mata Pelajaran</h1>
        </header>

        {!isKetua && (
          <p className="mb-4 text-sm text-pencil">
            Daftar mata pelajaran hanya bisa diubah oleh ketua kelas.
          </p>
        )}

        {error && <p className="mb-4 text-sm text-marker">{error}</p>}

        <div className="space-y-2">
          {daftarMapel.length === 0 && (
            <p className="text-sm text-pencil">Belum ada mata pelajaran ditambahkan.</p>
          )}

          {daftarMapel.map((m) =>
            editId === m.id ? (
              <form
                key={m.id}
                onSubmit={handleSimpanEdit}
                className="flex items-center gap-2 rounded-md border border-chalk p-3"
              >
                <input
                  className="flex-1 rounded-md border border-line px-3 py-2 outline-none focus:border-chalk"
                  value={namaEdit}
                  onChange={(e) => setNamaEdit(e.target.value)}
                  autoFocus
                  required
                />
                <Button
                  type="submit"
                  className="w-auto px-3 py-2 text-sm"
                  disabled={processingId === m.id}
                >
                  Simpan
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="w-auto px-3 py-2 text-sm"
                  onClick={() => setEditId(null)}
                >
                  Batal
                </Button>
              </form>
            ) : (
              <div
                key={m.id}
                className="flex items-center justify-between rounded-md border border-line p-4"
              >
                <p className="font-medium text-ink">{m.nama_mapel}</p>
                {isKetua && (
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      className="w-auto px-3 py-1.5 text-sm"
                      onClick={() => mulaiEdit(m)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="secondary"
                      className="w-auto px-3 py-1.5 text-sm text-marker"
                      disabled={processingId === m.id}
                      onClick={() => handleHapus(m.id)}
                    >
                      Hapus
                    </Button>
                  </div>
                )}
              </div>
            )
          )}
        </div>

        {isKetua && (
          <div className="mt-6">
            {menambah ? (
              <form onSubmit={handleTambah} className="space-y-3">
                <Field
                  label="Nama mata pelajaran"
                  type="text"
                  placeholder="Contoh: Matematika"
                  value={namaBaru}
                  onChange={(e) => setNamaBaru(e.target.value)}
                  autoFocus
                  required
                />
                <div className="flex gap-2">
                  <Button type="submit">Tambah</Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setMenambah(false)
                      setNamaBaru('')
                    }}
                  >
                    Batal
                  </Button>
                </div>
              </form>
            ) : (
              <Button variant="secondary" onClick={() => setMenambah(true)}>
                + Tambah mata pelajaran
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
