import { useEffect, useMemo, useState } from 'react'
import { MAX_KOMENTAR_PANJANG } from '@/config/constants'

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

function IkonKomentar() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7A2.5 2.5 0 0 1 17.5 16H9l-4 3.5V6.5Z" />
    </svg>
  )
}

function IkonSuka({ terisi }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill={terisi ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 5.6-7 10-7 10Z" />
    </svg>
  )
}

function susunUtas(daftar) {
  const byId = new Map(daftar.map((item) => [item.id, item]))

  const akarDari = (item) => {
    let cur = item
    const seen = new Set()
    while (cur?.parent_id && byId.has(cur.parent_id) && !seen.has(cur.id)) {
      seen.add(cur.id)
      cur = byId.get(cur.parent_id)
    }
    return cur
  }

  const akar = []
  const anak = new Map()

  for (const item of daftar) {
    const sasaran = item.parent_id ? byId.get(item.parent_id) : null
    const lengkap = {
      ...item,
      membalasNama: sasaran?.penulis?.nama ?? null,
    }

    if (!item.parent_id || !sasaran) {
      akar.push(lengkap)
      continue
    }

    const akarUtas = akarDari(item)
    const list = anak.get(akarUtas.id) ?? []
    list.push(lengkap)
    anak.set(akarUtas.id, list)
  }

  return akar.map((item) => ({
    ...item,
    balasan: (anak.get(item.id) ?? []).sort(
      (a, b) => new Date(a.created_at) - new Date(b.created_at),
    ),
  }))
}

