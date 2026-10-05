-- Solusi Permanen untuk error supabase_functions.http_request()
-- Jalankan skrip ini langsung di SQL Editor Supabase Anda

-- 1. Aktifkan ekstensi HTTP pg_net
create extension if not exists pg_net;

-- 2. Buat fungsi trigger pemanggil Edge Function
create or replace function public.trg_pemicu_webpush()
returns trigger
language plpgsql
security definer
as $$
begin
  perform net.http_post(
    url := 'https://qrohmpdatdqljhxirzub.supabase.co/functions/v1/rapid-handler',
    headers := jsonb_build_object('Content-Type', 'application/json'),
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

-- 3. Pasang trigger ke tabel notifikasi saat ada data baru dimasukkan
drop trigger if exists after_notifikasi_kirim_push on notifikasi;
create trigger after_notifikasi_kirim_push
  after insert on notifikasi
  for each row execute function public.trg_pemicu_webpush();
