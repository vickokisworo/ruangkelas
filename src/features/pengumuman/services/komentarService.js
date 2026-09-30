import { supabase } from '@/lib/supabase'
import { MAX_KOMENTAR_PANJANG } from '@/config/constants'

export const komentarService = {
  async tambahKomentar({ kelasId, pengumumanId, penulisId, isi, parentId }) {
    const teks = (isi ?? '').trim()
    if (!teks) return { error: { message: 'Komentar tidak boleh kosong.' } }
    if (teks.length > MAX_KOMENTAR_PANJANG) {
      return { error: { message: `Komentar maksimal ${MAX_KOMENTAR_PANJANG} karakter.` } }
    }

    const baris = {
      kelas_id: kelasId,
      pengumuman_id: pengumumanId,
      penulis_id: penulisId,
      isi: teks,
    }
    const denganParent = await supabase
      .from('pengumuman_komentar')
      .insert({ ...baris, parent_id: parentId || null })
    if (!denganParent.error) return { error: null }

    if (parentId) {
      return {
        error: {
          message: 'Fitur balasan belum aktif. Jalankan supabase/migrasi_komentar.sql di Supabase.',
        },
      }
    }

    const tanpaParent = await supabase.from('pengumuman_komentar').insert(baris)
    if (tanpaParent.error) {
      return {
        error: {
          message: 'Tabel komentar belum ada. Jalankan supabase/migrasi_komentar.sql di Supabase.',
        },
      }
    }
    return { error: null }
  },

  async hapusKomentar(id) {
    const { error } = await supabase.from('pengumuman_komentar').delete().eq('id', id)
    return { error }
  },

  async toggleSuka({ komentarId, kelasId, userId, sudahSuka }) {
    if (sudahSuka) {
      const { error } = await supabase
        .from('pengumuman_komentar_suka')
        .delete()
        .eq('komentar_id', komentarId)
        .eq('user_id', userId)
      return { error }
    }

    const { error } = await supabase.from('pengumuman_komentar_suka').insert({
      komentar_id: komentarId,
      kelas_id: kelasId,
      user_id: userId,
    })
    return { error }
  },
}