function BarisKomentar({
  item,
  userId,
  isPengurus,
  processing,
  menjorok,
  onBalas,
  onHapus,
  onSuka,
}) {
  const bisaHapus = isPengurus || item.penulis_id === userId
  const nama = item.penulis?.nama ?? 'Pengguna'

  return (
    <div className={`flex gap-2 ${menjorok ? 'ml-8' : ''}`}>
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-line text-xs font-medium text-ink">
        {nama.slice(0, 1).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm">
          <span className="font-medium text-ink">{nama}</span>
          {item.membalasNama && (
            <span className="text-pencil"> membalas {item.membalasNama}</span>
          )}{' '}
          <span className="whitespace-pre-wrap text-ink">{item.isi}</span>
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-pencil">
          <span>{formatWaktu(item.created_at)}</span>
          <button
            type="button"
            className="font-medium hover:text-ink"
            onClick={() => onBalas(item)}
          >
            Balas
          </button>
          {bisaHapus && (
            <button
              type="button"
              className="font-medium text-marker disabled:opacity-50"
              disabled={processing}
              onClick={() => onHapus(item.id)}
            >
              Hapus
            </button>
          )}
        </div>
      </div>
      <button
        type="button"
        className={`flex shrink-0 flex-col items-center pt-1 ${
          item.disukai ? 'text-marker' : 'text-pencil'
        }`}
        aria-label={item.disukai ? 'Batal suka' : 'Suka'}
        disabled={processing}
        onClick={() => onSuka(item)}
      >
        <IkonSuka terisi={item.disukai} />
        {item.jumlahSuka > 0 && <span className="text-[10px]">{item.jumlahSuka}</span>}
      </button>
    </div>
  )
}

export default function KomentarThread({
  komentar = [],
  userId,
  isPengurus,
  processing,
  onKirim,
  onHapus,
  onSuka,
}) {
  const [terbuka, setTerbuka] = useState(false)
  const [isi, setIsi] = useState('')
  const [membalas, setMembalas] = useState(null)
  const [balasanTerbuka, setBalasanTerbuka] = useState({})

  const utas = useMemo(() => susunUtas(komentar), [komentar])

  useEffect(() => {
    if (!terbuka) return undefined
    const sebelumnya = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = sebelumnya
    }
  }, [terbuka])

  const handleKirim = async (e) => {
    e.preventDefault()
    const teks = isi.trim()
    if (!teks) return
    const parentId = membalas?.id || null
    const { error } = await onKirim(teks, parentId)
    if (!error) {
      setIsi('')
      setMembalas(null)
    }
  }

  return (
    <>
      <div className="mt-3 flex items-center border-t border-line pt-2">
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-md px-1 py-1.5 text-sm text-pencil hover:text-ink"
          aria-label={`Buka komentar, ${komentar.length}`}
          onClick={() => setTerbuka(true)}
        >
          <IkonKomentar />
          <span>{komentar.length}</span>
        </button>
      </div>

      {terbuka && (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            className="absolute inset-0 bg-ink/40"
            aria-label="Tutup komentar"
            onClick={() => setTerbuka(false)}
          />

          <section
            role="dialog"
            aria-label="Komentar"
            className="absolute inset-x-0 bottom-0 flex max-h-[55vh] min-h-[45vh] flex-col rounded-t-2xl border-t border-line bg-paper pb-[env(safe-area-inset-bottom)] shadow-2xl"
          >
            <div className="flex flex-col items-center pt-2">
              <span className="h-1 w-10 rounded-full bg-line" />
              <div className="flex w-full items-center justify-between px-4 py-2">
                <h2 className="text-sm font-semibold text-ink">Komentar</h2>
                <button
                  type="button"
                  className="text-sm text-pencil hover:text-ink"
                  onClick={() => setTerbuka(false)}
                >
                  Tutup
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-2">
              {utas.length === 0 && (
                <p className="py-8 text-center text-sm text-pencil">Belum ada komentar.</p>
              )}

              {utas.map((item) => {
                const tampilBalasan = balasanTerbuka[item.id] || item.balasan.length <= 1
                return (
                  <div key={item.id} className="space-y-3">
                    <BarisKomentar
                      item={item}
                      userId={userId}
                      isPengurus={isPengurus}
                      processing={processing}
                      onBalas={(item) => {
                        setMembalas(item)
                        const tag = `@${item.penulis?.nama ?? 'Pengguna'} `
                        setIsi((prev) => (prev.trim() ? prev : tag))
                      }}
                      onHapus={onHapus}
                      onSuka={onSuka}
                    />
                    {item.balasan.length > 1 && (
                      <button
                        type="button"
                        className="ml-10 text-xs font-medium text-pencil hover:text-ink"
                        onClick={() =>
                          setBalasanTerbuka((prev) => ({ ...prev, [item.id]: !prev[item.id] }))
                        }
                      >
                        {tampilBalasan
                          ? 'Sembunyikan balasan'
                          : `Lihat ${item.balasan.length} balasan`}
                      </button>
                    )}
                    {tampilBalasan &&
                      item.balasan.map((balasan) => (
                        <BarisKomentar
                          key={balasan.id}
                          item={balasan}
                          userId={userId}
                          isPengurus={isPengurus}
                          processing={processing}
                          menjorok
                          onBalas={(item) => {
                        setMembalas(item)
                        const tag = `@${item.penulis?.nama ?? 'Pengguna'} `
                        setIsi((prev) => (prev.trim() ? prev : tag))
                      }}
                          onHapus={onHapus}
                          onSuka={onSuka}
                        />
                      ))}
                  </div>
                )
              })}
            </div>

            <form onSubmit={handleKirim} className="border-t border-line px-4 py-3">
              {membalas && (
                <div className="mb-2 flex items-center justify-between text-xs text-pencil">
                  <span>Membalas {membalas.penulis?.nama ?? 'Pengguna'}</span>
                  <button type="button" onClick={() => setMembalas(null)}>
                    Batal
                  </button>
                </div>
              )}
              <div className="flex items-end gap-2">
                <textarea
                  className="max-h-24 min-h-[40px] flex-1 resize-none rounded-full border border-line px-4 py-2 text-sm outline-none focus:border-chalk"
                  rows={1}
                  maxLength={MAX_KOMENTAR_PANJANG}
                  placeholder={
                    membalas
                      ? `Balas ${membalas.penulis?.nama ?? 'Pengguna'}...`
                      : 'Tambahkan komentar... (@Nama untuk menyebut)'
                  }
                  value={isi}
                  onChange={(e) => setIsi(e.target.value)}
                  disabled={processing}
                  autoFocus
                />
                <button
                  type="submit"
                  className="pb-2 text-sm font-semibold text-chalk disabled:text-pencil"
                  disabled={processing || !isi.trim()}
                >
                  Kirim
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
  )
}
