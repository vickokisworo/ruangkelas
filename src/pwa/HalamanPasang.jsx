import { useEffect, useState } from 'react'
import { Logo } from '@/components/ui'
import { onBisaPasang, pasangAplikasi, sudahTerpasang } from '@/pwa/pwa'

function iphone() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

export default function HalamanPasang() {
  const [bisaPasang, setBisaPasang] = useState(false)
  const [terpasang, setTerpasang] = useState(sudahTerpasang())

  useEffect(() => onBisaPasang(() => setBisaPasang(true)), [])

  const pasang = async () => {
    const berhasil = await pasangAplikasi()
    if (berhasil) setTerpasang(true)
  }

  return (
    <main className="flex min-h-dvh items-center justify-center px-5 py-10">
      <section className="w-full max-w-sm text-center">
        <Logo className="mx-auto mb-6" />
        <h1 className="text-xl font-semibold text-ink">Pasang Ruang Kelas</h1>
        <p className="mt-2 text-sm text-pencil">
          Situs ini hanya untuk memasang aplikasi. Kelas, tugas, dan notifikasi dipakai dari ikon di layar utama.
        </p>

        {terpasang ? (
          <p className="mt-6 text-sm text-chalk">Sudah terpasang. Buka dari ikon Ruang Kelas.</p>
        ) : bisaPasang ? (
          <button
            type="button"
            className="mt-6 w-full rounded-md bg-chalk px-4 py-3 text-sm font-medium text-paper"
            onClick={pasang}
          >
            Pasang aplikasi
          </button>
        ) : iphone() ? (
          <ol className="mt-6 space-y-2 text-left text-sm text-ink">
            <li>1. Ketuk tombol Bagikan di Safari.</li>
            <li>2. Pilih Tambahkan ke Layar Utama.</li>
            <li>3. Buka Ruang Kelas dari ikon itu.</li>
          </ol>
        ) : (
          <ol className="mt-6 space-y-2 text-left text-sm text-ink">
            <li>1. Buka menu browser.</li>
            <li>2. Pilih Pasang aplikasi atau Tambahkan ke layar utama.</li>
            <li>3. Buka Ruang Kelas dari ikon itu.</li>
          </ol>
        )}
      </section>
    </main>
  )
}
