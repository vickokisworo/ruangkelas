-- Migrasi komentar bergaya Instagram: reply + suka.
-- Aman dijalankan ulang. Tidak menghapus data lama.

create table if not exists pengumuman_komentar (
  id uuid primary key default gen_random_uuid(),
  pengumuman_id uuid not null references pengumuman(id) on delete cascade,
  kelas_id uuid not null references kelas(id) on delete cascade,
  penulis_id uuid references users(id) on delete set null,
  parent_id uuid references pengumuman_komentar(id) on delete cascade,
  isi text not null check (char_length(trim(isi)) > 0 and char_length(isi) <= 500),
  created_at timestamptz default now()
);

alter table pengumuman_komentar
  add column if not exists parent_id uuid references pengumuman_komentar(id) on delete cascade;

create index if not exists idx_pengumuman_komentar_pengumuman
  on pengumuman_komentar (pengumuman_id, created_at);

create table if not exists pengumuman_komentar_suka (
  id uuid primary key default gen_random_uuid(),
  komentar_id uuid not null references pengumuman_komentar(id) on delete cascade,
  kelas_id uuid not null references kelas(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  created_at timestamptz default now(),
  unique (komentar_id, user_id)
);

alter table pengumuman_komentar enable row level security;
alter table pengumuman_komentar_suka enable row level security;

drop policy if exists "Lihat komentar kelas sendiri" on pengumuman_komentar;
drop policy if exists "Anggota bisa tulis komentar" on pengumuman_komentar;
drop policy if exists "Penulis atau pengurus bisa hapus komentar" on pengumuman_komentar;
drop policy if exists "Lihat suka komentar kelas sendiri" on pengumuman_komentar_suka;
drop policy if exists "Anggota bisa suka komentar" on pengumuman_komentar_suka;
drop policy if exists "Anggota bisa batal suka komentar" on pengumuman_komentar_suka;

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
