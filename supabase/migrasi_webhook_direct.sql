-- Solusi Utama: Menambahkan Header Authorization (Bearer Token) untuk Supabase API Gateway (Kong)
-- Tanpa header Authorization, API Gateway Supabase mengembalikan error 404 NOT_FOUND

create extension if not exists pg_net;

create or replace function public.trg_pemicu_webpush()
returns trigger
language plpgsql
security definer
as $$
declare
  anon_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFyb2htcGRhdGRxbGpoeGlyenViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAzNjczNDksImV4cCI6MjEwNTk0MzM0OX0.oyIWOEmA439U3heHxgR0MEZM0ev8ENikV0AA9hetvXs';
begin
  perform net.http_post(
    url := 'https://qrohmpdatdqljhxirzub.supabase.co/functions/v1/rapid-handler',
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

drop trigger if exists after_notifikasi_kirim_push on notifikasi;
create trigger after_notifikasi_kirim_push
  after insert on notifikasi
  for each row execute function public.trg_pemicu_webpush();
