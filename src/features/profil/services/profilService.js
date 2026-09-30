import { supabase } from '@/lib/supabase'

export const profilService = {
  async getProfil(userId) {
    return supabase.from('users').select('id, nama, email').eq('id', userId).single()
  },

  async updateNama(userId, nama) {
    const teks = (nama ?? '').trim()
    if (!teks) return { error: { message: 'Nama tidak boleh kosong.' } }
    if (teks.length > 80) return { error: { message: 'Nama maksimal 80 karakter.' } }

    const { error } = await supabase.from('users').update({ nama: teks }).eq('id', userId)
    if (error) return { error }

    await supabase.auth.updateUser({ data: { nama: teks } })
    return { error: null }
  },
}
