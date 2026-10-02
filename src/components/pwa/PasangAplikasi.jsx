import { useEffect, useState } from 'react'

export default function PasangAplikasi() {
  const [acara, setAcara] = useState(null)
  const [ios, setIos] = useState(false)
  const [tertutup, setTertutup] = useState(false)
  const sudahTerpasang = window.matchMedia('(display-mode: standalone)').matches

  useEffect(() => {
    const iphone = /iphone|ipad|ipod/i.test(navigator.userAgent)
    const safari = !window.navigator.standalone
    setIos(iphone && safari)
    const simpan = (e) => {
      e.preventDefault()
      setAcara(e)
    }
    window.addEventListener('beforeinstallprompt', simpan)
    return () => window.removeEventListener('beforeinstallprompt', simpan)
  }, [])

  if (sudahTerpasang || tertutup || (!acara && !ios)) return null

  const pasang = async () => {
    if (!acara) return
    acara.prompt()
    await acara.userChoice
    setAcara(null)
  }

  return (
    <div className="fixed inset-x-3 bottom-[calc(5.5rem_+_env(safe-area-inset-bottom))] z-30 rounded-md border border-line bg-paper p-3 shadow-lg md:bottom-6 md:left-auto md:right-4 md:w-80">
      <div className="flex items-start gap-3">
        <img src="/icon-192.png" alt="" className="h-10 w-10 rounded-md" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-ink">Pasang Ruang Kelas</p>
          <p className="mt-0.5 text-xs text-pencil">
            {ios
              ? 'Di Safari: Bagikan, lalu Tambahkan ke Layar Utama.'
              : 'Agar ikonnya ada di layar HP, seperti aplikasi.'}
          </p>
          <div className="mt-2 flex gap-3">
            {acara && (
              <button type="button" className="text-xs font-medium text-chalk" onClick={pasang}>
                Pasang
              </button>
            )}
            <button type="button" className="text-xs text-pencil" onClick={() => setTertutup(true)}>
              Nanti
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
