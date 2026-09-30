import { supabase } from '@/lib/supabase'

// PostgREST bisa mengembalikan relasi one-to-one sebagai objek atau array,
// tergantung versi — normalkan supaya aman dua-duanya.
const ambilPolling = (p) => (Array.isArray(p.polling) ? p.polling[0] : p.polling) ?? null

async function muatLampiran(pengumumanIds) {
  if (!pengumumanIds.length) return []
  const { data, error } = await supabase
    .from('lampiran')
    .select('id, pengumuman_id, nama_file, mime_type, ukuran, storage_path')
    .in('pengumuman_id', pengumumanIds)
  if (error) return []
  return data ?? []
}

async function muatKomentar(kelasId) {
  const lengkap = await supabase
    .from('pengumuman_komentar')
    .select(
      'id, isi, penulis_id, parent_id, pengumuman_id, created_at, penulis:penulis_id (nama)',
    )
    .eq('kelas_id', kelasId)
    .order('created_at', { ascending: true })

  if (!lengkap.error) return lengkap.data ?? []

  const dasar = await supabase
    .from('pengumuman_komentar')
    .select('id, isi, penulis_id, pengumuman_id, created_at, penulis:penulis_id (nama)')
    .eq('kelas_id', kelasId)
    .order('created_at', { ascending: true })

  if (dasar.error) return []
  return (dasar.data ?? []).map((k) => ({ ...k, parent_id: null }))
}

async function muatSuka(kelasId) {
  const { data, error } = await supabase
    .from('pengumuman_komentar_suka')
    .select('komentar_id, user_id')
    .eq('kelas_id', kelasId)
  if (error) return []
  return data ?? []
}

export const pengumumanService = {
  async listPengumuman(kelasId) {
    const { data, error } = await supabase
      .from('pengumuman')
      .select(
        `id, isi, pinned, penulis_id, created_at,
         penulis:penulis_id (nama),
         polling (id, ditutup, opsi:polling_opsi (id, teks, urutan))`,
      )
      .eq('kelas_id', kelasId)
      .order('pinned', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) return { data: null, error }

    const daftar = data ?? []
    const pengumumanIds = daftar.map((p) => p.id)
    const pollingIds = daftar.map((p) => ambilPolling(p)?.id).filter(Boolean)

    const [lampiran, komentarMentah, suka, hasilRes, suaraRes] = await Promise.all([
      muatLampiran(pengumumanIds),
      muatKomentar(kelasId),
      muatSuka(kelasId),
      pollingIds.length
        ? supabase.rpc('hasil_polling_kelas', { p_kelas_id: kelasId })
        : Promise.resolve({ data: [], error: null }),
      pollingIds.length
        ? supabase.from('polling_suara').select('polling_id, opsi_id').in('polling_id', pollingIds)
        : Promise.resolve({ data: [], error: null }),
    ])

    const hasil = hasilRes.error ? [] : (hasilRes.data ?? [])
    const suaraSaya = suaraRes.error ? [] : (suaraRes.data ?? [])
    const jumlahPerOpsi = new Map(hasil.map((h) => [h.opsi_id, Number(h.jumlah)]))
    const suaraPerPolling = new Map(suaraSaya.map((s) => [s.polling_id, s.opsi_id]))

    const sukaPerKomentar = new Map()
    for (const s of suka) {
      const list = sukaPerKomentar.get(s.komentar_id) ?? []
      list.push(s.user_id)
      sukaPerKomentar.set(s.komentar_id, list)
    }

    const komentarPerPengumuman = new Map()
    for (const k of komentarMentah) {
      const pemilihSuka = sukaPerKomentar.get(k.id) ?? []
      const item = {
        ...k,
        jumlahSuka: pemilihSuka.length,
        pemilihSuka,
      }
      const list = komentarPerPengumuman.get(k.pengumuman_id) ?? []
      list.push(item)
      komentarPerPengumuman.set(k.pengumuman_id, list)
    }

    const lampiranPerPengumuman = new Map()
    for (const l of lampiran) {
      const list = lampiranPerPengumuman.get(l.pengumuman_id) ?? []
      list.push(l)
      lampiranPerPengumuman.set(l.pengumuman_id, list)
    }

    const hasilAkhir = daftar.map((p) => {
      const polling = ambilPolling(p)
      const dasar = {
        ...p,
        lampiran: lampiranPerPengumuman.get(p.id) ?? [],
        komentar: komentarPerPengumuman.get(p.id) ?? [],
      }

      if (!polling) return { ...dasar, polling: null }

      const opsi = [...(polling.opsi ?? [])]
        .sort((a, b) => a.urutan - b.urutan)
        .map((o) => ({ id: o.id, teks: o.teks, jumlah: jumlahPerOpsi.get(o.id) ?? 0 }))

      return {
        ...dasar,
        polling: {
          id: polling.id,
          ditutup: polling.ditutup,
          opsi,
          totalSuara: opsi.reduce((total, o) => total + o.jumlah, 0),
          suaraSaya: suaraPerPolling.get(polling.id) ?? null,
        },
      }
    })

    return { data: hasilAkhir, error: null }
  },

  // opsi (opsional): array teks pilihan. Kalau diisi, pengumuman + polling dibuat
  // atomik lewat fungsi database (gagal = tidak ada yang tersimpan).
  async tambahPengumuman({ kelasId, penulisId, isi, opsi }) {
    if (opsi && opsi.length > 0) {
      const { data, error } = await supabase.rpc('buat_pengumuman_dengan_polling', {
        p_kelas_id: kelasId,
        p_isi: isi,
        p_opsi: opsi,
      })
      return { data: data ?? null, error }
    }

    const { data, error } = await supabase
      .from('pengumuman')
      .insert({ kelas_id: kelasId, penulis_id: penulisId, isi: isi.trim() })
      .select('id')
      .single()
    return { data: data?.id ?? null, error }
  },

  async editPengumuman({ id, isi }) {
    const { error } = await supabase.from('pengumuman').update({ isi: isi.trim() }).eq('id', id)
    return { error }
  },

  async togglePin(id, pinned) {
    const { error } = await supabase.from('pengumuman').update({ pinned }).eq('id', id)
    return { error }
  },

  async hapusPengumuman(id) {
    const { error } = await supabase.from('pengumuman').delete().eq('id', id)
    return { error }
  },

  async beriSuara({ pollingId, opsiId }) {
    const { error } = await supabase.rpc('beri_suara', {
      p_polling_id: pollingId,
      p_opsi_id: opsiId,
    })
    return { error }
  },

  async setPollingDitutup({ pollingId, ditutup }) {
    const { error } = await supabase.from('polling').update({ ditutup }).eq('id', pollingId)
    return { error }
  },
}
