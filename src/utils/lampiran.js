import {
  LAMPIRAN_MIME_DIIZINKAN,
  MAX_LAMPIRAN_PER_ITEM,
  MAX_UKURAN_LAMPIRAN,
} from '@/config/constants'

export function formatUkuran(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function isGambar(mime) {
  return typeof mime === 'string' && mime.startsWith('image/')
}

export async function kompresGambar(file) {
  if (!isGambar(file.type) || file.type === 'image/gif') return file
  const bitmap = await createImageBitmap(file).catch(() => null)
  if (!bitmap) return file

  const batas = 1600
  const skala = Math.min(1, batas / Math.max(bitmap.width, bitmap.height))
  const lebar = Math.max(1, Math.round(bitmap.width * skala))
  const tinggi = Math.max(1, Math.round(bitmap.height * skala))
  const kanvas = document.createElement('canvas')
  kanvas.width = lebar
  kanvas.height = tinggi
  kanvas.getContext('2d').drawImage(bitmap, 0, 0, lebar, tinggi)
  bitmap.close?.()

  const blob = await new Promise((selesai) => kanvas.toBlob(selesai, 'image/jpeg', 0.75))
  if (!blob || blob.size >= file.size) return file
  const nama = file.name.replace(/\.\w+$/, '') + '.jpg'
  return new File([blob], nama, { type: 'image/jpeg', lastModified: Date.now() })
}

export function validasiBerkas(file, jumlahSekarang = 0) {
  if (!file) return 'Pilih berkas dulu.'
  if (jumlahSekarang >= MAX_LAMPIRAN_PER_ITEM) {
    return `Maksimal ${MAX_LAMPIRAN_PER_ITEM} lampiran.`
  }
  if (file.size > MAX_UKURAN_LAMPIRAN) {
    return `${file.name} terlalu besar. Maksimal ${formatUkuran(MAX_UKURAN_LAMPIRAN)} per berkas.`
  }
  if (file.type && !LAMPIRAN_MIME_DIIZINKAN.includes(file.type)) {
    return `${file.name} jenisnya tidak didukung. Unggah gambar, PDF, atau dokumen Office.`
  }
  return null
}

export function validasiDaftarBerkas(files, jumlahSekarang = 0) {
  const daftar = Array.from(files ?? [])
  if (jumlahSekarang + daftar.length > MAX_LAMPIRAN_PER_ITEM) {
    return `Maksimal ${MAX_LAMPIRAN_PER_ITEM} lampiran.`
  }
  for (const file of daftar) {
    const pesan = validasiBerkas(file, jumlahSekarang)
    if (pesan) return pesan
  }
  return null
}
