-- ═══════════════════════════════════════════════════════════════════════════
-- NRI Remit — Supabase schema
-- Run this in Supabase SQL Editor (Database > SQL Editor > New Query)
-- ═══════════════════════════════════════════════════════════════════════════

-- Providers table — holds affiliate links so you can update them WITHOUT redeploying
create table if not exists providers (
  id text primary key,                    -- 'wise', 'remitly', 'xe', 'ofx', 'instarem'
  name text not null,
  color text not null,
  bg_color text not null,
  initial text not null,
  fee numeric default 0,
  fee_type text default 'fixed',           -- 'fixed' | 'none' | 'percent'
  speed text not null,                     -- 'Instant', '1-3 hrs', etc.
  cookie_window text,
  cpa_estimate numeric,                    -- expected commission in AUD
  affiliate_url text,                      -- ⚠️ NULL until you get approved — app falls back to homepage
  rating numeric default 4.5,
  active boolean default true,
  sort_order int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Seed providers (affiliate_url left NULL — fill in once approved)
insert into providers (id, name, color, bg_color, initial, fee, fee_type, speed, cookie_window, cpa_estimate, rating, sort_order) values
  ('wise',     'Wise',      '#185FA5', '#E6F1FB', 'W', 4.25, 'fixed', 'Instant',   'No expiry', 19, 4.9, 1),
  ('remitly',  'Remitly',   '#3C3489', '#EEEDFE', 'R', 0,    'none',  '1–3 hrs',   '30 days',   15, 4.7, 2),
  ('xe',       'XE Money',  '#854F0B', '#FAEEDA', 'X', 2.99, 'fixed', 'Same day',  '30 days',   12, 4.5, 3),
  ('ofx',      'OFX',       '#0F6E56', '#E1F5EE', 'O', 0,    'none',  '1–2 days',  '45 days',   14, 4.4, 4),
  ('instarem', 'Instarem',  '#712B13', '#FAECE7', 'I', 0,    'none',  '1 day',     '30 days',   10, 4.3, 5)
on conflict (id) do nothing;

-- User alerts / reminders
create table if not exists alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  type text not null,                      -- 'rate' | 'recurring' | 'seasonal' | 'custom'
  label text not null,
  threshold_rate numeric,                  -- for 'rate' type: trigger when rate exceeds this
  recurring_day int,                       -- for 'recurring' type: day of month (1-31)
  recurring_amount numeric,
  active boolean default true,
  last_triggered_at timestamptz,
  created_at timestamptz default now()
);

alter table alerts enable row level security;

create policy "Users can view own alerts" on alerts
  for select using (auth.uid() = user_id);
create policy "Users can insert own alerts" on alerts
  for insert with check (auth.uid() = user_id);
create policy "Users can update own alerts" on alerts
  for update using (auth.uid() = user_id);
create policy "Users can delete own alerts" on alerts
  for delete using (auth.uid() = user_id);

-- Transfer history — what the user logged after clicking through to a provider
create table if not exists transfer_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  provider_id text references providers(id),
  amount_sent numeric not null,            -- in AUD
  amount_received numeric,                 -- in INR (user can confirm later)
  rate_used numeric,
  send_currency text default 'AUD',
  receive_currency text default 'INR',
  status text default 'clicked',           -- 'clicked' | 'confirmed' | 'cancelled'
  clicked_at timestamptz default now(),
  confirmed_at timestamptz
);

alter table transfer_history enable row level security;

create policy "Users can view own history" on transfer_history
  for select using (auth.uid() = user_id);
create policy "Users can insert own history" on transfer_history
  for insert with check (auth.uid() = user_id);
create policy "Users can update own history" on transfer_history
  for update using (auth.uid() = user_id);

-- Rate snapshots — cached every time we fetch live rates, powers AI "30-day avg" insight
create table if not exists rate_snapshots (
  id bigint generated always as identity primary key,
  pair text not null default 'AUD_INR',
  rate numeric not null,
  source text default 'open.er-api.com',
  captured_at timestamptz default now()
);

create index if not exists idx_rate_snapshots_captured_at on rate_snapshots (captured_at desc);

-- Click tracking — for your own analytics on which provider converts best
create table if not exists affiliate_clicks (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete set null,
  provider_id text references providers(id),
  amount_aud numeric,
  rate_at_click numeric,
  clicked_at timestamptz default now()
);
