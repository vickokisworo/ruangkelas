import { supabase } from '@/lib/supabase'
import { LAMPIRAN_BUCKET, MAX_LAMPIRAN_PER_ITEM } from '@/config/constants'
import { kompresGambar, validasiBerkas } from '@/utils/lampiran'

function namaAman(nama) {
  return nama.replace(/[^\w.\-]+/g, '_').slice(0, 80)
}

export const lampiranService = {
  async unggah({ file, kelasId, pengumumanId, tugasId, jumlahSekarang = 0 }) {
    const berkas = await kompresGambar(file)
    const pesan = validasiBerkas(berkas, jumlahSekarang)
    if (pesan) return { error: { message: pesan } }

    const folder = pengumumanId ? 'pengumuman' : 'tugas'
    const pemilikId = pengumumanId ?? tugasId
    const path = `${kelasId}/${folder}/${pemilikId}/${crypto.randomUUID()}-${namaAman(berkas.name)}`

    const { error: unggahError } = await supabase.storage.from(LAMPIRAN_BUCKET).upload(path, berkas, {
      contentType: berkas.type || undefined,
      upsert: false,
    })
    if (unggahError) {
      if (unggahError.message?.toLowerCase().includes('exceeded')) {
        return { error: { message: 'Berkas melebihi batas ukuran.' } }
      }
      return { error: { message: unggahError.message } }
    }

    const { error: simpanError } = await supabase.from('lampiran').insert({
      kelas_id: kelasId,
      pengumuman_id: pengumumanId ?? null,
      tugas_id: tugasId ?? null,
      storage_path: path,
      nama_file: berkas.name,
      mime_type: berkas.type || 'application/octet-stream',
      ukuran: berkas.size,
    })

    if (simpanError) {
      await supabase.storage.from(LAMPIRAN_BUCKET).remove([path])
      if (simpanError.message?.includes('Maksimal')) {
        return { error: { message: `Maksimal ${MAX_LAMPIRAN_PER_ITEM} lampiran.` } }
      }
      return { error: simpanError }
    }

    return { error: null }
  },

  async unggahBanyak({ files, kelasId, pengumumanId, tugasId }) {
    const daftar = Array.from(files ?? [])
    for (let i = 0; i < daftar.length; i += 1) {
      const { error } = await this.unggah({
        file: daftar[i],
        kelasId,
        pengumumanId,
        tugasId,
        jumlahSekarang: i,
      })
      if (error) return { error }
    }
    return { error: null }
  },

  async hapus(lampiran) {
    const { error } = await supabase.from('lampiran').delete().eq('id', lampiran.id)
    if (error) return { error }
    if (lampiran.storage_path) {
      await supabase.storage.from(LAMPIRAN_BUCKET).remove([lampiran.storage_path])
    }
    return { error: null }
  },

  async hapusSemua(daftar) {
    if (!daftar?.length) return { error: null }
    const ids = daftar.map((l) => l.id)
    const paths = daftar.map((l) => l.storage_path).filter(Boolean)
    const { error } = await supabase.from('lampiran').delete().in('id', ids)
    if (error) return { error }
    if (paths.length) await supabase.storage.from(LAMPIRAN_BUCKET).remove(paths)
    return { error: null }
  },

  async urlUnduh(storagePath) {
    const { data, error } = await supabase.storage
      .from(LAMPIRAN_BUCKET)
      .createSignedUrl(storagePath, 60 * 60)
    if (error) return null
    return data?.signedUrl ?? null
  },
}
