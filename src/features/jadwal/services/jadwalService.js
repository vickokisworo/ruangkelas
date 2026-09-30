import { supabase } from '@/lib/supabase'

export const jadwalService = {
  async listJadwal(kelasId) {
    return supabase
      .from('jadwal')
      .select('id, hari, jam_ke, mapel:mapel_id (id, nama_mapel)')
      .eq('kelas_id', kelasId)
      .order('jam_ke', { ascending: true })
  },

  async tambahSlot({ kelasId, hari, jamKe, mapelId }) {
    const { error } = await supabase
      .from('jadwal')
      .insert({ kelas_id: kelasId, hari, jam_ke: jamKe, mapel_id: mapelId })

    if (error?.code === '23505') {
      return { error: { message: `Jam ke-${jamKe} di hari ${hari} sudah terisi mapel lain.` } }
    }
    return { error }
  },

  async editSlot({ id, hari, jamKe, mapelId }) {
    const { error } = await supabase
      .from('jadwal')
      .update({ hari, jam_ke: jamKe, mapel_id: mapelId })
      .eq('id', id)

    if (error?.code === '23505') {
      return { error: { message: `Jam ke-${jamKe} di hari ${hari} sudah terisi mapel lain.` } }
    }
    return { error }
  },

  async hapusSlot(id) {
    const { error } = await supabase.from('jadwal').delete().eq('id', id)
    return { error }
  },
}
