import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useKelas } from '@/context/KelasContext'
import {
  ROUTES,
  jadwalPath,
  kelolaAnggotaPath,
  mapelPath,
  pengumumanPath,
  tugasPath,
} from '@/config/routes'
import { ROLE } from '@/config/constants'

function Icon({ children }) {
  return (
    <svg
      width="24"
      height="24"
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

const ICONS = {
  beranda: (
    <Icon>
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5 10.5V20h14v-9.5" />
    </Icon>
  ),
  pengumuman: (
    <Icon>
      <path d="M4 10v4h3l7 4V6L7 10H4Z" />
      <path d="M17.5 9a4 4 0 0 1 0 6" />
    </Icon>
  ),
  jadwal: (
    <Icon>
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M4 10h16M9 3v4M15 3v4" />
    </Icon>
  ),
  tugas: (
    <Icon>
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="m9 12 2 2 4-4" />
    </Icon>
  ),
  kelola: (
    <Icon>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" />
    </Icon>
  ),
  profil: (
    <Icon>
      <circle cx="12" cy="8" r="3" />
      <path d="M5 19a7 7 0 0 1 14 0" />
    </Icon>
  ),
}

const itemClass = (aktif) =>
  `relative flex min-h-14 w-full flex-col items-center justify-center gap-0.5 px-1 py-2 text-[11px] font-medium transition-colors ${
    aktif ? 'text-chalk' : 'text-pencil hover:text-ink'
  }`

function Penanda({ aktif }) {
  return aktif ? (
    <span className="absolute inset-x-0 top-0 mx-auto h-0.5 w-8 rounded-full bg-chalk" />
  ) : null
}

// Menu navigasi bawah, hanya tampil di layar kecil (di bawah breakpoint md).
export default function BottomNav() {
  const { kelasId, role } = useKelas()
  const { pathname } = useLocation()
  const [kelolaTerbuka, setKelolaTerbuka] = useState(false)

  const isKetua = role === ROLE.KETUA

  // Panel "Kelola" ikut tertutup setiap pindah halaman
  useEffect(() => {
    setKelolaTerbuka(false)
  }, [pathname])

  // Tombol Escape menutup panel
  useEffect(() => {
    if (!kelolaTerbuka) return
    const tutupDenganEscape = (e) => e.key === 'Escape' && setKelolaTerbuka(false)
    document.addEventListener('keydown', tutupDenganEscape)
    return () => document.removeEventListener('keydown', tutupDenganEscape)
  }, [kelolaTerbuka])

  const menuUtama = [
    { label: 'Beranda', to: ROUTES.DASHBOARD, ikon: ICONS.beranda },
    { label: 'Pengumuman', to: pengumumanPath(kelasId), ikon: ICONS.pengumuman },
    { label: 'Jadwal', to: jadwalPath(kelasId), ikon: ICONS.jadwal },
    { label: 'Tugas', to: tugasPath(kelasId), ikon: ICONS.tugas },
    { label: 'Profil', to: ROUTES.PROFIL, ikon: ICONS.profil },
  ]

  // Semua isi menu Kelola khusus ketua (mapel & anggota)
  const menuKelola = [
    { label: 'Mata pelajaran', to: mapelPath(kelasId) },
    { label: 'Anggota kelas', to: kelolaAnggotaPath(kelasId) },
  ]
  const kelolaAktif = menuKelola.some((m) => pathname === m.to)

  return (
    <>
      {kelolaTerbuka && (
        <div
          className="fixed inset-0 z-30 bg-ink/30 md:hidden"
          onClick={() => setKelolaTerbuka(false)}
          aria-hidden="true"
        />
      )}

      <nav
        aria-label="Menu utama"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        {kelolaTerbuka && (
          <div
            id="panel-kelola"
            role="dialog"
            aria-label="Menu kelola"
            className="absolute inset-x-0 bottom-full mx-3 mb-2 rounded-md border border-line bg-paper p-1 shadow-lg"
          >
            {menuKelola.map((m) => (
              <NavLink
                key={m.to}
                to={m.to}
                className={({ isActive }) =>
                  `block rounded px-4 py-3 text-sm font-medium ${
                    isActive ? 'bg-chalk/10 text-chalk' : 'text-ink hover:bg-line/40'
                  }`
                }
              >
                {m.label}
              </NavLink>
            ))}
          </div>
        )}

        <ul className="mx-auto flex max-w-2xl">
          {menuUtama.map((m) => (
            <li key={m.to} className="flex-1">
              <NavLink to={m.to} end className={({ isActive }) => itemClass(isActive)}>
                {({ isActive }) => (
                  <>
                    <Penanda aktif={isActive} />
                    {m.ikon}
                    <span>{m.label}</span>
                  </>
                )}
              </NavLink>
            </li>
          ))}

          {isKetua && (
            <li className="flex-1">
              <button
                type="button"
                className={itemClass(kelolaAktif || kelolaTerbuka)}
                aria-expanded={kelolaTerbuka}
                aria-controls="panel-kelola"
                onClick={() => setKelolaTerbuka((buka) => !buka)}
              >
                <Penanda aktif={kelolaAktif || kelolaTerbuka} />
                {ICONS.kelola}
                <span>Kelola</span>
              </button>
            </li>
          )}
        </ul>
      </nav>
    </>
  )
}
