-- Tambah notifikasi untuk pengumuman baru.
-- Aman dijalankan ulang. Tidak menghapus data lama.

alter table notifikasi drop constraint if exists notifikasi_jenis_check;
alter table notifikasi
  add constraint notifikasi_jenis_check
  check (jenis in ('tugas_baru', 'deadline', 'pengumuman_baru', 'pengumuman_pin', 'sebutan'));

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

drop trigger if exists after_pengumuman_baru on pengumuman;
create trigger after_pengumuman_baru
  after insert on pengumuman
  for each row execute function trg_notifikasi_pengumuman_baru();

-- Pin cukup saat status berubah jadi dipin, supaya pengumuman baru tidak dobel.
drop trigger if exists after_pengumuman_pin on pengumuman;
create trigger after_pengumuman_pin
  after update of pinned on pengumuman
  for each row execute function trg_notifikasi_pengumuman_pin();
