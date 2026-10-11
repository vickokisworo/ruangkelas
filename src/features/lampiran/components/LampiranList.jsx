import { useEffect, useRef, useState } from 'react'
import { lampiranService } from '@/features/lampiran/services/lampiranService'
import { formatUkuran, isGambar } from '@/utils/lampiran'

function SlideGambar({ gambar, urlMap, bisaHapus, onHapus, disabled }) {
  const [indeks, setIndeks] = useState(0)
  const [detail, setDetail] = useState(false)
  const mulai = useRef(0)
  const geserJauh = useRef(false)
  const aktif = gambar[Math.min(indeks, gambar.length - 1)]
  const urlAktif = urlMap[aktif?.id]

  const geser = (arah) => {
    setIndeks((i) => Math.min(gambar.length - 1, Math.max(0, i + arah)))
  }

  const mulaiSentuh = (e) => {
    mulai.current = e.touches[0].clientX
    geserJauh.current = false
  }

  const selesaiSentuh = (e) => {
    const selisih = e.changedTouches[0].clientX - mulai.current
    if (Math.abs(selisih) >= 40) {
      geserJauh.current = true
      if (selisih < 0) geser(1)
      if (selisih > 0) geser(-1)
    }
  }

  const bukaDetail = () => {
    if (!geserJauh.current && urlAktif) {
      window.history.pushState({ fotoDetail: true }, '')
      setDetail(true)
    }
  }

  useEffect(() => {
    if (!detail) return undefined
    const tutup = () => setDetail(false)
    window.addEventListener('popstate', tutup)
    return () => window.removeEventListener('popstate', tutup)
  }, [detail])

  const unduh = async () => {
    if (!urlAktif) return
    const res = await fetch(urlAktif)
    const blob = await res.blob()
    const objectUrl = URL.createObjectURL(blob)
    const tautan = document.createElement('a')
    tautan.href = objectUrl
    tautan.download = aktif?.nama_file || 'gambar.jpg'
    tautan.click()
    URL.revokeObjectURL(objectUrl)
  }

  return (
    <div>
      <div className="relative" onTouchStart={mulaiSentuh} onTouchEnd={selesaiSentuh}>
        <button
          type="button"
          className="block w-full"
          onClick={(e) => {
            e.stopPropagation()
            bukaDetail()
          }}
        >
          {urlAktif ? (
            <img src={urlAktif} alt="" className="block h-auto w-full" />
          ) : (
            <div className="h-40 w-full animate-pulse bg-line/40" />
          )}
        </button>
        {gambar.length > 1 && (
          <span className="pointer-events-none absolute right-3 top-3 rounded-full bg-black/70 px-2 py-1 text-xs font-medium text-white">
            {indeks + 1}/{gambar.length}
          </span>
        )}
      </div>
      {bisaHapus && (
        <button
          type="button"
          className="px-3 py-2 text-xs font-medium text-white/80 hover:underline disabled:opacity-50"
          disabled={disabled}
          onClick={() => onHapus?.(aktif)}
        >
          Hapus gambar ini
        </button>
      )}
      {detail && urlAktif && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black">
          <div className="flex items-center justify-between px-4 py-3 text-white">
            <button type="button" className="text-sm" onClick={() => window.history.back()}>
              Tutup
            </button>
            <span className="text-sm">
              {indeks + 1}/{gambar.length}
            </span>
            <button type="button" className="text-sm font-medium" onClick={unduh}>
              Unduh
            </button>
          </div>
          <div className="flex min-h-0 flex-1 items-center justify-center px-2" onTouchStart={mulaiSentuh} onTouchEnd={selesaiSentuh}>
            <img src={urlAktif} alt="" className="max-h-full max-w-full object-contain" />
          </div>
        </div>
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
