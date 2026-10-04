import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authService } from '@/features/auth/services/authService'
import { ROUTES } from '@/config/routes'
import { useTema } from '@/context/ThemeContext'
import { ConfirmDialog } from '@/components/ui'
import {
  mintaNotifikasiPonsel,
  notifikasiHpNyala,
  onBisaPasang,
  pasangAplikasi,
  simpanNotifikasiHp,
  sudahTerpasang,
} from '@/pwa/pwa'

function Baris({ judul, keterangan, children }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-line py-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-ink">{judul}</p>
        {keterangan && <p className="mt-0.5 text-xs text-pencil">{keterangan}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

export default function PengaturanPage() {
  const navigate = useNavigate()
  const { gelap, toggleTema } = useTema()
  const [konfirmasi, setKonfirmasi] = useState(false)
  const [notifNyala, setNotifNyala] = useState(notifikasiHpNyala)
  const [izin, setIzin] = useState(
    typeof Notification === 'undefined' ? 'tidak-didukung' : Notification.permission,
  )
  const [terpasang, setTerpasang] = useState(sudahTerpasang)
  const [bisaPasang, setBisaPasang] = useState(false)
  const [ios, setIos] = useState(false)
  const [pesan, setPesan] = useState('')

  useEffect(() => {
    setIos(/iphone|ipad|ipod/i.test(navigator.userAgent))
    return onBisaPasang(() => setBisaPasang(true))
  }, [])

  const handleLogout = async () => {
    await authService.signOut()
    navigate(ROUTES.LOGIN)
  }

  const handleNotif = async () => {
    if (notifNyala) {
      simpanNotifikasiHp(false)
      setNotifNyala(false)
      setPesan('')
      return
    }
    const hasil = await mintaNotifikasiPonsel()
    setIzin(hasil)
    if (hasil === 'granted') {
      simpanNotifikasiHp(true)
      setNotifNyala(true)
      setPesan('')
      return
    }
    if (hasil === 'denied') {
      setPesan('Izin ditolak browser. Aktifkan notifikasi lewat pengaturan situs di HP.')
      return
    }
    setPesan('HP ini tidak mendukung notifikasi.')
  }

  const handlePasang = async () => {
    const berhasil = await pasangAplikasi()
    if (berhasil) setTerpasang(true)
  }

  return (
    <div className="min-h-screen px-5 py-8">
      <div className="mx-auto max-w-2xl">
        <header className="mb-6 border-b border-line pb-5">
          <h1 className="text-xl font-semibold text-ink">Pengaturan</h1>
        </header>

        {pesan && <p className="mb-4 text-sm text-marker">{pesan}</p>}

        <Baris judul="Profil" keterangan="Ubah nama">
          <button type="button" className="text-sm text-chalk" onClick={() => navigate(ROUTES.PROFIL)}>
            Buka
          </button>
        </Baris>

        <Baris judul="Tampilan" keterangan={gelap ? 'Mode gelap' : 'Mode terang'}>
          <button type="button" className="text-sm text-chalk" onClick={toggleTema}>
            {gelap ? 'Terang' : 'Gelap'}
          </button>
        </Baris>

        <Baris
          judul="Notifikasi HP"
          keterangan={
            izin === 'denied'
              ? 'Diblokir browser'
              : notifNyala
                ? 'Pengingat muncul di HP'
                : 'Pengingat HP dimatikan'
          }
        >
          <button type="button" className="text-sm text-chalk" onClick={handleNotif}>
            {notifNyala ? 'Matikan' : 'Nyalakan'}
          </button>
        </Baris>

        {!terpasang && (
          <Baris
            judul="Pasang aplikasi"
            keterangan={
              ios
                ? 'Safari: Bagikan, lalu Tambahkan ke Layar Utama.'
                : 'Ikon Ruang Kelas di layar HP'
            }
          >
            {bisaPasang ? (
              <button type="button" className="text-sm text-chalk" onClick={handlePasang}>
                Pasang
              </button>
            ) : (
              <span className="text-xs text-pencil">{ios ? 'Lewat Safari' : 'Menu browser'}</span>
            )}
          </Baris>
        )}

        <div className="pt-6">
          <button type="button" className="text-sm text-pencil hover:text-ink" onClick={() => setKonfirmasi(true)}>
            Keluar
          </button>
        </div>
      </div>

      <ConfirmDialog
        terbuka={konfirmasi}
        judul="Keluar"
        isi="Keluar dari akun ini?"
        yaLabel="Ya, keluar"
        bahaya
        onYa={handleLogout}
        onBatal={() => setKonfirmasi(false)}
      />
    </div>
  )
}
