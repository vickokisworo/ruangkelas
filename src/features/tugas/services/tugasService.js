import { supabase } from '@/lib/supabase'

function normalkanTugas(baris, userId) {
  const progress = baris.progress ?? []
  const selesaiSaya = progress.some((p) => p.user_id === userId)
  return {
    ...baris,
    selesai: selesaiSaya,
    jumlahSelesai: progress.length,
  }
}

export const tugasService = {
  async listTugas(kelasId, userId) {
    const { data, error } = await supabase
      .from('tugas')
      .select(
        'id, judul, deadline, penulis_id, created_at, mapel:mapel_id (id, nama_mapel), penulis:penulis_id (nama), lampiran (id, nama_file, mime_type, ukuran, storage_path), progress:tugas_progress (user_id)',
      )
      .eq('kelas_id', kelasId)
      .order('created_at', { ascending: false })

    if (error) {
      const cadangan = await supabase
        .from('tugas')
        .select(
          'id, judul, deadline, penulis_id, created_at, mapel:mapel_id (id, nama_mapel), penulis:penulis_id (nama), lampiran (id, nama_file, mime_type, ukuran, storage_path)',
        )
        .eq('kelas_id', kelasId)
        .order('created_at', { ascending: false })
      if (cadangan.error) return cadangan
      const daftar = (cadangan.data ?? []).map((t) => ({ ...t, selesai: false, jumlahSelesai: 0 }))
      return { data: daftar, error: null }
    }

    const daftar = (data ?? []).map((t) => normalkanTugas(t, userId))
    daftar.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    return { data: daftar, error: null }
  },

  async tambahTugas({ kelasId, penulisId, judul, deadline, mapelId }) {
    const { data, error } = await supabase
      .from('tugas')
      .insert({
        kelas_id: kelasId,
        penulis_id: penulisId,
        judul: judul.trim(),
        deadline: deadline || null,
        mapel_id: mapelId || null,
      })
      .select('id')
      .single()
    return { data: data?.id ?? null, error }
  },

  async editTugas({ id, judul, deadline, mapelId }) {
    const { error } = await supabase
      .from('tugas')
      .update({ judul: judul.trim(), deadline: deadline || null, mapel_id: mapelId || null })
      .eq('id', id)
    return { error }
  },

  async toggleSelesai({ tugasId, kelasId, userId, selesai }) {
    if (selesai) {
      const { error } = await supabase.from('tugas_progress').upsert(
        { tugas_id: tugasId, kelas_id: kelasId, user_id: userId },
        { onConflict: 'tugas_id,user_id' },
      )
      return { error }
    }

    const { error } = await supabase
      .from('tugas_progress')
      .delete()
      .eq('tugas_id', tugasId)
      .eq('user_id', userId)
    return { error }
  },

  async hapusTugas(id) {
    const { error } = await supabase.from('tugas').delete().eq('id', id)
    return { error }
  },
}
