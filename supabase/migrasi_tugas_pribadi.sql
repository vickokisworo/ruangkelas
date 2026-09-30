-- Centang tugas jadi pribadi per siswa.
-- Tidak menghapus data lama. Kolom tugas.selesai dibiarkan (tidak dipakai lagi).

create table if not exists tugas_progress (
  id uuid primary key default gen_random_uuid(),
  tugas_id uuid not null references tugas(id) on delete cascade,
  kelas_id uuid not null references kelas(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  created_at timestamptz default now(),
  unique (tugas_id, user_id)
);

alter table tugas_progress enable row level security;

drop policy if exists "Anggota bisa update status tugas" on tugas;
drop policy if exists "Pengurus bisa edit tugas" on tugas;
drop policy if exists "Lihat progres tugas sendiri atau pengurus" on tugas_progress;
drop policy if exists "Anggota bisa tandai tugas sendiri" on tugas_progress;
drop policy if exists "Anggota bisa hapus centang sendiri" on tugas_progress;

create policy "Pengurus bisa edit tugas" on tugas for update
  using (is_pengurus_of(kelas_id)) with check (is_pengurus_of(kelas_id));

create policy "Lihat progres tugas sendiri atau pengurus" on tugas_progress for select
  using (auth.uid() = user_id or is_pengurus_of(kelas_id));
create policy "Anggota bisa tandai tugas sendiri" on tugas_progress for insert
  with check (auth.uid() = user_id and is_member_of(kelas_id));
create policy "Anggota bisa hapus centang sendiri" on tugas_progress for delete
  using (auth.uid() = user_id);
