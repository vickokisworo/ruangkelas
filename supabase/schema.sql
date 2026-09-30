-- ============================================
-- RuangKelas: Skema Database + Row Level Security
-- Jalankan ini di Supabase SQL Editor (Project > SQL Editor > New Query)
-- File ini otomatis menghapus struktur lama (jika ada) sebelum membuat yang baru,
-- jadi aman dijalankan ulang dari awal kapan pun skema berubah.
-- PERHATIAN: semua data yang sudah ada akan ikut terhapus.
-- ============================================

-- Drop struktur lama (urutan penting: tabel dulu baru function, dan tabel
-- yang direferensikan tabel lain di-drop terakhir lewat cascade)
drop table if exists notifikasi cascade;
drop table if exists tugas_progress cascade;
drop table if exists pengumuman_komentar_suka cascade;
drop table if exists pengumuman_komentar cascade;
drop table if exists lampiran cascade;
drop table if exists tugas cascade;
drop table if exists polling_suara cascade;
drop table if exists polling_opsi cascade;
drop table if exists polling cascade;
drop table if exists jadwal cascade;
drop table if exists mapel cascade;
drop table if exists pengumuman cascade;
drop table if exists kelas_members cascade;
drop table if exists kelas cascade;
drop table if exists users cascade;

drop function if exists enforce_wakil_ketua_limit() cascade;
drop function if exists enforce_batas_anggota() cascade;
drop function if exists enforce_max_anggota_valid() cascade;
drop function if exists enforce_batas_lampiran() cascade;
drop function if exists is_platform_admin() cascade;
drop function if exists is_member_of(uuid) cascade;
drop function if exists is_ketua_of(uuid) cascade;
drop function if exists is_pengurus_of(uuid) cascade;
drop function if exists shares_kelas_with(uuid) cascade;
drop function if exists buat_pengumuman_dengan_polling(uuid, text, text[]) cascade;
drop function if exists beri_suara(uuid, uuid) cascade;
drop function if exists hasil_polling_kelas(uuid) cascade;
drop function if exists is_admin_of(uuid) cascade; -- sisa skema versi lama, kalau ada
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists handle_new_user() cascade;
drop function if exists kirim_notifikasi(uuid, uuid, text, text, text, text, uuid) cascade;
drop function if exists trg_notifikasi_tugas_baru() cascade;
drop function if exists trg_notifikasi_pengumuman_baru() cascade;
drop function if exists trg_notifikasi_pengumuman_pin() cascade;
drop function if exists trg_notifikasi_sebutan() cascade;
drop function if exists sinkron_notifikasi_deadline() cascade;

-- ============================================
-- Buat struktur baru
-- ============================================

-- Tabel profil user (melengkapi auth.users bawaan Supabase)
create table users (
  id uuid primary key references auth.users(id) on delete cascade,
  nama text not null,
  email text,
  is_platform_admin boolean not null default false,
  created_at timestamptz default now()
);

-- Catatan: is_platform_admin TIDAK bisa diset lewat aplikasi (lihat RLS di bawah).
-- Untuk jadikan diri sendiri platform admin, jalankan manual di SQL Editor:
-- update users set is_platform_admin = true where email = 'email-kamu@gmail.com';

-- Trigger: begitu ada akun baru mendaftar lewat Supabase Auth, baris profil di
-- tabel users langsung dibuat otomatis oleh database. Ini jaring pengaman supaya
-- profil user tidak pernah "hilang" walau ada error di kode frontend saat signup,
-- atau tabel users pernah di-reset terpisah dari auth.users.
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, nama, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'nama', new.email), new.email)
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Tabel kelas
-- max_anggota: ketua bisa ubah kapan saja. Default 40 (ukuran kelas SMA tipikal).
-- Tidak boleh lebih kecil dari jumlah anggota yang sudah ada (dicek trigger).
create table kelas (
  id uuid primary key default gen_random_uuid(),
  nama_kelas text not null,
  kode_unik text unique not null,
  admin_id uuid references users(id) on delete set null,
  max_anggota int not null default 40 check (max_anggota >= 1 and max_anggota <= 80),
  created_at timestamptz default now()
);

