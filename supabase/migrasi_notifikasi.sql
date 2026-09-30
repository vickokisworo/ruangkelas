-- Notifikasi ringan. Aman dijalankan ulang. Tidak menghapus data lama.

create table if not exists notifikasi (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  kelas_id uuid not null references kelas(id) on delete cascade,
  jenis text not null check (jenis in ('tugas_baru', 'deadline', 'pengumuman_pin', 'sebutan')),
  judul text not null,
  isi text,
  tautan text,
  referensi_id uuid,
  dibaca boolean not null default false,
  created_at timestamptz default now()
);

create unique index if not exists notifikasi_unik
  on notifikasi (user_id, jenis, referensi_id);

alter table notifikasi enable row level security;

drop policy if exists "Lihat notifikasi sendiri" on notifikasi;
drop policy if exists "Tandai notifikasi sendiri" on notifikasi;
create policy "Lihat notifikasi sendiri" on notifikasi for select
  using (auth.uid() = user_id);
create policy "Tandai notifikasi sendiri" on notifikasi for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

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

drop trigger if exists after_tugas_baru on tugas;
create trigger after_tugas_baru
  after insert on tugas
  for each row execute function trg_notifikasi_tugas_baru();

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

drop trigger if exists after_pengumuman_pin on pengumuman;
create trigger after_pengumuman_pin
  after insert or update of pinned on pengumuman
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

drop trigger if exists after_komentar_sebutan on pengumuman_komentar;
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
