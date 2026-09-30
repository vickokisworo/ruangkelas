import { supabase } from '@/lib/supabase'
import { hariIniLokal, tambahHari } from '@/utils/tanggal'

// Tugas yang dianggap "mendesak": terlambat, atau jatuh tempo dalam sekian hari ke depan
const BATAS_HARI_MENDESAK = 2

export const dashboardService = {
  async getKelasUser(userId) {
    return supabase
      .from('kelas_members')
      .select('role, kelas:kelas_id (id, nama_kelas, kode_unik, max_anggota)')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle()
  },

  // Ringkasan "perlu perhatian". Tiap bagian independen: kalau satu query gagal,
  // bagian lain tetap dikembalikan (bagian yang gagal jadi array kosong).
  async getRingkasan(kelasId, userId) {
    const batas = tambahHari(hariIniLokal(), BATAS_HARI_MENDESAK)

    const [tugasRes, pinRes, pollingRes, suaraRes, progressRes] = await Promise.all([
      supabase
        .from('tugas')
        .select('id, judul, deadline, mapel:mapel_id (nama_mapel)')
        .eq('kelas_id', kelasId)
        .not('deadline', 'is', null)
        .lte('deadline', batas)
        .order('deadline', { ascending: true }),
      supabase
        .from('pengumuman')
        .select('id, isi')
        .eq('kelas_id', kelasId)
        .eq('pinned', true)
        .order('created_at', { ascending: false })
        .limit(2),
      supabase
        .from('polling')
        .select('id, pengumuman:pengumuman_id (isi)')
        .eq('kelas_id', kelasId)
        .eq('ditutup', false),
      // RLS: hanya suara milik user yang sedang login yang terbaca
      supabase.from('polling_suara').select('polling_id'),
      supabase
        .from('tugas_progress')
        .select('tugas_id')
        .eq('kelas_id', kelasId)
        .eq('user_id', userId),
    ])

    const sudahSelesai = new Set((progressRes?.data ?? []).map((p) => p.tugas_id))
    const tugasMendesak = (tugasRes.data ?? []).filter((t) => !sudahSelesai.has(t.id)).slice(0, 5)

    const sudahMemilih = new Set((suaraRes.data ?? []).map((s) => s.polling_id))
    const pollingBelumDiisi = (pollingRes.data ?? [])
      .filter((p) => !sudahMemilih.has(p.id))
      .map((p) => ({ id: p.id, isi: p.pengumuman?.isi ?? '' }))

    return {
      tugas: tugasMendesak,
      pinned: pinRes.data ?? [],
      pollingBelumDiisi,
    }
  },
}
