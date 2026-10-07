import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { tugasService } from '@/features/tugas/services/tugasService'
import { mapelService } from '@/features/mapel/services/mapelService'
import { dashboardService } from '@/features/dashboard/services/dashboardService'
import { ROUTES } from '@/config/routes'
import { PENGURUS_ROLES, MAX_LAMPIRAN_PER_ITEM } from '@/config/constants'
import { selisihHari } from '@/utils/tanggal'
import { Field, Button, LoadingScreen } from '@/components/ui'
import LampiranField from '@/features/lampiran/components/LampiranField'
import LampiranList from '@/features/lampiran/components/LampiranList'
import { lampiranService } from '@/features/lampiran/services/lampiranService'
import { validasiDaftarBerkas } from '@/utils/lampiran'

function isTerlambat(deadline, selesai) {
  if (!deadline || selesai) return false
  return selisihHari(deadline) < 0
}

function formatTanggal(deadline) {
  if (!deadline) return 'Tanpa deadline'
  return new Date(deadline).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatWaktu(iso) {
  const waktu = new Date(iso)
  const detik = Math.max(0, Math.floor((Date.now() - waktu.getTime()) / 1000))
  if (detik < 5) return 'baru saja'
  if (detik < 60) return `${detik} detik lalu`
  if (detik < 3600) return `${Math.floor(detik / 60)} menit lalu`
  if (detik < 86400) return `${Math.floor(detik / 3600)} jam lalu`
  return waktu.toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function TugasPage() {
  const navigate = useNavigate()
  const { kelasId } = useParams()
  const { user } = useAuth()

  const [role, setRole] = useState(null)
  const [daftarTugas, setDaftarTugas] = useState([])
  const [daftarMapel, setDaftarMapel] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [menambah, setMenambah] = useState(false)
  const [form, setForm] = useState({ judul: '', deadline: '', mapelId: '' })
  const [berkasBaru, setBerkasBaru] = useState([])
  const [berkasEdit, setBerkasEdit] = useState([])

  const [editId, setEditId] = useState(null)
  const [formEdit, setFormEdit] = useState({ judul: '', deadline: '', mapelId: '' })
  const [processingId, setProcessingId] = useState(null)

  const isPengurus = PENGURUS_ROLES.includes(role)

  const muatTugas = async () => {
    const { data } = await tugasService.listTugas(kelasId, user.id)
    setDaftarTugas(data ?? [])
  }

  useEffect(() => {
    const muatSemua = async () => {
      const { data: kelasInfo } = await dashboardService.getKelasUser(user.id)
      setRole(kelasInfo?.role ?? null)

      const { data: mapelData } = await mapelService.listMapel(kelasId)
      setDaftarMapel(mapelData ?? [])

      await muatTugas()
      setLoading(false)
    }
    muatSemua()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kelasId, user])

  const handleTambah = async (e) => {
    e.preventDefault()
    if (!form.judul.trim()) return
    setError('')

    const pesanBerkas = validasiDaftarBerkas(berkasBaru)
    if (pesanBerkas) {
      setError(pesanBerkas)
      return
    }

    const { data: tugasId, error: tambahError } = await tugasService.tambahTugas({
      kelasId,
      penulisId: user.id,
      judul: form.judul,
      deadline: form.deadline,
      mapelId: form.mapelId,
    })

    if (tambahError) {
      setError(tambahError.message)
      return
    }

    if (berkasBaru.length && tugasId) {
      const { error: unggahError } = await lampiranService.unggahBanyak({
        files: berkasBaru,
        kelasId,
        tugasId,
      })
      if (unggahError) setError(unggahError.message)
    }

    setForm({ judul: '', deadline: '', mapelId: '' })
    setBerkasBaru([])
    setMenambah(false)
    muatTugas()
  }

  const mulaiEdit = (tugas) => {
    setEditId(tugas.id)
    setFormEdit({
      judul: tugas.judul,
      deadline: tugas.deadline ?? '',
      mapelId: tugas.mapel?.id ?? '',
    })
    setBerkasEdit([])
  }

  const handleSimpanEdit = async (e) => {
    e.preventDefault()
    setError('')
    setProcessingId(editId)

    const { error: editError } = await tugasService.editTugas({
      id: editId,
      judul: formEdit.judul,
      deadline: formEdit.deadline,
      mapelId: formEdit.mapelId,
    })

    if (editError) {
      setProcessingId(null)
      setError(editError.message)
      return
    }

    if (berkasEdit.length) {
      const jumlahSekarang = daftarTugas.find((item) => item.id === editId)?.lampiran?.length ?? 0
      const pesanBerkas = validasiDaftarBerkas(berkasEdit, jumlahSekarang)
      if (pesanBerkas) {
        setProcessingId(null)
        setError(pesanBerkas)
        return
      }
      const { error: unggahError } = await lampiranService.unggahBanyak({
        files: berkasEdit,
        kelasId,
        tugasId: editId,
      })
      if (unggahError) {
        setProcessingId(null)
        setError(unggahError.message)
        muatTugas()
        return
      }
    }

    setProcessingId(null)
    setEditId(null)
    setBerkasEdit([])
    muatTugas()
  }

  const handleToggle = async (tugas) => {
    setProcessingId(tugas.id)
    const { error: toggleError } = await tugasService.toggleSelesai({
      tugasId: tugas.id,
      kelasId,
      userId: user.id,
      selesai: !tugas.selesai,
    })
    setProcessingId(null)
    if (toggleError) {
      setError(
        toggleError.message?.includes('tugas_progress')
          ? 'Jalankan supabase/migrasi_tugas_pribadi.sql di Supabase dulu.'
          : toggleError.message,
      )
      return
    }
    muatTugas()
  }

  const handleHapus = async (item) => {
    setError('')
    setProcessingId(item.id)
    if (item.lampiran?.length) await lampiranService.hapusSemua(item.lampiran)
    const { error: hapusError } = await tugasService.hapusTugas(item.id)
    setProcessingId(null)
    if (hapusError) {
      setError('Gagal menghapus tugas.')
      return
    }
    muatTugas()
  }

  const handleHapusLampiran = async (lampiran) => {
    setError('')
    const { error: hapusError } = await lampiranService.hapus(lampiran)
    if (hapusError) {
      setError('Gagal menghapus lampiran.')
      return
    }
    muatTugas()
  }

  if (loading) return <LoadingScreen />

  return (
    <div className="min-h-screen px-5 py-8">
      <div className="mx-auto max-w-2xl">
        <header className="mb-6 border-b border-line pb-5">
          <h1 className="text-xl font-semibold text-ink">Tugas & PR</h1>
        </header>

        {error && <p className="mb-4 text-sm text-marker">{error}</p>}

        <div className="space-y-2">
          {daftarTugas.length === 0 && (
            <p className="text-sm text-pencil">Belum ada tugas ditambahkan.</p>
          )}

          {daftarTugas.map((t) =>
            editId === t.id ? (
              <form
                key={t.id}
                onSubmit={handleSimpanEdit}
                className="space-y-2 rounded-md border border-chalk p-3"
              >
                <input
                  className="w-full rounded-md border border-line px-3 py-2 outline-none focus:border-chalk"
                  value={formEdit.judul}
                  onChange={(e) => setFormEdit({ ...formEdit, judul: e.target.value })}
                  autoFocus
                  required
                />
                <div className="flex flex-wrap gap-2">
                  <input
                    type="date"
                    className="rounded-md border border-line px-3 py-2 outline-none focus:border-chalk"
                    value={formEdit.deadline}
                    onChange={(e) => setFormEdit({ ...formEdit, deadline: e.target.value })}
                  />
                  <select
                    className="flex-1 rounded-md border border-line px-3 py-2 outline-none focus:border-chalk"
                    value={formEdit.mapelId}
                    onChange={(e) => setFormEdit({ ...formEdit, mapelId: e.target.value })}
                  >
                    <option value="">Tanpa mapel</option>
                    {daftarMapel.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.nama_mapel}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="submit"
                    className="w-auto px-3 py-2 text-sm"
                    disabled={processingId === t.id}
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
                </div>
                <LampiranList
                  daftar={t.lampiran ?? []}
                  bisaHapus={isPengurus}
                  onHapus={handleHapusLampiran}
                  disabled={processingId === t.id}
                />
                <LampiranField
                  files={berkasEdit}
                  onChange={setBerkasEdit}
                  sisa={Math.max(0, MAX_LAMPIRAN_PER_ITEM - (t.lampiran?.length ?? 0))}
                />
              </form>
            ) : (
              <div
                key={t.id}
                className={`flex items-start gap-3 rounded-md border p-4 ${
                  isTerlambat(t.deadline, t.selesai)
                    ? 'border-marker/40 bg-marker/5'
                    : 'border-line'
                }`}
              >
                <input
                  type="checkbox"
                  checked={t.selesai}
                  disabled={processingId === t.id}
                  onChange={() => handleToggle(t)}
                  className="mt-1 h-4 w-4 accent-chalk"
                />
                <div className="flex-1">
                  <p
                    className={`font-medium text-ink ${t.selesai ? 'line-through opacity-60' : ''}`}
                  >
                    {t.judul}
                  </p>
                  <p className="text-sm text-pencil">
                    {t.mapel?.nama_mapel ?? 'Tanpa mapel'} · {formatTanggal(t.deadline)}
                    {isTerlambat(t.deadline, t.selesai) && (
                      <span className="ml-1 font-medium text-marker">· Terlambat</span>
                    )}
                  </p>
                  <p className="text-xs text-pencil">
                    {t.penulis?.nama ?? 'Pengguna'} · {formatWaktu(t.created_at)}
                    {isPengurus && typeof t.jumlahSelesai === 'number' && (
                      <> · {t.jumlahSelesai} siswa selesai</>
                    )}
                  </p>
                  <LampiranList daftar={t.lampiran ?? []} />
                </div>
                {isPengurus && (
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      className="w-auto px-3 py-1.5 text-sm"
                      onClick={() => mulaiEdit(t)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="secondary"
                      className="w-auto px-3 py-1.5 text-sm text-marker"
                      disabled={processingId === t.id}
                      onClick={() => handleHapus(t)}
                    >
                      Hapus
                    </Button>
                  </div>
                )}
              </div>
            )
          )}
        </div>

        {isPengurus && (
          <div className="mt-6">
            {menambah ? (
              <form onSubmit={handleTambah} className="space-y-3">
                <Field
                  label="Judul tugas"
                  type="text"
                  placeholder="Contoh: Kerjakan LKS halaman 20"
                  value={form.judul}
                  onChange={(e) => setForm({ ...form, judul: e.target.value })}
                  autoFocus
                  required
                />
                <div className="flex flex-wrap gap-2">
                  <label className="flex-1">
                    <span className="mb-1.5 block text-sm font-medium text-ink">
                      Deadline (opsional)
                    </span>
                    <input
                      type="date"
                      className="w-full rounded-md border border-line px-3.5 py-2.5 outline-none focus:border-chalk"
                      value={form.deadline}
                      onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                    />
                  </label>
                  <label className="flex-1">
                    <span className="mb-1.5 block text-sm font-medium text-ink">
                      Mapel (opsional)
                    </span>
                    <select
                      className="w-full rounded-md border border-line px-3.5 py-2.5 outline-none focus:border-chalk"
                      value={form.mapelId}
                      onChange={(e) => setForm({ ...form, mapelId: e.target.value })}
                    >
                      <option value="">Tanpa mapel</option>
                      {daftarMapel.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.nama_mapel}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <LampiranField files={berkasBaru} onChange={setBerkasBaru} />
                <div className="flex gap-2">
                  <Button type="submit">Tambah</Button>
                  <Button type="button" variant="secondary" onClick={() => setMenambah(false)}>
                    Batal
                  </Button>
                </div>
              </form>
            ) : (
              <Button variant="secondary" onClick={() => setMenambah(true)}>
                + Tambah tugas
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
