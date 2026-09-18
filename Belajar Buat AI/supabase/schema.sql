-- ==============================================================================
-- CIPUY AI - SUPABASE DATABASE SCHEMA
-- Jalankan skrip ini di SQL Editor di dashboard Supabase Anda.
-- ==============================================================================

-- 1. Enable UUID extension
create extension if not exists "uuid-ossp";

-- 2. Tabel Profiles (Menyimpan data pengguna dan hak akses)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  full_name text,
  role text default 'user' check (role in ('user', 'admin')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Tabel Conversations (Daftar sesi obrolan pengguna)
create table if not exists public.conversations (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  title text default 'Percakapan Baru' not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Tabel Messages (Setiap prompt user dan balasan dari Cipuy AI)
create table if not exists public.messages (
  id uuid default gen_random_uuid() primary key,
  conversation_id uuid references public.conversations on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Buat index untuk pencarian cepat & performa
create index if not exists idx_conversations_user_id on public.conversations(user_id);
create index if not exists idx_conversations_updated_at on public.conversations(updated_at desc);
create index if not exists idx_messages_conversation_id on public.messages(conversation_id);
create index if not exists idx_messages_created_at on public.messages(created_at asc);

-- 5. Helper Function: Cek apakah user saat ini adalah Admin
create or replace function public.is_admin()
returns boolean as $$
declare
  user_role text;
begin
  select role into user_role from public.profiles where id = auth.uid();
  return coalesce(user_role, 'user') = 'admin';
end;
$$ language plpgsql security definer;

-- 6. Trigger Otomatis Pembuatan Profil saat User Mendaftar (Sign Up)
-- Pengguna pertama yang mendaftar akan otomatis dijadikan ADMIN!
create or replace function public.handle_new_user()
returns trigger as $$
declare
  profiles_count int;
  assigned_role text;
begin
  select count(*) into profiles_count from public.profiles;
  if profiles_count = 0 then
    assigned_role := 'admin';
  else
    assigned_role := 'user';
  end if;

  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    assigned_role
  );
  return new;
end;
$$ language plpgsql security definer;

-- Pasang trigger ke tabel auth.users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 7. Trigger Otomatis Update Timestamp pada Conversations saat ada Pesan Baru
create or replace function public.handle_new_message()
returns trigger as $$
begin
  update public.conversations
  set updated_at = now()
  where id = new.conversation_id;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_message_created on public.messages;
create trigger on_message_created
  after insert on public.messages
  for each row execute procedure public.handle_new_message();

-- 8. Fungsi Pembersih Database untuk Admin (Purge Old Chats)
-- Menghapus percakapan & pesan yang lebih lama dari X hari untuk menghemat kuota Supabase
create or replace function public.purge_old_conversations(days_old int)
returns int as $$
declare
  deleted_count int;
begin
  -- Hanya admin yang boleh menjalankan fungsi ini
  if not public.is_admin() then
    raise exception 'Akses ditolak: Hanya admin yang dapat menjalankan purge database.';
  end if;

  delete from public.conversations
  where updated_at < (now() - (days_old || ' days')::interval);
  
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$ language plpgsql security definer;

-- 9. Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

-- Policies untuk PROFILES:
create policy "User dapat melihat profil sendiri atau Admin dapat melihat semua"
  on public.profiles for select
  using (auth.uid() = id or public.is_admin());

create policy "User dapat mengedit profil sendiri"
  on public.profiles for update
  using (auth.uid() = id);

-- Policies untuk CONVERSATIONS:
create policy "User melihat percakapan miliknya atau Admin melihat semua"
  on public.conversations for select
  using (auth.uid() = user_id or public.is_admin());

create policy "User membuat percakapan sendiri"
  on public.conversations for insert
  with check (auth.uid() = user_id);

create policy "User mengubah percakapan sendiri"
  on public.conversations for update
  using (auth.uid() = user_id);

create policy "User menghapus percakapan sendiri atau Admin menghapus"
  on public.conversations for delete
  using (auth.uid() = user_id or public.is_admin());

-- Policies untuk MESSAGES:
create policy "User melihat pesan miliknya atau Admin melihat semua"
  on public.messages for select
  using (auth.uid() = user_id or public.is_admin());

create policy "User membuat pesan sendiri"
  on public.messages for insert
  with check (auth.uid() = user_id);

create policy "User atau Admin dapat menghapus pesan"
  on public.messages for delete
  using (auth.uid() = user_id or public.is_admin());