-- Tabel mata pelajaran (master data per kelas)
-- Dikelola oleh pengurus (ketua/wakil ketua), dipakai sebagai referensi di jadwal
-- supaya nama mapel konsisten (tidak ada "Matematika" vs "matematika" vs "MTK" terpisah).
create table mapel (
  id uuid primary key default gen_random_uuid(),
  kelas_id uuid references kelas(id) on delete cascade,
  nama_mapel text not null,
  created_at timestamptz default now(),
  unique (kelas_id, nama_mapel)
);

-- Tabel anggota kelas (relasi many-to-many user <-> kelas)
-- role: 'ketua' (1 per kelas), 'wakil_ketua' (maks 5 per kelas, ditegakkan lewat trigger), 'anggota'
create table kelas_members (
  id uuid primary key default gen_random_uuid(),
  kelas_id uuid references kelas(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  role text not null default 'anggota' check (role in ('ketua', 'wakil_ketua', 'anggota')),
  joined_at timestamptz default now(),
  unique (kelas_id, user_id)
);

-- Trigger: batasi maksimal 5 wakil ketua per kelas, ditegakkan di database
-- supaya tidak bisa diakali walau lewat request API langsung.
create or replace function enforce_wakil_ketua_limit()
returns trigger as $$
declare
  jumlah_wakil int;
begin
  if new.role = 'wakil_ketua' then
    select count(*) into jumlah_wakil
    from kelas_members
    where kelas_id = new.kelas_id
      and role = 'wakil_ketua'
      and id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid);

    if jumlah_wakil >= 5 then
      raise exception 'Kelas ini sudah punya 5 wakil ketua, maksimal tercapai.';
    end if;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_enforce_wakil_ketua_limit
  before insert or update on kelas_members
  for each row execute function enforce_wakil_ketua_limit();

-- Trigger: tolak anggota baru kalau kelas sudah mencapai batas yang diset ketua.
create or replace function enforce_batas_anggota()
returns trigger as $$
declare
  v_max int;
  v_jumlah int;
begin
  select max_anggota into v_max from kelas where id = new.kelas_id;
  select count(*) into v_jumlah from kelas_members where kelas_id = new.kelas_id;

  if v_max is not null and v_jumlah >= v_max then
    raise exception 'Kelas ini sudah penuh. Batas anggota tercapai.';
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_enforce_batas_anggota
  before insert on kelas_members
  for each row execute function enforce_batas_anggota();

-- Trigger: ketua tidak bisa menurunkan batas di bawah jumlah anggota sekarang.
create or replace function enforce_max_anggota_valid()
returns trigger as $$
declare
  v_jumlah int;
begin
  if new.max_anggota is distinct from old.max_anggota then
    select count(*) into v_jumlah from kelas_members where kelas_id = new.id;
    if new.max_anggota < v_jumlah then
      raise exception 'Batas anggota tidak boleh lebih kecil dari jumlah anggota sekarang.';
    end if;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_enforce_max_anggota_valid
  before update of max_anggota on kelas
  for each row execute function enforce_max_anggota_valid();

-- Tabel pengumuman
create table pengumuman (
  id uuid primary key default gen_random_uuid(),
  kelas_id uuid references kelas(id) on delete cascade,
  penulis_id uuid references users(id) on delete set null,
  isi text not null,
  pinned boolean default false,
  created_at timestamptz default now()
);

-- Tabel polling (menempel pada satu pengumuman, maks 1 polling per pengumuman)
create table polling (
  id uuid primary key default gen_random_uuid(),
  pengumuman_id uuid not null unique references pengumuman(id) on delete cascade,
  kelas_id uuid not null references kelas(id) on delete cascade,
  ditutup boolean not null default false,
  created_at timestamptz default now()
);

-- Opsi jawaban polling
create table polling_opsi (
  id uuid primary key default gen_random_uuid(),
  polling_id uuid not null references polling(id) on delete cascade,
  teks text not null,
  urutan int not null default 0
);

