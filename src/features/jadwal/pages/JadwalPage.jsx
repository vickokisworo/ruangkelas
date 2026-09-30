import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { jadwalService } from '@/features/jadwal/services/jadwalService'
import { mapelService } from '@/features/mapel/services/mapelService'
import { dashboardService } from '@/features/dashboard/services/dashboardService'
import { ROUTES } from '@/config/routes'
import { HARI_SEKOLAH, PENGURUS_ROLES, ROLE } from '@/config/constants'
import { Button, LoadingScreen } from '@/components/ui'

export default function JadwalPage() {
  const navigate = useNavigate()
  const { kelasId } = useParams()
  const { user } = useAuth()

  const [role, setRole] = useState(null)
  const [hariAktif, setHariAktif] = useState(HARI_SEKOLAH[0])
  const [daftarJadwal, setDaftarJadwal] = useState([])
  const [daftarMapel, setDaftarMapel] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [menambah, setMenambah] = useState(false)
  const [formTambah, setFormTambah] = useState({ jamKe: '', mapelId: '' })

  const [editId, setEditId] = useState(null)
  const [formEdit, setFormEdit] = useState({ jamKe: '', mapelId: '' })
  const [processingId, setProcessingId] = useState(null)

  const isPengurus = PENGURUS_ROLES.includes(role)

  const muatJadwal = async () => {
    const { data } = await jadwalService.listJadwal(kelasId)
    setDaftarJadwal(data ?? [])
  }

  useEffect(() => {
    const muatSemua = async () => {
      const { data: kelasInfo } = await dashboardService.getKelasUser(user.id)
      setRole(kelasInfo?.role ?? null)

      const { data: mapelData } = await mapelService.listMapel(kelasId)
      setDaftarMapel(mapelData ?? [])

      await muatJadwal()
      setLoading(false)
    }
    muatSemua()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kelasId, user])

  const jadwalHariIni = useMemo(
    () => daftarJadwal.filter((j) => j.hari === hariAktif),
    [daftarJadwal, hariAktif]
  )

  const handleTambah = async (e) => {
    e.preventDefault()
    if (!formTambah.jamKe || !formTambah.mapelId) return
    setError('')

    const { error: tambahError } = await jadwalService.tambahSlot({
      kelasId,
      hari: hariAktif,
      jamKe: Number(formTambah.jamKe),
      mapelId: formTambah.mapelId,
    })

    if (tambahError) {
      setError(tambahError.message)
      return
    }
    setFormTambah({ jamKe: '', mapelId: '' })
    setMenambah(false)
    muatJadwal()
  }

  const mulaiEdit = (slot) => {
    setEditId(slot.id)
    setFormEdit({ jamKe: String(slot.jam_ke), mapelId: slot.mapel?.id ?? '' })
  }

  const handleSimpanEdit = async (e) => {
    e.preventDefault()
    setError('')
    setProcessingId(editId)

    const { error: editError } = await jadwalService.editSlot({
      id: editId,
      hari: hariAktif,
      jamKe: Number(formEdit.jamKe),
      mapelId: formEdit.mapelId,
    })

    setProcessingId(null)
    if (editError) {
      setError(editError.message)
      return
    }
    setEditId(null)
    muatJadwal()
  }

  const handleHapus = async (id) => {
    setError('')
    setProcessingId(id)
    const { error: hapusError } = await jadwalService.hapusSlot(id)
    setProcessingId(null)
    if (hapusError) {
      setError('Gagal menghapus slot jadwal.')
      return
    }
    muatJadwal()
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
          <h1 className="text-xl font-semibold text-ink">Jadwal Pelajaran</h1>
        </header>

        {isPengurus && daftarMapel.length === 0 && (
          <p className="mb-4 rounded-md border border-line bg-white/40 p-3 text-sm text-pencil">
            {role === ROLE.KETUA ? (
              <>
                Belum ada mata pelajaran. Tambahkan dulu di halaman{' '}
                <span className="font-medium text-ink">Kelola mata pelajaran</span> sebelum isi
                jadwal.
              </>
            ) : (
              'Belum ada mata pelajaran. Minta ketua kelas menambahkannya dulu sebelum jadwal diisi.'
            )}
          </p>
        )}

        <div className="mb-6 grid grid-cols-4 gap-1 rounded-md border border-line p-1 sm:grid-cols-7">
          {HARI_SEKOLAH.map((hari) => (
            <button
              key={hari}
              className={`rounded px-2 py-2 text-sm font-medium transition-colors ${
                hariAktif === hari ? 'bg-chalk text-paper' : 'text-pencil'
              }`}
              onClick={() => {
                setHariAktif(hari)
                setMenambah(false)
                setEditId(null)
              }}
            >
              {hari}
            </button>
          ))}
        </div>

        {error && <p className="mb-4 text-sm text-marker">{error}</p>}

        <div className="space-y-2">
          {jadwalHariIni.length === 0 && (
            <p className="text-sm text-pencil">Belum ada jadwal untuk hari {hariAktif}.</p>
          )}

          {jadwalHariIni.map((slot) =>
            editId === slot.id ? (
              <form
                key={slot.id}
                onSubmit={handleSimpanEdit}
                className="flex flex-wrap items-center gap-2 rounded-md border border-chalk p-3"
              >
                <input
                  type="number"
                  min="1"
                  className="w-20 rounded-md border border-line px-2 py-2 outline-none focus:border-chalk"
                  value={formEdit.jamKe}
                  onChange={(e) => setFormEdit({ ...formEdit, jamKe: e.target.value })}
                  required
                />
                <select
                  className="flex-1 rounded-md border border-line px-2 py-2 outline-none focus:border-chalk"
                  value={formEdit.mapelId}
                  onChange={(e) => setFormEdit({ ...formEdit, mapelId: e.target.value })}
                  required
                >
                  {daftarMapel.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nama_mapel}
                    </option>
                  ))}
                </select>
                <Button
                  type="submit"
                  className="w-auto px-3 py-2 text-sm"
                  disabled={processingId === slot.id}
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
                key={slot.id}
                className="flex items-center justify-between rounded-md border border-line p-4"
              >
                <div>
                  <p className="text-sm text-pencil">Jam ke-{slot.jam_ke}</p>
                  <p className="font-medium text-ink">
                    {slot.mapel?.nama_mapel ?? '(mapel sudah dihapus)'}
                  </p>
                </div>
                {isPengurus && (
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      className="w-auto px-3 py-1.5 text-sm"
                      onClick={() => mulaiEdit(slot)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="secondary"
                      className="w-auto px-3 py-1.5 text-sm text-marker"
                      disabled={processingId === slot.id}
                      onClick={() => handleHapus(slot.id)}
                    >
                      Hapus
                    </Button>
                  </div>
                )}
              </div>
            )
          )}
        </div>

        {isPengurus && daftarMapel.length > 0 && (
          <div className="mt-6">
            {menambah ? (
              <form onSubmit={handleTambah} className="flex flex-wrap items-center gap-2">
                <input
                  type="number"
                  min="1"
                  placeholder="Jam ke"
                  className="w-24 rounded-md border border-line px-3 py-2.5 outline-none focus:border-chalk"
                  value={formTambah.jamKe}
                  onChange={(e) => setFormTambah({ ...formTambah, jamKe: e.target.value })}
                  autoFocus
                  required
                />
                <select
                  className="flex-1 rounded-md border border-line px-3 py-2.5 outline-none focus:border-chalk"
                  value={formTambah.mapelId}
                  onChange={(e) => setFormTambah({ ...formTambah, mapelId: e.target.value })}
                  required
                >
                  <option value="" disabled>
                    Pilih mapel
                  </option>
                  {daftarMapel.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nama_mapel}
                    </option>
                  ))}
                </select>
                <Button type="submit" className="w-auto px-4 py-2.5">
                  Tambah
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="w-auto px-4 py-2.5"
                  onClick={() => setMenambah(false)}
                >
                  Batal
                </Button>
              </form>
            ) : (
              <Button variant="secondary" onClick={() => setMenambah(true)}>
                + Tambah slot jadwal
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
