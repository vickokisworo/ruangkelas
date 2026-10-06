import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { pengumumanService } from '@/features/pengumuman/services/pengumumanService'
import { dashboardService } from '@/features/dashboard/services/dashboardService'
import { ROUTES } from '@/config/routes'
import {
  PENGURUS_ROLES,
  POLLING_MIN_OPSI,
  POLLING_MAX_OPSI,
  MAX_LAMPIRAN_PER_ITEM,
} from '@/config/constants'
import { Button, LoadingScreen } from '@/components/ui'
import PollingCard from '@/features/pengumuman/components/PollingCard'
import KomentarThread from '@/features/pengumuman/components/KomentarThread'
import { komentarService } from '@/features/pengumuman/services/komentarService'
import LampiranField from '@/features/lampiran/components/LampiranField'
import LampiranList from '@/features/lampiran/components/LampiranList'
import { lampiranService } from '@/features/lampiran/services/lampiranService'
import { validasiDaftarBerkas } from '@/utils/lampiran'

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

export default function PengumumanPage() {
  const navigate = useNavigate()
  const { kelasId } = useParams()
  const { user } = useAuth()

  const [role, setRole] = useState(null)
  const [daftar, setDaftar] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [menulis, setMenulis] = useState(false)
  const [isiBaru, setIsiBaru] = useState('')
  const [denganPolling, setDenganPolling] = useState(false)
  const [opsiBaru, setOpsiBaru] = useState(['', ''])
  const [berkasBaru, setBerkasBaru] = useState([])
  const [berkasEdit, setBerkasEdit] = useState([])

  const [editId, setEditId] = useState(null)
  const [isiEdit, setIsiEdit] = useState('')
  const [processingId, setProcessingId] = useState(null)

  const isPengurus = PENGURUS_ROLES.includes(role)

  const muatPengumuman = async () => {
    const { data, error: muatError } = await pengumumanService.listPengumuman(kelasId)
    if (muatError) setError(muatError.message || 'Gagal memuat pengumuman.')
    else setError('')
    setDaftar(data ?? [])
  }

  useEffect(() => {
    const muatSemua = async () => {
      const { data: kelasInfo } = await dashboardService.getKelasUser(user.id)
      setRole(kelasInfo?.role ?? null)
      await muatPengumuman()
      setLoading(false)
    }
    muatSemua()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kelasId, user])

  const handleTambah = async (e) => {
    e.preventDefault()
    if (!isiBaru.trim()) return
    setError('')

    const opsiBersih = denganPolling ? opsiBaru.map((o) => o.trim()).filter(Boolean) : []
    if (denganPolling && opsiBersih.length < POLLING_MIN_OPSI) {
      setError(`Polling butuh minimal ${POLLING_MIN_OPSI} opsi yang terisi.`)
      return
    }

    const pesanBerkas = validasiDaftarBerkas(berkasBaru)
    if (pesanBerkas) {
      setError(pesanBerkas)
      return
    }

    const { data: pengumumanId, error: tambahError } = await pengumumanService.tambahPengumuman({
      kelasId,
      penulisId: user.id,
      isi: isiBaru,
      opsi: opsiBersih,
    })

    if (tambahError) {
      setError(tambahError.message)
      return
    }

    if (berkasBaru.length && pengumumanId) {
      const { error: unggahError } = await lampiranService.unggahBanyak({
        files: berkasBaru,
        kelasId,
        pengumumanId,
      })
      if (unggahError) setError(unggahError.message)
    }

    setIsiBaru('')
    setDenganPolling(false)
    setOpsiBaru(['', ''])
    setBerkasBaru([])
    setMenulis(false)
    muatPengumuman()
  }

  const mulaiEdit = (p) => {
    setEditId(p.id)
    setIsiEdit(p.isi)
    setBerkasEdit([])
  }

  const handleSimpanEdit = async (e) => {
    e.preventDefault()
    setError('')
    setProcessingId(editId)

    const { error: editError } = await pengumumanService.editPengumuman({
      id: editId,
      isi: isiEdit,
    })

    if (editError) {
      setProcessingId(null)
      setError(editError.message)
      return
    }

    if (berkasEdit.length) {
      const jumlahSekarang = daftar.find((item) => item.id === editId)?.lampiran?.length ?? 0
      const pesanBerkas = validasiDaftarBerkas(berkasEdit, jumlahSekarang)
      if (pesanBerkas) {
        setProcessingId(null)
        setError(pesanBerkas)
        return
      }
      const { error: unggahError } = await lampiranService.unggahBanyak({
        files: berkasEdit,
        kelasId,
        pengumumanId: editId,
      })
      if (unggahError) {
        setProcessingId(null)
        setError(unggahError.message)
        muatPengumuman()
        return
      }
    }

    setProcessingId(null)
    setEditId(null)
    setBerkasEdit([])
    muatPengumuman()
  }

  const handleTogglePin = async (p) => {
    setProcessingId(p.id)
    await pengumumanService.togglePin(p.id, !p.pinned)
    setProcessingId(null)
    muatPengumuman()
  }

  const handleHapus = async (item) => {
    setError('')
    setProcessingId(item.id)
    if (item.lampiran?.length) await lampiranService.hapusSemua(item.lampiran)
    const { error: hapusError } = await pengumumanService.hapusPengumuman(item.id)
    setProcessingId(null)
    if (hapusError) {
      setError('Gagal menghapus pengumuman.')
      return
    }
    muatPengumuman()
  }

  const handleHapusLampiran = async (lampiran) => {
    setError('')
    const { error: hapusError } = await lampiranService.hapus(lampiran)
    if (hapusError) {
      setError('Gagal menghapus lampiran.')
      return
    }
    muatPengumuman()
  }

  const handleVote = async (pengumumanId, pollingId, opsiId) => {
    setError('')
    setProcessingId(pengumumanId)
    const { error: voteError } = await pengumumanService.beriSuara({ pollingId, opsiId })
    setProcessingId(null)
    if (voteError) setError(voteError.message)
    muatPengumuman()
  }

  const handleKirimKomentar = async (pengumumanId, isi, parentId) => {
    setError('')
    setProcessingId(pengumumanId)
    const { error: komentarError } = await komentarService.tambahKomentar({
      kelasId,
      pengumumanId,
      penulisId: user.id,
      isi,
      parentId,
    })
    setProcessingId(null)
    if (komentarError) {
      setError(komentarError.message)
      return { error: komentarError }
    }
    muatPengumuman()
    return { error: null }
  }

  const handleSukaKomentar = async (pengumumanId, item) => {
    setError('')
    setProcessingId(pengumumanId)
    const { error: sukaError } = await komentarService.toggleSuka({
      komentarId: item.id,
      kelasId,
      userId: user.id,
      sudahSuka: item.disukai,
    })
    setProcessingId(null)
    if (sukaError) {
      setError('Gagal mengubah suka komentar.')
      return
    }
    muatPengumuman()
  }

  const handleHapusKomentar = async (pengumumanId, komentarId) => {
    setError('')
    setProcessingId(pengumumanId)
    const { error: hapusError } = await komentarService.hapusKomentar(komentarId)
    setProcessingId(null)
    if (hapusError) {
      setError('Gagal menghapus komentar.')
      return
    }
    muatPengumuman()
  }

  const handleToggleTutup = async (pengumumanId, polling) => {
    setError('')
    setProcessingId(pengumumanId)
    const { error: tutupError } = await pengumumanService.setPollingDitutup({
      pollingId: polling.id,
      ditutup: !polling.ditutup,
    })
    setProcessingId(null)
    if (tutupError) setError('Gagal mengubah status polling.')
    muatPengumuman()
  }

  const ubahOpsi = (index, nilai) => setOpsiBaru(opsiBaru.map((o, i) => (i === index ? nilai : o)))

  if (loading) return <LoadingScreen />

  return (
    <div className="min-h-screen px-5 py-8">
      <div className="mx-auto max-w-2xl">
        <header className="mb-6 border-b border-line pb-5">
          <h1 className="text-xl font-semibold text-ink">Pengumuman</h1>
        </header>

        {error && <p className="mb-4 text-sm text-marker">{error}</p>}

        {isPengurus && (
          <div className="mb-6">
            {menulis ? (
              <form onSubmit={handleTambah} className="space-y-3">
                <textarea
                  className="w-full rounded-md border border-line px-3.5 py-2.5 outline-none focus:border-chalk"
                  rows={3}
                  placeholder="Tulis pengumuman untuk kelas..."
                  value={isiBaru}
                  onChange={(e) => setIsiBaru(e.target.value)}
                  autoFocus
                  required
                />
                <label className="flex items-center gap-2 text-sm text-ink">
                  <input
                    type="checkbox"
                    checked={denganPolling}
                    onChange={(e) => setDenganPolling(e.target.checked)}
                    className="h-4 w-4 accent-chalk"
                  />
                  Sertakan polling
                </label>

                {denganPolling && (
                  <div className="space-y-2 rounded-md border border-line p-3">
                    <p className="text-xs text-pencil">
                      Pilihan jawaban ({POLLING_MIN_OPSI}–{POLLING_MAX_OPSI} opsi). Suara anggota
                      bersifat anonim.
                    </p>
                    {opsiBaru.map((opsi, i) => (
                      <div key={i} className="flex gap-2">
                        <input
                          className="flex-1 rounded-md border border-line px-3 py-2 outline-none focus:border-chalk"
                          placeholder={`Opsi ${i + 1}`}
                          value={opsi}
                          onChange={(e) => ubahOpsi(i, e.target.value)}
                          maxLength={80}
                        />
                        {opsiBaru.length > POLLING_MIN_OPSI && (
                          <button
                            type="button"
                            className="px-2 text-pencil hover:text-marker"
                            aria-label={`Hapus opsi ${i + 1}`}
                            onClick={() => setOpsiBaru(opsiBaru.filter((_, idx) => idx !== i))}
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                    {opsiBaru.length < POLLING_MAX_OPSI && (
                      <button
                        type="button"
                        className="text-sm font-medium text-chalk hover:underline"
                        onClick={() => setOpsiBaru([...opsiBaru, ''])}
                      >
                        + Tambah opsi
                      </button>
                    )}
                  </div>
                )}

                <LampiranField files={berkasBaru} onChange={setBerkasBaru} />

                <div className="flex gap-2">
                  <Button type="submit">Kirim</Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setMenulis(false)
                      setBerkasBaru([])
                    }}
                  >
                    Batal
                  </Button>
                </div>
              </form>
            ) : (
              <Button variant="secondary" onClick={() => setMenulis(true)}>
                + Tulis pengumuman
              </Button>
            )}
          </div>
        )}

        <div className="space-y-2">
          {daftar.length === 0 && (
            <p className="text-sm text-pencil">Belum ada pengumuman di kelas ini.</p>
          )}

          {daftar.map((p) =>
            editId === p.id ? (
              <form
                key={p.id}
                onSubmit={handleSimpanEdit}
                className="space-y-2 rounded-md border border-chalk p-4"
              >
                <textarea
                  className="w-full rounded-md border border-line px-3 py-2 outline-none focus:border-chalk"
                  rows={3}
                  value={isiEdit}
                  onChange={(e) => setIsiEdit(e.target.value)}
                  autoFocus
                  required
                />
                <div className="flex gap-2">
                  <Button
                    type="submit"
                    className="w-auto px-3 py-2 text-sm"
                    disabled={processingId === p.id}
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
                  daftar={p.lampiran ?? []}
                  bisaHapus={isPengurus}
                  onHapus={handleHapusLampiran}
                  disabled={processingId === p.id}
                />
                <LampiranField
                  files={berkasEdit}
                  onChange={setBerkasEdit}
                  sisa={Math.max(0, MAX_LAMPIRAN_PER_ITEM - (p.lampiran?.length ?? 0))}
                />
              </form>
            ) : (
              <div
                key={p.id}
                className={`rounded-md border p-4 ${
                  p.pinned ? 'border-chalk bg-chalk/5' : 'border-line'
                }`}
              >
                <div className="mb-1 flex items-center justify-between">
                  <p className="text-xs text-pencil">
                    {p.pinned && <span className="mr-1.5 font-medium text-chalk">📌 Dipin ·</span>}
                    {p.penulis?.nama ?? 'Pengguna'} · {formatWaktu(p.created_at)}
                  </p>
                </div>
                <p className="whitespace-pre-wrap text-ink">{p.isi}</p>

                <LampiranList daftar={p.lampiran ?? []} />

                {p.polling && (
                  <PollingCard
                    polling={p.polling}
                    isPengurus={isPengurus}
                    processing={processingId === p.id}
                    onVote={(opsiId) => handleVote(p.id, p.polling.id, opsiId)}
                    onToggleTutup={() => handleToggleTutup(p.id, p.polling)}
                  />
                )}

                {isPengurus && (
                  <div className="mt-3 flex gap-2">
                    <Button
                      variant="secondary"
                      className="w-auto px-3 py-1.5 text-sm"
                      disabled={processingId === p.id}
                      onClick={() => handleTogglePin(p)}
                    >
                      {p.pinned ? 'Lepas pin' : 'Pin'}
                    </Button>
                    <Button
                      variant="secondary"
                      className="w-auto px-3 py-1.5 text-sm"
                      onClick={() => mulaiEdit(p)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="secondary"
                      className="w-auto px-3 py-1.5 text-sm text-marker"
                      disabled={processingId === p.id}
                      onClick={() => handleHapus(p)}
                    >
                      Hapus
                    </Button>
                  </div>
                )}

                <KomentarThread
                  komentar={(p.komentar ?? []).map((k) => ({
                    ...k,
                    disukai: (k.pemilihSuka ?? []).includes(user.id),
                  }))}
                  userId={user.id}
                  isPengurus={isPengurus}
                  processing={processingId === p.id}
                  onKirim={(isi, parentId) => handleKirimKomentar(p.id, isi, parentId)}
                  onHapus={(komentarId) => handleHapusKomentar(p.id, komentarId)}
                  onSuka={(item) => handleSukaKomentar(p.id, item)}
                />
              </div>
            )
          )}
        </div>
      </div>
    </div>
  )
}
