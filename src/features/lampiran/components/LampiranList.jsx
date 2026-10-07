import { useEffect, useState } from 'react'
import { lampiranService } from '@/features/lampiran/services/lampiranService'
import { formatUkuran, isGambar } from '@/utils/lampiran'

function SlideGambar({ gambar, urlMap, bisaHapus, onHapus, disabled }) {
  const [indeks, setIndeks] = useState(0)
  const aktif = gambar[Math.min(indeks, gambar.length - 1)]
  const url = urlMap[aktif?.id]

  const geser = (arah) => {
    setIndeks((i) => (i + arah + gambar.length) % gambar.length)
  }

  return (
    <div className="overflow-hidden rounded-2xl bg-black">
      {url ? (
        <a href={url} target="_blank" rel="noreferrer" className="flex max-h-[28rem] items-center justify-center bg-black">
          <img src={url} alt="" className="max-h-[28rem] w-full object-contain" />
        </a>
      ) : (
        <div className="h-40 animate-pulse bg-black/80" />
      )}
      {gambar.length > 1 && (
        <div className="flex items-center justify-between px-3 py-2 text-white">
          <button type="button" className="px-2 text-lg" aria-label="Gambar sebelumnya" onClick={() => geser(-1)}>
            ‹
          </button>
          <span className="text-xs">
            {Math.min(indeks, gambar.length - 1) + 1}/{gambar.length}
          </span>
          <button type="button" className="px-2 text-lg" aria-label="Gambar berikutnya" onClick={() => geser(1)}>
            ›
          </button>
        </div>
      )}
      {bisaHapus && (
        <button
          type="button"
          className="px-3 pb-2 text-xs font-medium text-white/80 hover:underline disabled:opacity-50"
          disabled={disabled}
          onClick={() => onHapus?.(aktif)}
        >
          Hapus gambar ini
        </button>
      )}
    </div>
  )
}

export default function LampiranList({ daftar = [], bisaHapus = false, onHapus, disabled }) {
  const [urlMap, setUrlMap] = useState({})

  useEffect(() => {
    let hidup = true
    const muat = async () => {
      const next = {}
      await Promise.all(
        daftar.map(async (l) => {
          const url = await lampiranService.urlUnduh(l.storage_path)
          if (url) next[l.id] = url
        }),
      )
      if (hidup) setUrlMap(next)
    }
    if (daftar.length) muat()
    return () => {
      hidup = false
    }
  }, [daftar])

  if (!daftar.length) return null

  const gambar = daftar.filter((l) => isGambar(l.mime_type))
  const dokumen = daftar.filter((l) => !isGambar(l.mime_type))

  return (
    <div className="mt-3 space-y-2">
      {gambar.length > 0 && (
        <SlideGambar
          gambar={gambar}
          urlMap={urlMap}
          bisaHapus={bisaHapus}
          onHapus={onHapus}
          disabled={disabled}
        />
      )}
      {dokumen.map((l) => {
        const url = urlMap[l.id]
        return (
          <div key={l.id} className="rounded-md border border-line bg-paper p-2">
            <div className="flex items-center justify-between gap-2 text-sm">
              {url ? (
                <a href={url} target="_blank" rel="noreferrer" className="truncate font-medium text-chalk hover:underline">
                  {l.nama_file}
                </a>
              ) : (
                <span className="truncate text-ink">{l.nama_file}</span>
              )}
              <span className="shrink-0 text-xs text-pencil">{formatUkuran(l.ukuran)}</span>
            </div>
            {bisaHapus && (
              <button
                type="button"
                className="mt-1 text-xs font-medium text-marker hover:underline disabled:opacity-50"
                disabled={disabled}
                onClick={() => onHapus?.(l)}
              >
                Hapus lampiran
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}
