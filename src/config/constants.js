export const APP_NAME = 'RuangKelas'

export const HARI_SEKOLAH = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu']

export const ROLE = {
  KETUA: 'ketua',
  WAKIL_KETUA: 'wakil_ketua',
  ANGGOTA: 'anggota',
}

export const ROLE_LABEL = {
  [ROLE.KETUA]: 'Ketua Kelas',
  [ROLE.WAKIL_KETUA]: 'Wakil Ketua',
  [ROLE.ANGGOTA]: 'Anggota',
}

// Role yang boleh kelola pengumuman/jadwal (ketua dan wakil ketua)
export const PENGURUS_ROLES = [ROLE.KETUA, ROLE.WAKIL_KETUA]

export const MAX_WAKIL_KETUA = 5

export const KODE_KELAS_LENGTH = 6

export const POLLING_MIN_OPSI = 2
export const POLLING_MAX_OPSI = 6

export const MAX_KOMENTAR_PANJANG = 500

// Batas anggota per kelas (ketua bisa ubah kapan saja, tidak boleh di bawah jumlah sekarang)
export const DEFAULT_MAX_ANGGOTA = 40
export const MIN_MAX_ANGGOTA = 1
export const ABSOLUT_MAX_ANGGOTA = 80

export const LAMPIRAN_BUCKET = 'lampiran'
export const MAX_LAMPIRAN_PER_ITEM = 5
export const MAX_UKURAN_LAMPIRAN = 5 * 1024 * 1024 // 5 MB, ditegakkan juga di bucket Storage

export const LAMPIRAN_MIME_DIIZINKAN = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
]
