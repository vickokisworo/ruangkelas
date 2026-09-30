import { supabase } from '@/lib/supabase'

export const mapelService = {
  async listMapel(kelasId) {
    return supabase
      .from('mapel')
      .select('id, nama_mapel, created_at')
      .eq('kelas_id', kelasId)
      .order('nama_mapel', { ascending: true })
  },

  async tambahMapel({ kelasId, namaMapel }) {
    const { error } = await supabase
      .from('mapel')
      .insert({ kelas_id: kelasId, nama_mapel: namaMapel.trim() })

    if (error?.code === '23505') {
      return { error: { message: 'Mapel dengan nama ini sudah ada di kelas.' } }
    }
    return { error }
  },

  async editMapel({ id, namaMapel }) {
    const { error } = await supabase
      .from('mapel')
      .update({ nama_mapel: namaMapel.trim() })
      .eq('id', id)

    if (error?.code === '23505') {
      return { error: { message: 'Mapel dengan nama ini sudah ada di kelas.' } }
    }
    return { error }
  },

  async hapusMapel(id) {
    const { error } = await supabase.from('mapel').delete().eq('id', id)
    return { error }
  },
}
