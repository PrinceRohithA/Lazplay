-- Use this only if Catalyst Data Store constraints become a blocker.
-- R2 remains primary binary storage either way.

create table users (
  id text primary key,
  email text unique not null,
  username text unique not null,
  display_name text not null,
  password_hash text not null,
  roles text not null default 'PLAYER',
  status text not null default 'ACTIVE',
  avatar_url text,
  bio text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table developers (
  id text primary key,
  user_id text unique not null references users(id) on delete cascade,
  display_name text not null,
  slug text unique not null,
  bio text,
  website text,
  support_email text,
  verification_status text not null default 'PENDING',
  payout_status text not null default 'INACTIVE',
  created_at timestamptz not null default now()
);

create table games (
  id text primary key,
  developer_id text not null references developers(id),
  slug text unique not null,
  title text not null,
  tagline text,
  description text,
  status text not null default 'DRAFT',
  price_type text not null default 'FREE',
  price integer not null default 0,
  currency text not null default 'INR',
  genres jsonb not null default '[]',
  tags jsonb not null default '[]',
  platforms jsonb not null default '[]',
  featured boolean not null default false,
  weekly_play_count integer not null default 0,
  latest_version_id text,
  media_json jsonb not null default '{}',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table versions (
  id text primary key,
  game_id text not null references games(id) on delete cascade,
  version text not null,
  platform text not null,
  runtime text,
  entrypoint text,
  distribution_type text not null default 'CHUNKED',
  artifact_object_key text,
  manifest_object_key text,
  size_bytes bigint,
  checksum_sha256 text,
  status text not null default 'WAITING_FOR_UPLOAD',
  created_at timestamptz not null default now()
);

alter table games add constraint games_latest_version_fk foreign key (latest_version_id) references versions(id);

create table manifests (
  id text primary key,
  game_id text not null references games(id) on delete cascade,
  version_id text unique not null references versions(id) on delete cascade,
  object_key text,
  manifest_hash text not null,
  distribution_type text not null default 'CHUNKED',
  manifest_json jsonb not null,
  chunk_count integer,
  total_bytes bigint,
  created_at timestamptz not null default now()
);

create table purchases (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  game_id text not null references games(id) on delete cascade,
  user_game_key text unique not null,
  provider text not null,
  provider_order_id text,
  provider_payment_id text,
  amount integer,
  currency text default 'INR',
  status text not null,
  created_at timestamptz not null default now()
);

create table cosmetics (
  id text primary key,
  game_id text not null references games(id) on delete cascade,
  sku text unique not null,
  name text not null,
  kind text not null,
  metadata_json jsonb not null default '{}',
  price integer,
  status text not null default 'ACTIVE'
);

create table achievements (
  id text primary key,
  game_id text not null references games(id) on delete cascade,
  code text not null,
  title text not null,
  description text,
  icon_object_key text,
  is_hidden boolean not null default false,
  points integer not null default 0
);

create table comments (
  id text primary key,
  game_id text not null references games(id) on delete cascade,
  user_id text not null references users(id) on delete cascade,
  parent_id text,
  body text not null,
  status text not null default 'VISIBLE',
  moderation_reason text,
  created_at timestamptz not null default now()
);

create table reports (
  id text primary key,
  reporter_user_id text not null references users(id),
  target_type text not null,
  target_id text not null,
  reason text not null,
  body text,
  status text not null default 'OPEN',
  resolved_by text references users(id),
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create table admin_logs (
  id text primary key,
  actor_user_id text not null references users(id),
  action text not null,
  target_type text not null,
  target_id text not null,
  metadata_json jsonb,
  ip_address text,
  created_at timestamptz not null default now()
);

create index idx_games_status_featured on games(status, featured);
create index idx_games_trending on games(status, weekly_play_count desc);
create index idx_versions_game on versions(game_id);
create index idx_purchases_user_game on purchases(user_id, game_id);
create index idx_comments_game on comments(game_id, status, created_at desc);
create index idx_admin_logs_target on admin_logs(target_type, target_id);
