-- ============================================
-- RuangKelas: Master Skema Database + RLS + Triggers + Push Notification Webhook
-- Jalankan ini di Supabase SQL Editor (Project > SQL Editor > New Query)
-- Skrip ini mereset database public (100% fresh start) & membuat ulang seluruh struktur.
-- PERHATIAN: Semua data di tabel public akan terhapus & di-reset dalam sekali jalan.
-- ============================================

-- ============================================
-- 1. Reset Schema Public & Hapus Trigger Bawaan Auth
-- ============================================
drop trigger if exists on_auth_user_created on auth.users;

drop schema if exists public cascade;
create schema public;

-- Grant hak akses dasar schema public ke role Supabase
grant usage on schema public to postgres, anon, authenticated, service_role;
grant all on schema public to postgres, anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to postgres, anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to postgres, anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to postgres, anon, authenticated, service_role;

-- Aktifkan ekstensi yang diperlukan
create extension if not exists "uuid-ossp";
create extension if not exists pg_net;

-- ============================================
-- 2. Pembuatan Tabel Master (16 Tabel)
-- ============================================

-- 1. Tabel Profil User (melengkapi auth.users bawaan Supabase)
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  nama text not null,
  email text,
  is_platform_admin boolean not null default false,
  created_at timestamptz default now()
);

-- 2. Tabel Kelas
create table public.kelas (
  id uuid primary key default gen_random_uuid(),
  nama_kelas text not null,
  kode_unik text unique not null,
  admin_id uuid references public.users(id) on delete set null,
  max_anggota int not null default 40 check (max_anggota >= 1 and max_anggota <= 80),
  created_at timestamptz default now()
);

-- 3. Tabel Mata Pelajaran (master per kelas)
create table public.mapel (
  id uuid primary key default gen_random_uuid(),
  kelas_id uuid references public.kelas(id) on delete cascade,
  nama_mapel text not null,
  created_at timestamptz default now(),
  unique (kelas_id, nama_mapel)
);

-- 4. Tabel Anggota Kelas (relasi many-to-many user <-> kelas)
create table public.kelas_members (
  id uuid primary key default gen_random_uuid(),
  kelas_id uuid references public.kelas(id) on delete cascade,
  user_id uuid references public.users(id) on delete cascade,
  role text not null default 'anggota' check (role in ('ketua', 'wakil_ketua', 'anggota')),
  joined_at timestamptz default now(),
  unique (kelas_id, user_id)
);

-- 5. Tabel Pengumuman
create table public.pengumuman (
  id uuid primary key default gen_random_uuid(),
  kelas_id uuid references public.kelas(id) on delete cascade,
  penulis_id uuid references public.users(id) on delete set null,
  isi text not null,
  pinned boolean default false,
  created_at timestamptz default now()
);

-- 6. Tabel Polling
create table public.polling (
  id uuid primary key default gen_random_uuid(),
  pengumuman_id uuid not null unique references public.pengumuman(id) on delete cascade,
  kelas_id uuid not null references public.kelas(id) on delete cascade,
  ditutup boolean not null default false,
  created_at timestamptz default now()
);

-- 7. Tabel Opsi Polling
create table public.polling_opsi (
  id uuid primary key default gen_random_uuid(),
  polling_id uuid not null references public.polling(id) on delete cascade,
  teks text not null,
  urutan int not null default 0
);

