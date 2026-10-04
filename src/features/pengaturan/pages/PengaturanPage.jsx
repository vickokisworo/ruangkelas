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

function Ikon({ children }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

const IKON = {
  profil: (
    <Ikon>
      <circle cx="12" cy="8" r="3" />
      <path d="M5 19a7 7 0 0 1 14 0" />
    </Ikon>
  ),
  tema: (
    <Ikon>
      <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4 7 7 0 0 0 20 14.5Z" />
    </Ikon>
  ),
  notif: (
    <Ikon>
      <path d="M6 9a6 6 0 1 1 12 0c0 7 2 7 2 9H4c0-2 2-2 2-9Z" />
      <path d="M10 20a2 2 0 0 0 4 0" />
    </Ikon>
  ),
  pasang: (
    <Ikon>
      <rect x="7" y="3" width="10" height="18" rx="2" />
      <path d="M11 18h2" />
    </Ikon>
  ),
  keluar: (
    <Ikon>
      <path d="M10 7V5a1 1 0 0 1 1-1h8v16h-8a1 1 0 0 1-1-1v-2" />
      <path d="M4 12h10M11 9l3 3-3 3" />
    </Ikon>
  ),
}

function Sakelar({ nyala, label, onClick }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={nyala}
      aria-label={label}
      onClick={onClick}
      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
        nyala ? 'bg-chalk' : 'bg-line'
      }`}
    >
      <span
        className="absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-all"
        style={{ left: nyala ? 'calc(100% - 1.45rem)' : '0.15rem' }}
      />
    </button>
  )
}

function Baris({ ikon, judul, keterangan, children }) {
  return (
    <div className="flex items-center gap-3 border-b border-line py-4">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-ink/5 text-ink">
        {ikon}
      </span>
      <div className="min-w-0 flex-1">
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

        <Baris ikon={IKON.profil} judul="Profil" keterangan="Ubah nama">
          <button type="button" className="text-sm text-chalk" onClick={() => navigate(ROUTES.PROFIL)}>
            Buka
          </button>
        </Baris>

        <Baris ikon={IKON.tema} judul="Mode gelap" keterangan={gelap ? 'Nyala' : 'Mati'}>
          <Sakelar nyala={gelap} label="Mode gelap" onClick={toggleTema} />
        </Baris>

        <Baris
          ikon={IKON.notif}
          judul="Notifikasi HP"
          keterangan={
            izin === 'denied'
              ? 'Diblokir browser'
              : notifNyala
                ? 'Pengingat muncul di HP'
                : 'Pengingat HP dimatikan'
          }
        >
          <Sakelar nyala={notifNyala} label="Notifikasi HP" onClick={handleNotif} />
        </Baris>

        {!terpasang && (
          <Baris
            ikon={IKON.pasang}
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

        <button
          type="button"
          className="mt-2 flex w-full items-center gap-3 py-4 text-left"
          onClick={() => setKonfirmasi(true)}
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-ink/5 text-marker">
            {IKON.keluar}
          </span>
          <span className="text-sm font-medium text-marker">Keluar</span>
        </button>
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
