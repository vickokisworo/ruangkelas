export const ROUTES = {
  HOME: '/',
  LOGIN: '/masuk',
  REGISTER: '/daftar',
  MULAI_KELAS: '/kelas/mulai',
  DASHBOARD: '/dashboard',
  KELOLA_ANGGOTA: '/kelas/:kelasId/anggota',
  MAPEL: '/kelas/:kelasId/mapel',
  JADWAL: '/kelas/:kelasId/jadwal',
  TUGAS: '/kelas/:kelasId/tugas',
  PENGUMUMAN: '/kelas/:kelasId/pengumuman',
}

export const kelolaAnggotaPath = (kelasId) => `/kelas/${kelasId}/anggota`
export const mapelPath = (kelasId) => `/kelas/${kelasId}/mapel`
export const jadwalPath = (kelasId) => `/kelas/${kelasId}/jadwal`
export const tugasPath = (kelasId) => `/kelas/${kelasId}/tugas`
export const pengumumanPath = (kelasId) => `/kelas/${kelasId}/pengumuman`
