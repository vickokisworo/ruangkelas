import { useNavigate } from 'react-router-dom'
import { pengumumanPath, tugasPath } from '@/config/routes'
import { labelTenggat, selisihHari } from '@/utils/tanggal'

const potong = (teks, maks = 70) =>
  teks.length > maks ? `${teks.slice(0, maks).trimEnd()}…` : teks

function Baris({ onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-start justify-between gap-3 rounded-md px-3 py-2 text-left text-sm hover:bg-ink/5"
    >
      {children}
    </button>
  )
}

export default function RingkasanKelas({ kelasId, ringkasan }) {
  const navigate = useNavigate()
  const { tugas, pinned, pollingBelumDiisi } = ringkasan
  const kosong = tugas.length === 0 && pinned.length === 0 && pollingBelumDiisi.length === 0

  return (
    <section className="mb-8 rounded-md border border-line p-4" aria-label="Perlu perhatian">
      <h2 className="mb-2 px-3 text-sm font-medium text-ink">Perlu perhatian</h2>

      {kosong && <p className="px-3 text-sm text-pencil">Tidak ada yang mendesak saat ini.</p>}

      {tugas.map((t) => {
        const terlambat = selisihHari(t.deadline) < 0
        return (
          <Baris key={t.id} onClick={() => navigate(tugasPath(kelasId))}>
            <span className="text-ink">
              {t.judul}
              {t.mapel?.nama_mapel && <span className="text-pencil"> · {t.mapel.nama_mapel}</span>}
            </span>
            <span className={`shrink-0 font-medium ${terlambat ? 'text-marker' : 'text-chalk'}`}>
              {labelTenggat(t.deadline)}
            </span>
          </Baris>
        )
      })}

      {pollingBelumDiisi.map((p) => (
        <Baris key={p.id} onClick={() => navigate(pengumumanPath(kelasId))}>
          <span className="text-ink">
            Polling belum kamu isi
            {p.isi && <span className="text-pencil"> · {potong(p.isi, 50)}</span>}
          </span>
          <span className="shrink-0 font-medium text-chalk">Isi sekarang</span>
        </Baris>
      ))}

      {pinned.map((p) => (
        <Baris key={p.id} onClick={() => navigate(pengumumanPath(kelasId))}>
          <span className="text-ink">
            <span className="mr-1">📌</span>
            {potong(p.isi)}
          </span>
        </Baris>
      ))}
    </section>
  )
}
