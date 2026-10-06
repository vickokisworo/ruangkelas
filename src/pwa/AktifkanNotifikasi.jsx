import { useState } from 'react'
import { daftarPush, mintaNotifikasiPonsel, notifikasiHpNyala, simpanNotifikasiHp } from '@/pwa/pwa'

export default function AktifkanNotifikasi() {
  const [tutup, setTutup] = useState(false)
  const perlu =
    !tutup &&
    notifikasiHpNyala() &&
    typeof Notification !== 'undefined' &&
    Notification.permission === 'default'

  if (!perlu) return null

  const izinkan = async () => {
    const hasil = await mintaNotifikasiPonsel()
    if (hasil === 'granted') {
      simpanNotifikasiHp(true)
      await daftarPush()
    }
    setTutup(true)
  }

  return (
    <div className="fixed inset-x-3 bottom-[calc(5.5rem_+_env(safe-area-inset-bottom))] z-30 rounded-md border border-line bg-paper p-3 shadow-lg">
      <p className="text-sm font-medium text-ink">Notifikasi kelas</p>
      <p className="mt-0.5 text-xs text-pencil">Pengumuman dan tugas muncul di layar HP, meski aplikasi ditutup.</p>
      <button type="button" className="mt-2 text-sm font-medium text-chalk" onClick={izinkan}>
        Izinkan
      </button>
    </div>
  )
}
