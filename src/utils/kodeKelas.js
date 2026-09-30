import { KODE_KELAS_LENGTH } from '@/config/constants'

// Tanpa karakter yang gampang tertukar saat dibaca manual: I, O, 0, 1
const SAFE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function generateKodeKelas() {
  let kode = ''
  for (let i = 0; i < KODE_KELAS_LENGTH; i++) {
    kode += SAFE_CHARS[Math.floor(Math.random() * SAFE_CHARS.length)]
  }
  return kode
}
