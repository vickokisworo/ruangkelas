import { supabase } from '@/lib/supabase'
import { ROLE } from '@/config/constants'

export const anggotaService = {
  async listAnggota(kelasId) {
    return supabase
      .from('kelas_members')
      .select('id, role, joined_at, user_id, user:user_id (id, nama)')
      .eq('kelas_id', kelasId)
      .order('role', { ascending: true })
  },

  async getAnggota(kelasId, userId) {
    return supabase
      .from('kelas_members')
      .select('id, role, joined_at, user_id, user:user_id (id, nama)')
      .eq('kelas_id', kelasId)
      .eq('user_id', userId)
      .maybeSingle()
  },

  async jumlahWakil(kelasId) {
    const { count, error } = await supabase
      .from('kelas_members')
      .select('id', { count: 'exact', head: true })
      .eq('kelas_id', kelasId)
      .eq('role', ROLE.WAKIL_KETUA)
    return { count: count ?? 0, error }
  },

  async jadikanWakilKetua(memberId) {
    const { error } = await supabase
      .from('kelas_members')
      .update({ role: ROLE.WAKIL_KETUA })
      .eq('id', memberId)

    if (error?.message?.includes('maksimal')) {
      return { error: { message: 'Kelas ini sudah punya 5 wakil ketua, maksimal tercapai.' } }
    }
    return { error }
  },

  async turunkanKeAnggota(memberId) {
    const { error } = await supabase
      .from('kelas_members')
      .update({ role: ROLE.ANGGOTA })
      .eq('id', memberId)
    return { error }
  },

  async keluarkanAnggota(memberId) {
    const { error } = await supabase.from('kelas_members').delete().eq('id', memberId)
    return { error }
  },

  async serahKetua(kelasId, memberId) {
    const { error } = await supabase.rpc('serah_ketua', {
      p_kelas_id: kelasId,
      p_member_id: memberId,
    })
    if (error?.message?.includes('menyerahkan')) {
      return { error: { message: error.message } }
    }
    return { error }
  },

  async getPengaturanKelas(kelasId) {
    return supabase.from('kelas').select('id, nama_kelas, max_anggota').eq('id', kelasId).single()
  },

  async setMaxAnggota(kelasId, maxAnggota) {
    const { error } = await supabase
      .from('kelas')
      .update({ max_anggota: maxAnggota })
      .eq('id', kelasId)

    if (error?.message?.includes('lebih kecil')) {
      return {
        error: { message: 'Batas anggota tidak boleh lebih kecil dari jumlah anggota sekarang.' },
      }
    }
    return { error }
  },
}