-- 8. Tabel Suara Polling
create table public.polling_suara (
  id uuid primary key default gen_random_uuid(),
  polling_id uuid not null references public.polling(id) on delete cascade,
  opsi_id uuid not null references public.polling_opsi(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz default now(),
  unique (polling_id, user_id)
);

-- 9. Tabel Jadwal Pelajaran
create table public.jadwal (
  id uuid primary key default gen_random_uuid(),
  kelas_id uuid references public.kelas(id) on delete cascade,
  hari text not null check (hari in ('Senin','Selasa','Rabu','Kamis','Jumat','Sabtu','Minggu')),
  jam_ke int not null check (jam_ke > 0),
  mapel_id uuid references public.mapel(id) on delete cascade,
  created_at timestamptz default now(),
  unique (kelas_id, hari, jam_ke)
);

-- 10. Tabel Tugas / PR
create table public.tugas (
  id uuid primary key default gen_random_uuid(),
  kelas_id uuid references public.kelas(id) on delete cascade,
  penulis_id uuid references public.users(id) on delete set null,
  mapel_id uuid references public.mapel(id) on delete set null,
  judul text not null,
  deadline date,
  created_at timestamptz default now()
);

-- 11. Tabel Progress / Centang Selesai Tugas (Pribadi per Siswa)
create table public.tugas_progress (
  id uuid primary key default gen_random_uuid(),
  tugas_id uuid not null references public.tugas(id) on delete cascade,
  kelas_id uuid not null references public.kelas(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz default now(),
  unique (tugas_id, user_id)
);

-- 12. Tabel Notifikasi (dalam aplikasi)
create table public.notifikasi (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  kelas_id uuid not null references public.kelas(id) on delete cascade,
  jenis text not null check (jenis in ('tugas_baru', 'deadline', 'pengumuman_baru', 'pengumuman_pin', 'sebutan')),
  judul text not null,
  isi text,
  tautan text,
  referensi_id uuid,
  dibaca boolean not null default false,
  created_at timestamptz default now()
);

create unique index notifikasi_unik on public.notifikasi (user_id, jenis, referensi_id);

-- 13. Tabel Lampiran Berkas (Pengumuman / Tugas)
create table public.lampiran (
  id uuid primary key default gen_random_uuid(),
  kelas_id uuid not null references public.kelas(id) on delete cascade,
  pengumuman_id uuid references public.pengumuman(id) on delete cascade,
  tugas_id uuid references public.tugas(id) on delete cascade,
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

-- 14. Tabel Komentar Pengumuman
create table public.pengumuman_komentar (
  id uuid primary key default gen_random_uuid(),
  pengumuman_id uuid not null references public.pengumuman(id) on delete cascade,
  kelas_id uuid not null references public.kelas(id) on delete cascade,
  penulis_id uuid references public.users(id) on delete set null,
  parent_id uuid references public.pengumuman_komentar(id) on delete cascade,
  isi text not null check (char_length(trim(isi)) > 0 and char_length(isi) <= 500),
  created_at timestamptz default now()
);

create index idx_pengumuman_komentar_pengumuman on public.pengumuman_komentar (pengumuman_id, created_at);

-- 15. Tabel Suka Komentar
create table public.pengumuman_komentar_suka (
  id uuid primary key default gen_random_uuid(),
  komentar_id uuid not null references public.pengumuman_komentar(id) on delete cascade,
  kelas_id uuid not null references public.kelas(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz default now(),
  unique (komentar_id, user_id)
);

-- 16. Tabel Langganan Push Notification (Web Push / PWA)
create table public.push_langganan (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_push_langganan_user on public.push_langganan (user_id);

-- ============================================
-- 3. Trigger & Functions Logika Bisnis
-- ============================================

-- Auto Profil User Baru dari Auth Supabase
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, nama, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'nama', new.email), new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Sinkronkan user yang sudah terdaftar di Supabase Auth jika ada
insert into public.users (id, nama, email)
select id, coalesce(raw_user_meta_data->>'nama', email), email
from auth.users
on conflict (id) do nothing;

-- Batas maksimal 5 wakil ketua per kelas
create or replace function public.enforce_wakil_ketua_limit()
returns trigger
language plpgsql set search_path = public as $$
declare
  jumlah_wakil int;
begin
  if new.role = 'wakil_ketua' then
    select count(*) into jumlah_wakil
    from public.kelas_members
    where kelas_id = new.kelas_id
      and role = 'wakil_ketua'
      and id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid);

    if jumlah_wakil >= 5 then
      raise exception 'Kelas ini sudah punya 5 wakil ketua, maksimal tercapai.';
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_enforce_wakil_ketua_limit
  before insert or update on public.kelas_members
  for each row execute function public.enforce_wakil_ketua_limit();

-- Batas kapasitas anggota kelas
create or replace function public.enforce_batas_anggota()
returns trigger
language plpgsql set search_path = public as $$
declare
  v_max int;
  v_jumlah int;
begin
  select max_anggota into v_max from public.kelas where id = new.kelas_id;
  select count(*) into v_jumlah from public.kelas_members where kelas_id = new.kelas_id;

  if v_max is not null and v_jumlah >= v_max then
    raise exception 'Kelas ini sudah penuh. Batas anggota tercapai.';
  end if;
  return new;
end;
$$;

create trigger trg_enforce_batas_anggota
  before insert on public.kelas_members
  for each row execute function public.enforce_batas_anggota();

-- Validasi ketua tidak menurunkan max_anggota di bawah jumlah anggota saat ini
create or replace function public.enforce_max_anggota_valid()
returns trigger
language plpgsql set search_path = public as $$
declare
  v_jumlah int;
begin
  if new.max_anggota is distinct from old.max_anggota then
    select count(*) into v_jumlah from public.kelas_members where kelas_id = new.id;
    if new.max_anggota < v_jumlah then
      raise exception 'Batas anggota tidak boleh lebih kecil dari jumlah anggota sekarang.';
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_enforce_max_anggota_valid
  before update of max_anggota on public.kelas
  for each row execute function public.enforce_max_anggota_valid();

-- Batas maksimal 5 lampiran per pengumuman / tugas
create or replace function public.enforce_batas_lampiran()
returns trigger
language plpgsql set search_path = public as $$
declare
  v_jumlah int;
begin
  if new.pengumuman_id is not null then
    select count(*) into v_jumlah from public.lampiran where pengumuman_id = new.pengumuman_id;
  else
    select count(*) into v_jumlah from public.lampiran where tugas_id = new.tugas_id;
  end if;
  if v_jumlah >= 5 then
    raise exception 'Maksimal 5 lampiran per item.';
  end if;
  return new;
end;
$$;

create trigger trg_enforce_batas_lampiran
  before insert on public.lampiran
  for each row execute function public.enforce_batas_lampiran();

-- ============================================
-- 4. Helper Functions RLS
-- ============================================

create or replace function public.is_platform_admin()
returns boolean
language sql security definer set search_path = public as $$
  select coalesce((select is_platform_admin from public.users where id = auth.uid()), false);
$$;

create or replace function public.is_member_of(kelas_id_input uuid)
returns boolean
language sql security definer set search_path = public as $$
  select exists (
    select 1 from public.kelas_members
    where kelas_id = kelas_id_input and user_id = auth.uid()
  ) or public.is_platform_admin();
$$;

create or replace function public.is_ketua_of(kelas_id_input uuid)
returns boolean
language sql security definer set search_path = public as $$
  select exists (
    select 1 from public.kelas_members
    where kelas_id = kelas_id_input and user_id = auth.uid() and role = 'ketua'
  ) or public.is_platform_admin();
$$;

create or replace function public.is_pengurus_of(kelas_id_input uuid)
returns boolean
language sql security definer set search_path = public as $$
  select exists (
    select 1 from public.kelas_members
    where kelas_id = kelas_id_input and user_id = auth.uid() and role in ('ketua', 'wakil_ketua')
  ) or public.is_platform_admin();
$$;

create or replace function public.shares_kelas_with(target_user_id uuid)
returns boolean
language sql security definer set search_path = public as $$
  select exists (
    select 1
    from public.kelas_members me
    join public.kelas_members other on other.kelas_id = me.kelas_id
    where me.user_id = auth.uid() and other.user_id = target_user_id
  );
$$;

-- ============================================
-- 5. Fungsi Atomik Polling
-- ============================================

create or replace function public.buat_pengumuman_dengan_polling(p_kelas_id uuid, p_isi text, p_opsi text[])
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_pengumuman_id uuid;
  v_polling_id uuid;
  v_teks text;
  v_urutan int := 0;
  v_bersih text[] := '{}';
begin
  if not public.is_pengurus_of(p_kelas_id) then
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

  insert into public.pengumuman (kelas_id, penulis_id, isi)
    values (p_kelas_id, auth.uid(), trim(p_isi))
    returning id into v_pengumuman_id;

  insert into public.polling (pengumuman_id, kelas_id)
    values (v_pengumuman_id, p_kelas_id)
    returning id into v_polling_id;

  foreach v_teks in array v_bersih loop
    v_urutan := v_urutan + 1;
    insert into public.polling_opsi (polling_id, teks, urutan) values (v_polling_id, v_teks, v_urutan);
  end loop;

  return v_pengumuman_id;
end;
$$;

create or replace function public.beri_suara(p_polling_id uuid, p_opsi_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_kelas_id uuid;
  v_ditutup boolean;
begin
  select kelas_id, ditutup into v_kelas_id, v_ditutup from public.polling where id = p_polling_id;
  if v_kelas_id is null then
    raise exception 'Polling tidak ditemukan.';
  end if;
  if not exists (select 1 from public.kelas_members where kelas_id = v_kelas_id and user_id = auth.uid()) then
    raise exception 'Kamu bukan anggota kelas ini.';
  end if;
  if v_ditutup then
    raise exception 'Polling sudah ditutup.';
  end if;
  if not exists (select 1 from public.polling_opsi where id = p_opsi_id and polling_id = p_polling_id) then
    raise exception 'Opsi tidak valid.';
  end if;

  insert into public.polling_suara (polling_id, opsi_id, user_id)
    values (p_polling_id, p_opsi_id, auth.uid())
    on conflict (polling_id, user_id) do update set opsi_id = excluded.opsi_id;
end;
$$;

create or replace function public.hasil_polling_kelas(p_kelas_id uuid)
returns table (polling_id uuid, opsi_id uuid, jumlah bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_member_of(p_kelas_id) then
    raise exception 'Kamu bukan anggota kelas ini.';
  end if;
  return query
    select o.polling_id, o.id, count(s.id)
    from public.polling_opsi o
    join public.polling p on p.id = o.polling_id
    left join public.polling_suara s on s.opsi_id = o.id
    where p.kelas_id = p_kelas_id
    group by o.polling_id, o.id;
end;
$$;

-- ============================================
-- 6. Notifikasi & Trigger WebPush
-- ============================================

create or replace function public.kirim_notifikasi(
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
  insert into public.notifikasi (user_id, kelas_id, jenis, judul, isi, tautan, referensi_id)
  values (p_user_id, p_kelas_id, p_jenis, p_judul, p_isi, p_tautan, p_referensi_id)
  on conflict (user_id, jenis, referensi_id) do nothing;
end;
$$;

create or replace function public.trg_notifikasi_tugas_baru()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  r record;
begin
  for r in
    select user_id from public.kelas_members
    where kelas_id = new.kelas_id and user_id is distinct from new.penulis_id
  loop
    perform public.kirim_notifikasi(
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
  after insert on public.tugas
  for each row execute function public.trg_notifikasi_tugas_baru();

create or replace function public.trg_notifikasi_pengumuman_baru()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  r record;
begin
  for r in
    select user_id from public.kelas_members
    where kelas_id = new.kelas_id and user_id is distinct from new.penulis_id
  loop
    perform public.kirim_notifikasi(
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
  after insert on public.pengumuman
  for each row execute function public.trg_notifikasi_pengumuman_baru();

create or replace function public.trg_notifikasi_pengumuman_pin()
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
    select user_id from public.kelas_members
    where kelas_id = new.kelas_id and user_id is distinct from new.penulis_id
  loop
    perform public.kirim_notifikasi(
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
  after update of pinned on public.pengumuman
  for each row execute function public.trg_notifikasi_pengumuman_pin();

create or replace function public.trg_notifikasi_sebutan()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  r record;
  induk uuid;
begin
  if new.parent_id is not null then
    select penulis_id into induk from public.pengumuman_komentar where id = new.parent_id;
    if induk is not null and induk is distinct from new.penulis_id then
      perform public.kirim_notifikasi(
        induk, new.kelas_id, 'sebutan',
        'Ada yang membalas komentarmu', left(new.isi, 80),
        '/kelas/' || new.kelas_id || '/pengumuman',
        new.id
      );
    end if;
  end if;

  for r in
    select distinct u.id
    from public.kelas_members m
    join public.users u on u.id = m.user_id
    where m.kelas_id = new.kelas_id
      and u.id is distinct from new.penulis_id
      and u.nama is not null
      and position('@' || lower(u.nama) in lower(new.isi)) > 0
  loop
    perform public.kirim_notifikasi(
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
  after insert on public.pengumuman_komentar
  for each row execute function public.trg_notifikasi_sebutan();

create or replace function public.sinkron_notifikasi_deadline()
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
    from public.tugas t
    join public.kelas_members m on m.kelas_id = t.kelas_id and m.user_id = auth.uid()
    where t.deadline = (current_date + 1)
      and (t.penulis_id is null or t.penulis_id is distinct from auth.uid())
      and not exists (
        select 1 from public.tugas_progress p
        where p.tugas_id = t.id and p.user_id = auth.uid()
      )
  loop
    insert into public.notifikasi (user_id, kelas_id, jenis, judul, isi, tautan, referensi_id)
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

grant execute on function public.sinkron_notifikasi_deadline() to authenticated;

-- Trigger Pemicu WebPush (Edge Function HTTP POST via pg_net)
create or replace function public.trg_pemicu_webpush()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  anon_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFyb2htcGRhdGRxbGpoeGlyenViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAzNjczNDksImV4cCI6MjEwNTk0MzM0OX0.oyIWOEmA439U3heHxgR0MEZM0ev8ENikV0AA9hetvXs';
begin
  perform net.http_post(
    url := 'https://qrohmpdatdqljhxirzub.supabase.co/functions/v1/kirim-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || anon_key,
      'apiKey', anon_key
    ),
    body := jsonb_build_object(
      'type', tg_op,
      'table', tg_table_name,
      'schema', tg_table_schema,
      'record', row_to_json(new)
    )
  );
  return new;
end;
$$;

create trigger after_notifikasi_kirim_push
  after insert on public.notifikasi
  for each row execute function public.trg_pemicu_webpush();

-- ============================================
-- 7. Row Level Security (RLS) Kebijakan Access
-- ============================================

alter table public.users enable row level security;
alter table public.kelas enable row level security;
alter table public.mapel enable row level security;
alter table public.kelas_members enable row level security;
alter table public.pengumuman enable row level security;
alter table public.polling enable row level security;
alter table public.polling_opsi enable row level security;
alter table public.polling_suara enable row level security;
alter table public.jadwal enable row level security;
alter table public.tugas enable row level security;
alter table public.tugas_progress enable row level security;
alter table public.notifikasi enable row level security;
alter table public.lampiran enable row level security;
alter table public.pengumuman_komentar enable row level security;
alter table public.pengumuman_komentar_suka enable row level security;
alter table public.push_langganan enable row level security;

-- Policies users
create policy "Lihat profil sendiri, sekelas, atau platform admin" on public.users for select
  using (auth.uid() = id or public.is_platform_admin() or public.shares_kelas_with(id));
create policy "Edit profil sendiri" on public.users for update using (auth.uid() = id);
create policy "Buat profil sendiri" on public.users for insert with check (auth.uid() = id);

-- Policies kelas
create policy "Buat kelas baru" on public.kelas for insert with check (auth.uid() = admin_id);
create policy "Lihat kelas jika anggota, saat cari kode, atau platform admin" on public.kelas for select
  using (true);
create policy "Ketua bisa update kelas" on public.kelas for update using (public.is_ketua_of(id));

-- Policies mapel
create policy "Lihat mapel kelas sendiri" on public.mapel for select
  using (public.is_member_of(kelas_id));
create policy "Ketua bisa tambah mapel" on public.mapel for insert
  with check (public.is_ketua_of(kelas_id));
create policy "Ketua bisa edit mapel" on public.mapel for update
  using (public.is_ketua_of(kelas_id)) with check (public.is_ketua_of(kelas_id));
create policy "Ketua bisa hapus mapel" on public.mapel for delete
  using (public.is_ketua_of(kelas_id));

-- Policies kelas_members
create policy "Lihat anggota kelas sendiri" on public.kelas_members for select
  using (public.is_member_of(kelas_id));
create policy "Pembuat kelas otomatis jadi ketua" on public.kelas_members for insert
  with check (
    auth.uid() = user_id
    and role = 'ketua'
    and exists (select 1 from public.kelas where id = kelas_id and admin_id = auth.uid())
  );
create policy "User bisa gabung kelas sebagai anggota" on public.kelas_members for insert
  with check (auth.uid() = user_id and (role = 'anggota' or public.is_platform_admin()));
create policy "Ketua bisa ubah role anggota (angkat/turunkan wakil ketua)" on public.kelas_members
  for update using (public.is_ketua_of(kelas_id));
create policy "Ketua bisa keluarkan anggota" on public.kelas_members for delete
  using (public.is_ketua_of(kelas_id) and role <> 'ketua');

-- Policies pengumuman
create policy "Lihat pengumuman kelas sendiri" on public.pengumuman for select
  using (public.is_member_of(kelas_id));
create policy "Pengurus bisa post pengumuman" on public.pengumuman for insert
  with check (public.is_pengurus_of(kelas_id) and auth.uid() = penulis_id);
create policy "Pengurus bisa edit pengumuman" on public.pengumuman for update
  using (public.is_pengurus_of(kelas_id));
create policy "Pengurus bisa hapus pengumuman" on public.pengumuman for delete
  using (public.is_pengurus_of(kelas_id));

-- Policies polling & opsi
create policy "Lihat polling kelas sendiri" on public.polling for select
  using (public.is_member_of(kelas_id));
create policy "Pengurus bisa buka/tutup polling" on public.polling for update
  using (public.is_pengurus_of(kelas_id)) with check (public.is_pengurus_of(kelas_id));
create policy "Lihat opsi polling kelas sendiri" on public.polling_opsi for select
  using (exists (select 1 from public.polling p where p.id = polling_id and public.is_member_of(p.kelas_id)));
create policy "Lihat suara sendiri" on public.polling_suara for select
  using (user_id = auth.uid());

-- Policies jadwal
create policy "Lihat jadwal kelas sendiri" on public.jadwal for select
  using (public.is_member_of(kelas_id));
create policy "Pengurus bisa isi jadwal" on public.jadwal for insert
  with check (public.is_pengurus_of(kelas_id));
create policy "Pengurus bisa edit jadwal" on public.jadwal for update
  using (public.is_pengurus_of(kelas_id));
create policy "Pengurus bisa hapus jadwal" on public.jadwal for delete
  using (public.is_pengurus_of(kelas_id));

-- Policies tugas & progress
create policy "Lihat tugas kelas sendiri" on public.tugas for select
  using (public.is_member_of(kelas_id));
create policy "Pengurus bisa tambah tugas" on public.tugas for insert
  with check (public.is_pengurus_of(kelas_id) and auth.uid() = penulis_id);
create policy "Pengurus bisa edit tugas" on public.tugas for update
  using (public.is_pengurus_of(kelas_id)) with check (public.is_pengurus_of(kelas_id));
create policy "Pengurus bisa hapus tugas" on public.tugas for delete
  using (public.is_pengurus_of(kelas_id));

create policy "Lihat progres tugas sendiri atau pengurus" on public.tugas_progress for select
  using (auth.uid() = user_id or public.is_pengurus_of(kelas_id));
create policy "Anggota bisa tandai tugas sendiri" on public.tugas_progress for insert
  with check (auth.uid() = user_id and public.is_member_of(kelas_id));
create policy "Anggota bisa hapus centang sendiri" on public.tugas_progress for delete
  using (auth.uid() = user_id);

-- Policies notifikasi
create policy "Lihat notifikasi sendiri" on public.notifikasi for select
  using (auth.uid() = user_id);
create policy "Tandai notifikasi sendiri" on public.notifikasi for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Policies lampiran
create policy "Lihat lampiran kelas sendiri" on public.lampiran for select
  using (public.is_member_of(kelas_id));
create policy "Pengurus bisa unggah lampiran" on public.lampiran for insert
  with check (public.is_pengurus_of(kelas_id));
create policy "Pengurus bisa hapus lampiran" on public.lampiran for delete
  using (public.is_pengurus_of(kelas_id));

-- Policies komentar & suka
create policy "Lihat komentar kelas sendiri" on public.pengumuman_komentar for select
  using (public.is_member_of(kelas_id));
create policy "Anggota bisa tulis komentar" on public.pengumuman_komentar for insert
  with check (public.is_member_of(kelas_id) and auth.uid() = penulis_id);
create policy "Penulis atau pengurus bisa hapus komentar" on public.pengumuman_komentar for delete
  using (auth.uid() = penulis_id or public.is_pengurus_of(kelas_id));

create policy "Lihat suka komentar kelas sendiri" on public.pengumuman_komentar_suka for select
  using (public.is_member_of(kelas_id));
create policy "Anggota bisa suka komentar" on public.pengumuman_komentar_suka for insert
  with check (public.is_member_of(kelas_id) and auth.uid() = user_id);
create policy "Anggota bisa batal suka komentar" on public.pengumuman_komentar_suka for delete
  using (auth.uid() = user_id);

-- Policies push_langganan
create policy "Kelola push_langganan sendiri" on public.push_langganan
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================
-- 8. Storage Configuration (Bucket lampiran)
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
