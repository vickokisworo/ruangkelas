import { supabase } from '@/lib/supabase'
import { ROLE } from '@/config/constants'
import { generateKodeKelas } from '@/utils/kodeKelas'

export const kelasService = {
  async buatKelas({ namaKelas, adminId }) {
    const kode = generateKodeKelas()

    const { data: kelas, error: kelasError } = await supabase
      .from('kelas')
      .insert({ nama_kelas: namaKelas, kode_unik: kode, admin_id: adminId })
      .select()
      .single()

    if (kelasError) return { data: null, error: kelasError }

    const { error: memberError } = await supabase
      .from('kelas_members')
      .insert({ kelas_id: kelas.id, user_id: adminId, role: ROLE.KETUA })

    if (memberError) return { data: null, error: memberError }

    return { data: kelas, error: null }
  },

  async gabungKelas({ kode, userId }) {
    const { data: kelas, error: findError } = await supabase
      .from('kelas')
      .select('id')
      .eq('kode_unik', kode.toUpperCase().trim())
      .single()

    if (findError || !kelas) {
      return { data: null, error: { message: 'Kode kelas tidak ditemukan.' } }
    }

    const { error: joinError } = await supabase
      .from('kelas_members')
      .insert({ kelas_id: kelas.id, user_id: userId, role: ROLE.ANGGOTA })

    if (joinError) {
      const pesan = joinError.message ?? ''
      if (pesan.includes('penuh') || pesan.includes('Batas anggota')) {
        return { data: null, error: { message: 'Kelas ini sudah penuh. Batas anggota tercapai.' } }
      }
      return {
        data: null,
        error: { message: 'Gagal gabung kelas. Mungkin kamu sudah jadi anggota.' },
      }
    }

    return { data: kelas, error: null }
  },
}
