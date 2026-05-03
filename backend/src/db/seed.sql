INSERT INTO users (email, name, oauth_provider, oauth_id, role, bio)
VALUES
  ('player1@lazplay.local', 'Player One', 'mock', 'player1', 'player', 'Collector and community regular.'),
  ('creator@lazplay.local', 'Moon Quarry', 'mock', 'moon-quarry', 'creator', 'Small team making strange, cozy games.'),
  ('admin@lazplay.local', 'LazPlay Admin', 'mock', 'admin', 'admin', 'Platform moderation account.')
ON CONFLICT (email)
DO UPDATE SET
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  bio = EXCLUDED.bio,
  updated_at = NOW();

INSERT INTO games (
  name,
  version,
  file_path,
  size,
  slug,
  developer_id,
  description,
  genre,
  price_cents,
  cover_art,
  status,
  tags,
  platforms,
  rating,
  review_count,
  download_count
)
SELECT
  'Night Market',
  '1.2.4',
  'night-market_v1.2.4.zip',
  0,
  'night-market',
  u.id,
  'Explore a neon bazaar after midnight, trade favors with ghosts, and build a tiny empire from rumors.',
  'Indie RPG',
  0,
  'linear-gradient(135deg, #ff9d2e, #15171d 48%, #36d7bd)',
  'published',
  ARRAY['Indie', 'Story Rich', 'Pixel Art'],
  ARRAY['Windows', 'Linux', 'Web'],
  4.9,
  1842,
  18240
FROM users u
WHERE u.email = 'creator@lazplay.local'
ON CONFLICT (name, version)
DO UPDATE SET
  slug = EXCLUDED.slug,
  developer_id = EXCLUDED.developer_id,
  description = EXCLUDED.description,
  genre = EXCLUDED.genre,
  price_cents = EXCLUDED.price_cents,
  cover_art = EXCLUDED.cover_art,
  status = EXCLUDED.status,
  tags = EXCLUDED.tags,
  platforms = EXCLUDED.platforms,
  rating = EXCLUDED.rating,
  review_count = EXCLUDED.review_count,
  download_count = EXCLUDED.download_count,
  updated_at = NOW();

INSERT INTO games (
  name,
  version,
  file_path,
  size,
  slug,
  developer_id,
  description,
  genre,
  price_cents,
  cover_art,
  status,
  tags,
  platforms,
  rating,
  review_count,
  download_count
)
SELECT
  'Rift Runners',
  '2.0.1',
  'rift-runners_v2.0.1.zip',
  0,
  'rift-runners',
  u.id,
  'Dash between collapsing dimensions, stack absurd relics, and survive a score-chasing gauntlet.',
  'Action Roguelite',
  1999,
  'linear-gradient(135deg, #37d8bd, #15171d 46%, #ffb15a)',
  'published',
  ARRAY['Fast-Paced', 'Boss Rush', 'Controller'],
  ARRAY['Windows', 'Linux'],
  4.7,
  928,
  12104
FROM users u
WHERE u.email = 'creator@lazplay.local'
ON CONFLICT (name, version)
DO UPDATE SET
  slug = EXCLUDED.slug,
  developer_id = EXCLUDED.developer_id,
  description = EXCLUDED.description,
  genre = EXCLUDED.genre,
  price_cents = EXCLUDED.price_cents,
  cover_art = EXCLUDED.cover_art,
  status = EXCLUDED.status,
  tags = EXCLUDED.tags,
  platforms = EXCLUDED.platforms,
  rating = EXCLUDED.rating,
  review_count = EXCLUDED.review_count,
  download_count = EXCLUDED.download_count,
  updated_at = NOW();

INSERT INTO games (
  name,
  version,
  file_path,
  size,
  slug,
  developer_id,
  description,
  genre,
  price_cents,
  cover_art,
  status,
  tags,
  platforms,
  rating,
  review_count,
  download_count
)
SELECT
  'Moon Ledger',
  '1.8.0',
  'moon-ledger_v1.8.0.zip',
  0,
  'moon-ledger',
  u.id,
  'Run a tiny orbital storefront, balance a weird economy, and keep the moon customers happy.',
  'Simulation',
  0,
  'linear-gradient(135deg, #ffb15a, #15171d 44%, #35c9b3)',
  'published',
  ARRAY['Free', 'Management', 'Relaxing'],
  ARRAY['Windows', 'Linux', 'Web'],
  4.5,
  1302,
  34011
FROM users u
WHERE u.email = 'creator@lazplay.local'
ON CONFLICT (name, version)
DO UPDATE SET
  slug = EXCLUDED.slug,
  developer_id = EXCLUDED.developer_id,
  description = EXCLUDED.description,
  genre = EXCLUDED.genre,
  price_cents = EXCLUDED.price_cents,
  cover_art = EXCLUDED.cover_art,
  status = EXCLUDED.status,
  tags = EXCLUDED.tags,
  platforms = EXCLUDED.platforms,
  rating = EXCLUDED.rating,
  review_count = EXCLUDED.review_count,
  download_count = EXCLUDED.download_count,
  updated_at = NOW();

INSERT INTO user_games (user_id, game_id, source, price_cents)
SELECT u.id, g.id, 'seed', 0
FROM users u
JOIN games g ON g.slug IN ('night-market', 'moon-ledger')
WHERE u.email = 'player1@lazplay.local'
ON CONFLICT (user_id, game_id) DO NOTHING;

INSERT INTO wishlist_items (user_id, game_id)
SELECT u.id, g.id
FROM users u
JOIN games g ON g.slug = 'rift-runners'
WHERE u.email = 'player1@lazplay.local'
ON CONFLICT (user_id, game_id) DO NOTHING;

INSERT INTO community_threads (user_id, game_id, category, title, body, likes, replies)
SELECT u.id, g.id, 'Discussions', 'Best hidden indie gems in LazPlay?', 'Share the small projects that deserve more attention.', 43, 18
FROM users u
LEFT JOIN games g ON g.slug = 'night-market'
WHERE u.email = 'player1@lazplay.local'
  AND NOT EXISTS (
    SELECT 1
    FROM community_threads existing
    WHERE existing.title = 'Best hidden indie gems in LazPlay?'
  );

INSERT INTO notifications (user_id, type, title, detail, unread)
SELECT u.id, 'Update', 'Night Market patch 1.2.4 is live', 'Save stability and vendor balancing improvements.', TRUE
FROM users u
WHERE u.email = 'player1@lazplay.local'
  AND NOT EXISTS (
    SELECT 1
    FROM notifications existing
    WHERE existing.user_id = u.id
      AND existing.title = 'Night Market patch 1.2.4 is live'
  );
