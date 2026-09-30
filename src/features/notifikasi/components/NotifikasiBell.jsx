import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { notifikasiService, teksBagikan } from '@/features/notifikasi/services/notifikasiService'

function formatWaktu(iso) {
  return new Date(iso).toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function NotifikasiBell() {
  const navigate = useNavigate()
  const [daftar, setDaftar] = useState([])
  const [terbuka, setTerbuka] = useState(false)
  const [siap, setSiap] = useState(false)

  const muat = async () => {
    await notifikasiService.sinkronDeadline()
    const { data, error } = await notifikasiService.listNotifikasi()
    if (!error) {
      setDaftar(data)
      setSiap(true)
    }
  }

  useEffect(() => {
    muat()
    const timer = setInterval(muat, 60 * 1000)
    return () => clearInterval(timer)
  }, [])

  const belumDibaca = daftar.filter((n) => !n.dibaca).length

  const handleBuka = async (item) => {
    if (!item.dibaca) await notifikasiService.tandaiDibaca(item.id)
    setDaftar((prev) => prev.map((n) => (n.id === item.id ? { ...n, dibaca: true } : n)))
    setTerbuka(false)
    if (item.tautan) navigate(item.tautan)
  }

  const handleSemua = async () => {
    await notifikasiService.tandaiSemua()
    setDaftar((prev) => prev.map((n) => ({ ...n, dibaca: true })))
  }

  const handleWhatsApp = () => {
    const teks = teksBagikan(daftar)
    window.open(`https://wa.me/?text=${encodeURIComponent(teks)}`, '_blank', 'noopener')
  }

  if (!siap && !terbuka) {
    return null
  }

  return (
    <>
      <button
        type="button"
        className="fixed bottom-[calc(5.25rem_+_env(safe-area-inset-bottom))] right-4 z-40 flex h-11 w-11 items-center justify-center rounded-full border border-line bg-paper text-ink shadow-md md:bottom-6"
        aria-label={belumDibaca ? `${belumDibaca} notifikasi belum dibaca` : 'Notifikasi'}
        onClick={() => setTerbuka(true)}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M6 9a6 6 0 1 1 12 0c0 7 2 7 2 9H4c0-2 2-2 2-9Z" />
          <path d="M10 20a2 2 0 0 0 4 0" />
        </svg>
        {belumDibaca > 0 && (
          <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-marker px-1 text-center text-[10px] font-medium text-paper">
            {belumDibaca > 9 ? '9+' : belumDibaca}
          </span>
        )}
      </button>

      {terbuka && (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            className="absolute inset-0 bg-ink/40"
            aria-label="Tutup notifikasi"
            onClick={() => setTerbuka(false)}
          />
          <section
            role="dialog"
            aria-label="Notifikasi"
            className="absolute inset-x-0 bottom-0 flex max-h-[55vh] min-h-[40vh] flex-col rounded-t-2xl border-t border-line bg-paper pb-[env(safe-area-inset-bottom)] shadow-2xl md:inset-auto md:bottom-20 md:right-6 md:h-[28rem] md:w-96 md:rounded-md md:border"
          >
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <h2 className="text-sm font-semibold text-ink">Pengingat</h2>
              <div className="flex gap-3 text-xs font-medium">
                {belumDibaca > 0 && (
                  <button type="button" className="text-chalk" onClick={handleSemua}>
                    Tandai dibaca
                  </button>
                )}
                <button type="button" className="text-pencil hover:text-ink" onClick={() => setTerbuka(false)}>
                  Tutup
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {daftar.length === 0 && (
                <p className="px-4 py-8 text-center text-sm text-pencil">Belum ada pengingat.</p>
              )}
              {daftar.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  className={`block w-full border-b border-line px-4 py-3 text-left ${
                    n.dibaca ? 'bg-paper' : 'bg-chalk/5'
                  }`}
                  onClick={() => handleBuka(n)}
                >
                  <p className="text-sm font-medium text-ink">{n.judul}</p>
                  {n.isi && <p className="mt-0.5 line-clamp-2 text-sm text-pencil">{n.isi}</p>}
                  <p className="mt-1 text-xs text-pencil">{formatWaktu(n.created_at)}</p>
                </button>
              ))}
            </div>

            <div className="border-t border-line px-4 py-3">
              <button
                type="button"
                className="text-sm font-medium text-chalk hover:underline"
                onClick={handleWhatsApp}
              >
                Bagikan pengingat lewat WhatsApp
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  )
}
