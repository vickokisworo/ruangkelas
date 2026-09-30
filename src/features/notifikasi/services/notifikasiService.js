import { supabase } from '@/lib/supabase'

export const notifikasiService = {
  async sinkronDeadline() {
    const { error } = await supabase.rpc('sinkron_notifikasi_deadline')
    return { error }
  },

  async listNotifikasi() {
    await supabase.rpc('bersih_notifikasi_saya')
    const { data, error } = await supabase
      .from('notifikasi')
      .select('id, jenis, judul, isi, tautan, dibaca, created_at')
      .order('created_at', { ascending: false })
      .limit(30)
    return { data: data ?? [], error }
  },

  async tandaiDibaca(id) {
    const { error } = await supabase.from('notifikasi').update({ dibaca: true }).eq('id', id)
    return { error }
  },

  async tandaiSemua() {
    const { error } = await supabase
      .from('notifikasi')
      .update({ dibaca: true })
      .eq('dibaca', false)
    return { error }
  },
}

export function teksBagikan(daftar) {
  const belum = daftar.filter((n) => !n.dibaca)
  const sumber = belum.length ? belum : daftar.slice(0, 5)
  if (!sumber.length) return 'Tidak ada pengingat di RuangKelas saat ini.'

  const baris = sumber.map((n) => `• ${n.judul}${n.isi ? `: ${n.isi}` : ''}`)
  return `Pengingat RuangKelas\n${baris.join('\n')}`
}