-- Suara: satu anggota satu suara per polling (bisa diganti selama polling terbuka).
-- Tabel ini TIDAK bisa ditulis langsung dari aplikasi; semua lewat fungsi beri_suara().
create table polling_suara (
  id uuid primary key default gen_random_uuid(),
  polling_id uuid not null references polling(id) on delete cascade,
  opsi_id uuid not null references polling_opsi(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  created_at timestamptz default now(),
  unique (polling_id, user_id)
);

-- Tabel jadwal pelajaran
-- mapel_id merujuk ke tabel mapel (bukan teks bebas), supaya nama mapel konsisten.
-- on delete cascade: kalau pengurus hapus satu mapel, slot jadwal yang memakainya
-- ikut terhapus otomatis (mencegah data jadwal "menggantung" merujuk mapel yang sudah tidak ada).
create table jadwal (
  id uuid primary key default gen_random_uuid(),
  kelas_id uuid references kelas(id) on delete cascade,
  hari text not null check (hari in ('Senin','Selasa','Rabu','Kamis','Jumat','Sabtu','Minggu')),
  jam_ke int not null check (jam_ke > 0),
  mapel_id uuid references mapel(id) on delete cascade,
  created_at timestamptz default now(),
  unique (kelas_id, hari, jam_ke)
);

-- Tabel tugas/PR
-- mapel_id merujuk ke tabel mapel (konsisten dengan jadwal). on delete set null
-- (bukan cascade) — kalau mapel dihapus, riwayat tugas yang sudah ada tetap
-- disimpan (cuma info mapelnya jadi kosong), tidak ikut terhapus seperti jadwal.
create table tugas (
  id uuid primary key default gen_random_uuid(),
  kelas_id uuid references kelas(id) on delete cascade,
  penulis_id uuid references users(id) on delete set null,
  mapel_id uuid references mapel(id) on delete set null,
  judul text not null,
  deadline date,
  created_at timestamptz default now()
);

-- Centang selesai bersifat pribadi per siswa, bukan untuk seluruh kelas.
create table tugas_progress (
  id uuid primary key default gen_random_uuid(),
  tugas_id uuid not null references tugas(id) on delete cascade,
  kelas_id uuid not null references kelas(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  created_at timestamptz default now(),
  unique (tugas_id, user_id)
);

-- Notifikasi ringan (bukan chat): tugas baru, deadline, pin, sebutan.
create table notifikasi (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  kelas_id uuid not null references kelas(id) on delete cascade,
  jenis text not null check (jenis in ('tugas_baru', 'deadline', 'pengumuman_baru', 'pengumuman_pin', 'sebutan')),
  judul text not null,
  isi text,
  tautan text,
  referensi_id uuid,
  dibaca boolean not null default false,
  created_at timestamptz default now()
);

create unique index if not exists notifikasi_unik
  on notifikasi (user_id, jenis, referensi_id);

-- Lampiran gambar/dokumen untuk pengumuman atau tugas (salah satu).
-- Berkas disimpan di bucket Storage "lampiran"; tabel ini hanya metadata.
create table lampiran (
  id uuid primary key default gen_random_uuid(),
  kelas_id uuid not null references kelas(id) on delete cascade,
  pengumuman_id uuid references pengumuman(id) on delete cascade,
  tugas_id uuid references tugas(id) on delete cascade,
  storage_path text not null,
  nama_file text not null,
  mime_type text not null,
  ukuran int not null check (ukuran > 0),
  created_at timestamptz default now(),
  check (
    (pengumuman_id is not null and tugas_id is null)
    or (pengumuman_id is null and tugas_id is not null)
  )
);

create or replace function enforce_batas_lampiran()
returns trigger as $$
declare
  v_jumlah int;
begin
  if new.pengumuman_id is not null then
    select count(*) into v_jumlah from lampiran where pengumuman_id = new.pengumuman_id;
  else
    select count(*) into v_jumlah from lampiran where tugas_id = new.tugas_id;
  end if;
  if v_jumlah >= 5 then
    raise exception 'Maksimal 5 lampiran per item.';
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_enforce_batas_lampiran
  before insert on lampiran
  for each row execute function enforce_batas_lampiran();

-- Komentar di pengumuman: semua anggota kelas boleh tulis; pengurus atau penulis bisa hapus.
create table pengumuman_komentar (
  id uuid primary key default gen_random_uuid(),
  pengumuman_id uuid not null references pengumuman(id) on delete cascade,
  kelas_id uuid not null references kelas(id) on delete cascade,
  penulis_id uuid references users(id) on delete set null,
  parent_id uuid references pengumuman_komentar(id) on delete cascade,
  isi text not null check (char_length(trim(isi)) > 0 and char_length(isi) <= 500),
  created_at timestamptz default now()
);

create index if not exists idx_pengumuman_komentar_pengumuman
  on pengumuman_komentar (pengumuman_id, created_at);

create table pengumuman_komentar_suka (
  id uuid primary key default gen_random_uuid(),
  komentar_id uuid not null references pengumuman_komentar(id) on delete cascade,
  kelas_id uuid not null references kelas(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  created_at timestamptz default now(),
  unique (komentar_id, user_id)
);

-- ============================================
-- Row Level Security (RLS)
-- Prinsip: siswa hanya bisa akses data kelasnya sendiri
-- ============================================

alter table users enable row level security;
alter table kelas enable row level security;
alter table mapel enable row level security;
alter table kelas_members enable row level security;
alter table pengumuman enable row level security;
alter table jadwal enable row level security;
alter table tugas enable row level security;
alter table tugas_progress enable row level security;
alter table notifikasi enable row level security;
alter table lampiran enable row level security;
alter table pengumuman_komentar enable row level security;
alter table pengumuman_komentar_suka enable row level security;

-- Helper: apakah user adalah platform admin (kamu, pengelola platform)
create or replace function is_platform_admin()
returns boolean as $$
  select coalesce((select is_platform_admin from users where id = auth.uid()), false);
$$ language sql security definer;

-- Helper: apakah user adalah anggota kelas tertentu (peran apa pun)
create or replace function is_member_of(kelas_id_input uuid)
returns boolean as $$
  select exists (
    select 1 from kelas_members
    where kelas_id = kelas_id_input and user_id = auth.uid()
  ) or is_platform_admin();
$$ language sql security definer;

-- Helper: apakah user adalah ketua kelas tertentu (kewenangan tertinggi di kelas)
create or replace function is_ketua_of(kelas_id_input uuid)
returns boolean as $$
  select exists (
    select 1 from kelas_members
    where kelas_id = kelas_id_input and user_id = auth.uid() and role = 'ketua'
  ) or is_platform_admin();
$$ language sql security definer;

-- Helper: apakah user adalah pengurus kelas (ketua ATAU wakil ketua) —
-- keduanya boleh kelola pengumuman/jadwal/tugas, bedanya cuma ketua yang boleh
-- angkat/turunkan wakil ketua dan keluarkan anggota.
create or replace function is_pengurus_of(kelas_id_input uuid)
returns boolean as $$
  select exists (
    select 1 from kelas_members
    where kelas_id = kelas_id_input and user_id = auth.uid() and role in ('ketua', 'wakil_ketua')
  ) or is_platform_admin();
$$ language sql security definer;

-- Helper: apakah user target satu kelas dengan user yang sedang login.
-- Dipakai supaya sesama anggota kelas bisa saling melihat nama (untuk daftar
-- anggota, "oleh <nama>" di tugas/pengumuman), tanpa membuka profil orang luar kelas.
create or replace function shares_kelas_with(target_user_id uuid)
returns boolean as $$
  select exists (
    select 1
    from kelas_members me
    join kelas_members other on other.kelas_id = me.kelas_id
    where me.user_id = auth.uid() and other.user_id = target_user_id
  );
$$ language sql security definer;

-- users: setiap orang bisa lihat & edit profil sendiri; platform admin bisa lihat semua.
-- is_platform_admin sengaja TIDAK termasuk kolom yang bisa diupdate lewat policy ini,
-- jadi user biasa tidak bisa menaikkan dirinya sendiri jadi platform admin lewat aplikasi.
create policy "Lihat profil sendiri, sekelas, atau platform admin" on users for select
  using (auth.uid() = id or is_platform_admin() or shares_kelas_with(id));
create policy "Edit profil sendiri" on users for update using (auth.uid() = id);
create policy "Buat profil sendiri" on users for insert with check (auth.uid() = id);

-- kelas: siapa saja yang login bisa buat kelas baru & cari kelas by kode (untuk join)
create policy "Buat kelas baru" on kelas for insert with check (auth.uid() = admin_id);
create policy "Lihat kelas jika anggota, saat cari kode, atau platform admin" on kelas for select
  using (true);
create policy "Ketua bisa update kelas" on kelas for update using (is_ketua_of(id));

-- mapel: semua anggota bisa lihat (dipakai di dropdown jadwal & tugas);
-- hanya KETUA yang bisa tambah/edit/hapus. Wakil ketua tidak, karena menghapus mapel
-- ikut menghapus slot jadwal yang memakainya.
create policy "Lihat mapel kelas sendiri" on mapel for select
  using (is_member_of(kelas_id));
create policy "Ketua bisa tambah mapel" on mapel for insert
  with check (is_ketua_of(kelas_id));
create policy "Ketua bisa edit mapel" on mapel for update
  using (is_ketua_of(kelas_id)) with check (is_ketua_of(kelas_id));
create policy "Ketua bisa hapus mapel" on mapel for delete
  using (is_ketua_of(kelas_id));

-- kelas_members: anggota bisa lihat sesama anggota kelasnya
create policy "Lihat anggota kelas sendiri" on kelas_members for select
  using (is_member_of(kelas_id));
create policy "Pembuat kelas otomatis jadi ketua" on kelas_members for insert
  with check (
    auth.uid() = user_id
    and role = 'ketua'
    and exists (select 1 from kelas where id = kelas_id and admin_id = auth.uid())
  );
create policy "User bisa gabung kelas sebagai anggota" on kelas_members for insert
  with check (auth.uid() = user_id and (role = 'anggota' or is_platform_admin()));
create policy "Ketua bisa ubah role anggota (angkat/turunkan wakil ketua)" on kelas_members
  for update using (is_ketua_of(kelas_id));
create policy "Ketua bisa keluarkan anggota" on kelas_members for delete
  using (is_ketua_of(kelas_id) and role <> 'ketua');

-- pengumuman: hanya anggota kelas terkait yang bisa lihat; ketua & wakil ketua yang kelola
create policy "Lihat pengumuman kelas sendiri" on pengumuman for select
  using (is_member_of(kelas_id));
create policy "Pengurus bisa post pengumuman" on pengumuman for insert
  with check (is_pengurus_of(kelas_id) and auth.uid() = penulis_id);
create policy "Pengurus bisa edit pengumuman" on pengumuman for update
  using (is_pengurus_of(kelas_id));
create policy "Pengurus bisa hapus pengumuman" on pengumuman for delete
  using (is_pengurus_of(kelas_id));

-- jadwal: hanya anggota kelas terkait bisa lihat; ketua & wakil ketua yang kelola
create policy "Lihat jadwal kelas sendiri" on jadwal for select
  using (is_member_of(kelas_id));
create policy "Pengurus bisa isi jadwal" on jadwal for insert
  with check (is_pengurus_of(kelas_id));
create policy "Pengurus bisa edit jadwal" on jadwal for update
  using (is_pengurus_of(kelas_id));
create policy "Pengurus bisa hapus jadwal" on jadwal for delete
  using (is_pengurus_of(kelas_id));

-- tugas: semua anggota bisa lihat; hanya pengurus yang tambah/edit/hapus isi.
-- Centang selesai ada di tabel tugas_progress (pribadi per siswa).
create policy "Lihat tugas kelas sendiri" on tugas for select
  using (is_member_of(kelas_id));
create policy "Pengurus bisa tambah tugas" on tugas for insert
  with check (is_pengurus_of(kelas_id) and auth.uid() = penulis_id);
create policy "Pengurus bisa edit tugas" on tugas for update
  using (is_pengurus_of(kelas_id)) with check (is_pengurus_of(kelas_id));
create policy "Pengurus bisa hapus tugas" on tugas for delete
  using (is_pengurus_of(kelas_id));

create policy "Lihat progres tugas sendiri atau pengurus" on tugas_progress for select
  using (auth.uid() = user_id or is_pengurus_of(kelas_id));
create policy "Anggota bisa tandai tugas sendiri" on tugas_progress for insert
  with check (auth.uid() = user_id and is_member_of(kelas_id));
create policy "Anggota bisa hapus centang sendiri" on tugas_progress for delete
  using (auth.uid() = user_id);

create policy "Lihat notifikasi sendiri" on notifikasi for select
  using (auth.uid() = user_id);
create policy "Tandai notifikasi sendiri" on notifikasi for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- lampiran: semua anggota bisa lihat; hanya pengurus yang unggah/hapus
create policy "Lihat lampiran kelas sendiri" on lampiran for select
  using (is_member_of(kelas_id));
create policy "Pengurus bisa unggah lampiran" on lampiran for insert
  with check (is_pengurus_of(kelas_id));
create policy "Pengurus bisa hapus lampiran" on lampiran for delete
  using (is_pengurus_of(kelas_id));

create policy "Lihat komentar kelas sendiri" on pengumuman_komentar for select
  using (is_member_of(kelas_id));
create policy "Anggota bisa tulis komentar" on pengumuman_komentar for insert
  with check (is_member_of(kelas_id) and auth.uid() = penulis_id);
create policy "Penulis atau pengurus bisa hapus komentar" on pengumuman_komentar for delete
  using (auth.uid() = penulis_id or is_pengurus_of(kelas_id));

create policy "Lihat suka komentar kelas sendiri" on pengumuman_komentar_suka for select
  using (is_member_of(kelas_id));
create policy "Anggota bisa suka komentar" on pengumuman_komentar_suka for insert
  with check (is_member_of(kelas_id) and auth.uid() = user_id);
create policy "Anggota bisa batal suka komentar" on pengumuman_komentar_suka for delete
  using (auth.uid() = user_id);

-- ============================================
-- Polling: RLS + fungsi
-- ============================================
alter table polling enable row level security;
alter table polling_opsi enable row level security;
alter table polling_suara enable row level security;

-- polling & opsi: anggota kelas bisa lihat; pengurus bisa buka/tutup polling.
-- Pembuatan polling hanya lewat buat_pengumuman_dengan_polling() (atomik + tervalidasi).
create policy "Lihat polling kelas sendiri" on polling for select
  using (is_member_of(kelas_id));
create policy "Pengurus bisa buka/tutup polling" on polling for update
  using (is_pengurus_of(kelas_id)) with check (is_pengurus_of(kelas_id));

create policy "Lihat opsi polling kelas sendiri" on polling_opsi for select
  using (exists (select 1 from polling p where p.id = polling_id and is_member_of(p.kelas_id)));

-- suara: hanya bisa melihat suara SENDIRI (anonim bagi anggota lain).
-- Tidak ada policy insert/update/delete = tidak bisa ditulis langsung.
create policy "Lihat suara sendiri" on polling_suara for select
  using (user_id = auth.uid());

-- Buat pengumuman + polling sekaligus dalam satu transaksi (gagal = tidak ada yang tersimpan)
create or replace function buat_pengumuman_dengan_polling(p_kelas_id uuid, p_isi text, p_opsi text[])
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_pengumuman_id uuid;
  v_polling_id uuid;
  v_teks text;
  v_urutan int := 0;
  v_bersih text[] := '{}';
begin
  if not is_pengurus_of(p_kelas_id) then
    raise exception 'Hanya pengurus kelas yang bisa membuat pengumuman.';
  end if;
  if coalesce(trim(p_isi), '') = '' then
    raise exception 'Isi pengumuman tidak boleh kosong.';
  end if;

  foreach v_teks in array coalesce(p_opsi, '{}') loop
    if trim(v_teks) <> '' then
      v_bersih := v_bersih || trim(v_teks);
    end if;
  end loop;
  if coalesce(array_length(v_bersih, 1), 0) < 2 or array_length(v_bersih, 1) > 6 then
    raise exception 'Polling harus punya 2 sampai 6 opsi.';
  end if;

  insert into pengumuman (kelas_id, penulis_id, isi)
    values (p_kelas_id, auth.uid(), trim(p_isi))
    returning id into v_pengumuman_id;

  insert into polling (pengumuman_id, kelas_id)
    values (v_pengumuman_id, p_kelas_id)
    returning id into v_polling_id;

  foreach v_teks in array v_bersih loop
    v_urutan := v_urutan + 1;
    insert into polling_opsi (polling_id, teks, urutan) values (v_polling_id, v_teks, v_urutan);
  end loop;

  return v_pengumuman_id;
end;
$$;

-- Beri/ganti suara. Memvalidasi: anggota kelas, polling belum ditutup, opsi milik polling itu.
create or replace function beri_suara(p_polling_id uuid, p_opsi_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_kelas_id uuid;
  v_ditutup boolean;
begin
  select kelas_id, ditutup into v_kelas_id, v_ditutup from polling where id = p_polling_id;
  if v_kelas_id is null then
    raise exception 'Polling tidak ditemukan.';
  end if;
  if not exists (select 1 from kelas_members where kelas_id = v_kelas_id and user_id = auth.uid()) then
    raise exception 'Kamu bukan anggota kelas ini.';
  end if;
  if v_ditutup then
    raise exception 'Polling sudah ditutup.';
  end if;
  if not exists (select 1 from polling_opsi where id = p_opsi_id and polling_id = p_polling_id) then
    raise exception 'Opsi tidak valid.';
  end if;

  insert into polling_suara (polling_id, opsi_id, user_id)
    values (p_polling_id, p_opsi_id, auth.uid())
    on conflict (polling_id, user_id) do update set opsi_id = excluded.opsi_id;
end;
$$;

-- Hasil (jumlah suara per opsi) untuk semua polling di satu kelas. Hanya jumlah, tanpa identitas pemilih.
create or replace function hasil_polling_kelas(p_kelas_id uuid)
returns table (polling_id uuid, opsi_id uuid, jumlah bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_member_of(p_kelas_id) then
    raise exception 'Kamu bukan anggota kelas ini.';
  end if;
  return query
    select o.polling_id, o.id, count(s.id)
    from polling_opsi o
    join polling p on p.id = o.polling_id
    left join polling_suara s on s.opsi_id = o.id
    where p.kelas_id = p_kelas_id
    group by o.polling_id, o.id;
end;
$$;

-- ============================================
-- Notifikasi: helper + trigger + deadline H-1
-- ============================================

create or replace function kirim_notifikasi(
  p_user_id uuid,
  p_kelas_id uuid,
  p_jenis text,
  p_judul text,
  p_isi text,
  p_tautan text,
  p_referensi_id uuid
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_user_id is null or p_user_id = auth.uid() then
    return;
  end if;
  insert into notifikasi (user_id, kelas_id, jenis, judul, isi, tautan, referensi_id)
  values (p_user_id, p_kelas_id, p_jenis, p_judul, p_isi, p_tautan, p_referensi_id)
  on conflict (user_id, jenis, referensi_id) do nothing;
end;
$$;

create or replace function trg_notifikasi_tugas_baru()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  r record;
begin
  for r in
    select user_id from kelas_members
    where kelas_id = new.kelas_id and user_id is distinct from new.penulis_id
  loop
    perform kirim_notifikasi(
      r.user_id, new.kelas_id, 'tugas_baru',
      'Tugas baru', new.judul,
      '/kelas/' || new.kelas_id || '/tugas',
      new.id
    );
  end loop;
  return new;
end;
$$;

create trigger after_tugas_baru
  after insert on tugas
  for each row execute function trg_notifikasi_tugas_baru();

create or replace function trg_notifikasi_pengumuman_baru()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  r record;
begin
  for r in
    select user_id from kelas_members
    where kelas_id = new.kelas_id and user_id is distinct from new.penulis_id
  loop
    perform kirim_notifikasi(
      r.user_id, new.kelas_id, 'pengumuman_baru',
      'Pengumuman baru', left(new.isi, 80),
      '/kelas/' || new.kelas_id || '/pengumuman',
      new.id
    );
  end loop;
  return new;
end;
$$;

create trigger after_pengumuman_baru
  after insert on pengumuman
  for each row execute function trg_notifikasi_pengumuman_baru();

create or replace function trg_notifikasi_pengumuman_pin()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  r record;
  potongan text;
begin
  if not new.pinned then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.pinned is true then
    return new;
  end if;

  potongan := left(new.isi, 80);
  for r in
    select user_id from kelas_members
    where kelas_id = new.kelas_id and user_id is distinct from new.penulis_id
  loop
    perform kirim_notifikasi(
      r.user_id, new.kelas_id, 'pengumuman_pin',
      'Pengumuman dipin', potongan,
      '/kelas/' || new.kelas_id || '/pengumuman',
      new.id
    );
  end loop;
  return new;
end;
$$;

create trigger after_pengumuman_pin
  after update of pinned on pengumuman
  for each row execute function trg_notifikasi_pengumuman_pin();

create or replace function trg_notifikasi_sebutan()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  r record;
  induk uuid;
begin
  if new.parent_id is not null then
    select penulis_id into induk from pengumuman_komentar where id = new.parent_id;
    if induk is not null and induk is distinct from new.penulis_id then
      perform kirim_notifikasi(
        induk, new.kelas_id, 'sebutan',
        'Ada yang membalas komentarmu', left(new.isi, 80),
        '/kelas/' || new.kelas_id || '/pengumuman',
        new.id
      );
    end if;
  end if;

  for r in
    select distinct u.id
    from kelas_members m
    join users u on u.id = m.user_id
    where m.kelas_id = new.kelas_id
      and u.id is distinct from new.penulis_id
      and u.nama is not null
      and position('@' || lower(u.nama) in lower(new.isi)) > 0
  loop
    perform kirim_notifikasi(
      r.id, new.kelas_id, 'sebutan',
      'Kamu disebut di komentar', left(new.isi, 80),
      '/kelas/' || new.kelas_id || '/pengumuman',
      new.id
    );
  end loop;
  return new;
end;
$$;

create trigger after_komentar_sebutan
  after insert on pengumuman_komentar
  for each row execute function trg_notifikasi_sebutan();

create or replace function sinkron_notifikasi_deadline()
returns int
language plpgsql security definer set search_path = public as $$
declare
  n int := 0;
  r record;
begin
  if auth.uid() is null then
    return 0;
  end if;

  for r in
    select t.id, t.judul, t.kelas_id
    from tugas t
    join kelas_members m on m.kelas_id = t.kelas_id and m.user_id = auth.uid()
    where t.deadline = (current_date + 1)
      and not exists (
        select 1 from tugas_progress p
        where p.tugas_id = t.id and p.user_id = auth.uid()
      )
  loop
    insert into notifikasi (user_id, kelas_id, jenis, judul, isi, tautan, referensi_id)
    values (
      auth.uid(), r.kelas_id, 'deadline',
      'Deadline besok', r.judul,
      '/kelas/' || r.kelas_id || '/tugas',
      r.id
    )
    on conflict (user_id, jenis, referensi_id) do nothing;
    n := n + 1;
  end loop;

  return n;
end;
$$;

grant execute on function sinkron_notifikasi_deadline() to authenticated;

-- ============================================
-- Storage: bucket lampiran (gambar & dokumen)
-- Path: {kelas_id}/pengumuman|{tugas}/{id}/{uuid}-{nama}
-- Batas 5 MB per berkas ditegakkan di bucket.
-- ============================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'lampiran',
  'lampiran',
  false,
  5242880,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Lihat lampiran storage kelas sendiri" on storage.objects;
drop policy if exists "Pengurus unggah lampiran storage" on storage.objects;
drop policy if exists "Pengurus hapus lampiran storage" on storage.objects;

create policy "Lihat lampiran storage kelas sendiri" on storage.objects
  for select using (
    bucket_id = 'lampiran'
    and public.is_member_of((split_part(name, '/', 1))::uuid)
  );

create policy "Pengurus unggah lampiran storage" on storage.objects
  for insert with check (
    bucket_id = 'lampiran'
    and public.is_pengurus_of((split_part(name, '/', 1))::uuid)
  );

create policy "Pengurus hapus lampiran storage" on storage.objects
  for delete using (
    bucket_id = 'lampiran'
    and public.is_pengurus_of((split_part(name, '/', 1))::uuid)
  );
