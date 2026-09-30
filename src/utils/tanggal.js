// Semua fungsi memakai tanggal LOKAL (bukan UTC). Deadline tugas disimpan sebagai tanggal
// tanpa jam ('2026-09-30'), jadi "hari ini" harus dihitung menurut zona waktu pengguna.
// (toISOString() memakai UTC dan membuat hari terasa "telat" beberapa jam untuk WIB.)

const dua = (n) => String(n).padStart(2, '0')

export function hariIniLokal(sekarang = new Date()) {
  return `${sekarang.getFullYear()}-${dua(sekarang.getMonth() + 1)}-${dua(sekarang.getDate())}`
}

// Selisih hari kalender: deadline - hari ini. Negatif = sudah lewat, 0 = hari ini.
export function selisihHari(deadline, sekarang = new Date()) {
  const [y, m, d] = deadline.split('-').map(Number)
  const [ty, tm, td] = hariIniLokal(sekarang).split('-').map(Number)
  // Date.UTC dipakai murni untuk aritmetika kalender (bebas efek jam musim panas)
  return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(ty, tm - 1, td)) / 86400000)
}

export function tambahHari(tanggal, jumlah) {
  const [y, m, d] = tanggal.split('-').map(Number)
  const hasil = new Date(Date.UTC(y, m - 1, d + jumlah))
  return `${hasil.getUTCFullYear()}-${dua(hasil.getUTCMonth() + 1)}-${dua(hasil.getUTCDate())}`
}

export function labelTenggat(deadline, sekarang = new Date()) {
  const selisih = selisihHari(deadline, sekarang)
  if (selisih < 0) return `Terlambat ${Math.abs(selisih)} hari`
  if (selisih === 0) return 'Hari ini'
  if (selisih === 1) return 'Besok'
  return `${selisih} hari lagi`
}
