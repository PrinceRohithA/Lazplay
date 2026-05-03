INSERT INTO users (email, name, oauth_provider, oauth_id)
VALUES
  ('player1@lazplay.local', 'Player One', 'mock', 'player1')
ON CONFLICT (email) DO NOTHING;

INSERT INTO games (name, version, file_path, size)
VALUES
  ('Sample Game', '1', 'game_v1.zip', 0)
ON CONFLICT (name, version) DO NOTHING;

INSERT INTO user_games (user_id, game_id)
SELECT u.id, g.id
FROM users u
JOIN games g ON g.name = 'Sample Game' AND g.version = '1'
WHERE u.email = 'player1@lazplay.local'
ON CONFLICT (user_id, game_id) DO NOTHING;
