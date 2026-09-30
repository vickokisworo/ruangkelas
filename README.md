# RuangKelas

Platform pengumuman, jadwal, dan tugas khusus untuk satu kelas SMA — tanpa chat personal, tanpa noise.

## Setup

### 1. Bikin project Supabase
1. Daftar/masuk ke [supabase.com](https://supabase.com), buat project baru (pilih region Singapore biar dekat).
2. Buka **SQL Editor** → New Query → paste isi file `supabase/schema.sql` → Run.
   File ini otomatis drop struktur lama (kalau ada) sebelum bikin yang baru — aman dijalankan ulang kapan pun skema berubah, tapi **semua data lama akan ikut terhapus**. Cukup jalankan file ini apa adanya, tidak perlu drop manual dulu.
3. Buka **Project Settings > API** → salin `Project URL` dan `anon public key`.

### 2. Setup project lokal
```bash
npm install
cp .env.example .env
```
Isi `.env` dengan URL dan anon key dari Supabase kamu.

### 3. Jalankan development server
```bash
npm run dev
```
Buka `http://localhost:5173`.

### 4. Deploy ke Vercel
1. Push project ini ke GitHub.
2. Buka [vercel.com](https://vercel.com) → New Project → import repo GitHub kamu.
3. Di bagian **Environment Variables**, tambahkan `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY`.
4. Deploy. Selesai — dapat link `xxx.vercel.app`.

## Arsitektur

Project ini dipisah dengan pola **feature-based** — setiap fitur (`auth`, `kelas`, `dashboard`) punya folder sendiri berisi halaman dan service-nya masing-masing, bukan dikumpulkan semua di satu folder `pages/` besar.

```
src/
├── app/                        # Composition & routing level tertinggi
│   ├── AppRoutes.jsx           # Semua definisi route di satu tempat
│   ├── KelasLayout.jsx         # Kerangka halaman kelas + menu navigasi bawah (mobile)
│   └── ProtectedRoute.jsx      # Guard untuk halaman yang butuh login
│
├── features/                   # Satu folder = satu domain fitur
│   ├── auth/
│   │   ├── pages/               # LoginPage, RegisterPage
│   │   └── services/
│   │       └── authService.js   # Semua panggilan Supabase Auth ada di sini
│   ├── kelas/
│   │   ├── pages/                # MulaiKelasPage
│   │   └── services/
│   │       └── kelasService.js   # Logic buat/gabung kelas
│   └── dashboard/
│       ├── pages/                 # DashboardPage
│       └── services/
│           └── dashboardService.js
│
├── components/
│   ├── ui/                     # Komponen generik lintas fitur (Button, Field, LoadingScreen)
│   └── layout/                 # Kerangka halaman (AuthLayout)
│
├── context/
│   ├── AuthContext.jsx         # Satu sumber kebenaran untuk auth state di seluruh app
│   └── KelasContext.jsx        # Info kelas & role user (diisi sekali oleh RequireKelas)
│
├── config/
│   ├── routes.js                # Semua path route sebagai konstanta (tidak ada "magic string")
│   └── constants.js             # Nama app, role, dsb
│
├── lib/
│   └── supabase.js             # Satu-satunya tempat inisialisasi client Supabase
│
├── utils/
│   ├── kodeKelas.js             # Generator kode kelas
│   └── errors.js                 # Terjemahan pesan error Supabase ke Bahasa Indonesia
│
├── App.jsx
├── main.jsx
└── index.css

supabase/
└── schema.sql                  # Tabel + Row Level Security
```

### Kenapa dipisah begini?

- **Komponen UI tidak pernah memanggil Supabase langsung.** Semua query database lewat `services/` di masing-masing fitur. Kalau nanti ganti backend atau ubah struktur tabel, cukup edit satu file service, bukan bongkar semua halaman.
- **`config/routes.js` jadi satu-satunya sumber path.** Kalau mau ubah `/masuk` jadi `/login`, cukup ubah di satu tempat.
- **`AuthContext` dipakai, bukan hook `useAuth` yang fetch sendiri di tiap komponen** — supaya session tidak di-fetch ulang berkali-kali dan konsisten di seluruh app.
- **Alias `@/`** sudah dikonfigurasi (lihat `vite.config.js` & `jsconfig.json`) supaya import selalu `@/components/ui` dari mana pun, bukan `../../../components/ui`.
- **ESLint + Prettier** sudah disiapkan (`npm run lint`, `npm run format`) untuk jaga konsistensi gaya kode kalau nanti kerja bareng orang lain.

## Sistem Role

| Role | Lingkup | Kewenangan |
|---|---|---|
| **Platform Admin** | Seluruh platform | Akses penuh semua data (untuk moderasi/support). Diset manual lewat SQL Editor, tidak bisa diset lewat aplikasi. |
| **Ketua Kelas** | 1 per kelas, otomatis untuk pembuat kelas | Kelola pengumuman/jadwal/tugas, angkat/turunkan wakil ketua, keluarkan anggota |
| **Wakil Ketua** | Maks 5 per kelas (ditegakkan di level database lewat trigger) | Kelola pengumuman, jadwal, dan tugas. **Tidak** bisa kelola keanggotaan maupun mata pelajaran (hanya bisa melihat daftar mapel) |
| **Anggota** | Sisanya | Lihat semua, centang tugas selesai. Tidak bisa menambah/mengubah tugas, jadwal, mapel, pengumuman |

Untuk jadikan akun kamu sendiri platform admin, jalankan di Supabase SQL Editor:
```sql
update users set is_platform_admin = true where email = 'email-kamu@gmail.com';
```

## Yang sudah jadi (fondasi MVP)
- Daftar & login (Supabase Auth)
- Buat kelas baru (dapat kode unik otomatis, pembuat otomatis jadi ketua) atau gabung kelas pakai kode (jadi anggota)
- Kelola anggota: ketua bisa angkat/turunkan wakil ketua, keluarkan anggota, dan mengatur batas anggota kelas kapan saja (default 40, maks 80). Kalau kelas penuh, user baru tidak bisa gabung — dicegah di aplikasi dan di database
- **Mata pelajaran**: CRUD **khusus ketua** (wakil & anggota hanya bisa melihat), jadi master data — dipakai sebagai referensi di jadwal supaya nama mapel konsisten
- **Jadwal pelajaran**: tab per hari (Senin-Minggu, termasuk akhir pekan untuk kelas yang masuk Sabtu/Minggu), pengurus isi slot jam + pilih mapel dari dropdown, semua anggota bisa lihat. Satu jam cuma bisa diisi satu mapel (dicegah otomatis di database)
- **Tugas/PR**: pengurus tambah/edit/hapus tugas; semua anggota bisa lihat & centang selesai. Tugas yang lewat deadline dan belum selesai ditandai "Terlambat" otomatis. Pengurus bisa lampirkan gambar/dokumen (maks 5 berkas, 5 MB per berkas)
- **Pengumuman**: pengurus tulis/edit/hapus/pin pengumuman, semua anggota bisa baca. Pengumuman yang di-pin selalu tampil di atas. Pengurus bisa lampirkan gambar/dokumen (maks 5 berkas, 5 MB per berkas). Semua anggota bisa berkomentar; penulis komentar atau pengurus bisa menghapusnya
- **Polling di pengumuman**: pengurus bisa menyertakan polling (2–6 opsi). Satu anggota satu suara, boleh ganti pilihan selama polling terbuka, pengurus bisa menutup/membuka lagi. Suara **anonim** (anggota hanya bisa membaca suara miliknya sendiri; yang tampil hanya jumlah per opsi). Pembuatan polling dan pemberian suara lewat fungsi database (`buat_pengumuman_dengan_polling`, `beri_suara`, `hasil_polling_kelas`) sehingga aturan tidak bisa dilewati lewat API langsung
- **Ringkasan "Perlu perhatian" di dashboard**: tugas terlambat atau jatuh tempo ≤ 2 hari, polling terbuka yang belum diisi, dan pengumuman yang di-pin. Ini pengganti ringan notifikasi (tanpa server/push). Tanggal dihitung menurut zona waktu lokal pengguna
- **Menu navigasi bawah (mobile)**: fixed di bawah layar, hanya tampil di bawah 768px. Berisi Beranda, Pengumuman, Jadwal, Tugas; ketua mendapat tambahan tombol **Kelola** (Mata pelajaran dan Anggota kelas). Memperhitungkan safe-area iPhone dan menandai halaman aktif. Dipasang lewat layout route `app/KelasLayout.jsx` sehingga tidak dibuat ulang tiap pindah halaman
- Dashboard kelas dengan tampilan sesuai role
- Row Level Security: siswa hanya bisa akses data kelasnya sendiri, batas 5 wakil ketua dan batas anggota kelas ditegakkan di database, profil user otomatis dibuat lewat trigger saat daftar. Lampiran disimpan di bucket Storage `lampiran` (privat, 5 MB/berkas)

## Langkah selanjutnya (opsional)
Empat fitur inti (kelas & role, mapel, jadwal, tugas, pengumuman) sudah lengkap. Beberapa ide pengembangan lanjutan:
- Fitur report/hapus konten tidak pantas (moderasi tambahan di luar hapus oleh pengurus)
- Notifikasi push/email sungguhan (butuh layanan tambahan; ringkasan di dashboard sudah jadi versi ringannya)
- Multi-kelas per user (saat ini satu akun diasumsikan hanya di satu kelas)
