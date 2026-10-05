-- Migrasi tabel push_langganan untuk Web Push Notifications (PWA)
-- Digunakan untuk menyimpan endpoint langganan Web Push per perangkat pengguna

create table if not exists push_langganan (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Index untuk pencarian cepat berdasarkan user_id
create index if not exists idx_push_langganan_user on push_langganan (user_id);

-- Aktifkan Row Level Security (RLS)
alter table push_langganan enable row level security;

-- Policy agar pengguna hanya bisa melihat, menambah, mengubah, dan menghapus langganan miliknya sendiri
drop policy if exists "Kelola push_langganan sendiri" on push_langganan;
create policy "Kelola push_langganan sendiri" on push_langganan
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
