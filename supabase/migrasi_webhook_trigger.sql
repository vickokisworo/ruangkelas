-- Solusi Error: schema "supabase_functions" does not exist
-- Jalankan skrip ini di SQL Editor Dashboard Supabase Anda

-- 1. Aktifkan ekstensi pg_net dan buat skema supabase_functions
create extension if not exists pg_net;
create schema if not exists supabase_functions;

-- 2. (Opsional) Jika ingin membuat Trigger Webhook otomatis tanpa UI Dashboard:
-- Ganti <PROJECT_REF> dan <ANON_KEY_ATAU_SERVICE_KEY> sesuai project Supabase Anda

create or replace function public.trg_kirim_push_webhook()
returns trigger
language plpgsql
security definer
as $$
declare
  payload jsonb;
begin
  payload := jsonb_build_object(
    'type', tg_op,
    'table', tg_table_name,
    'schema', tg_table_schema,
    'record', row_to_json(new)
  );

  -- Memanggil Edge Function kirim-push via HTTP POST dari Database Supabase
  perform net.http_post(
    url := 'https://' || current_setting('request.jwt.claim.sub', true) || '.supabase.co/functions/v1/kirim-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json'
    ),
    body := payload
  );

  return new;
end;
$$;
