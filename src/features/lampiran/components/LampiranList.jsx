import { useEffect, useState } from 'react'
import { lampiranService } from '@/features/lampiran/services/lampiranService'
import { formatUkuran, isGambar } from '@/utils/lampiran'

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

  return (
    <div className="mt-3 space-y-2">
      {daftar.map((l) => {
        const url = urlMap[l.id]
        const gambar = isGambar(l.mime_type)

        return gambar ? (
          <div key={l.id} className="overflow-hidden rounded-2xl bg-black">
            {url ? (
              <a href={url} target="_blank" rel="noreferrer" className="flex max-h-[28rem] items-center justify-center bg-black">
                <img src={url} alt="" className="max-h-[28rem] w-full object-contain" />
              </a>
            ) : (
              <div className="h-40 animate-pulse bg-black/80" />
            )}
            {bisaHapus && (
              <button
                type="button"
                className="px-3 py-1.5 text-xs font-medium text-marker hover:underline disabled:opacity-50"
                disabled={disabled}
                onClick={() => onHapus?.(l)}
              >
                Hapus gambar
              </button>
            )}
          </div>
        ) : (
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
