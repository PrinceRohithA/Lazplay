-- prisma/seed-data.sql

-- Initial Users (Passwords: Password123!)
-- Hash generated via PBKDF2: salt:hash
INSERT INTO "User" ("id", "username", "email", "passwordHash", "displayName", "bio", "roles", "status", "updatedAt")
VALUES 
('usr_player', 'player', 'player@example.com', '7c865181413a7c64c7f3e1b0c03426e6:e4904800d5be4aa79a187efb187bd85fc4904800d5be4aa79a187efb187bd85fc4904800d5be4aa79a187efb187bd85f', 'Neon Runner', 'Arcade player and lobby host.', ARRAY['PLAYER'], 'ACTIVE', NOW()),
('usr_dev', 'developer', 'dev@example.com', '7c865181413a7c64c7f3e1b0c03426e6:e4904800d5be4aa79a187efb187bd85fc4904800d5be4aa79a187efb187bd85fc4904800d5be4aa79a187efb187bd85f', 'Neon Labs Dev', 'Builds games for LazPlay.', ARRAY['PLAYER', 'DEVELOPER'], 'ACTIVE', NOW()),
('usr_admin', 'admin', 'admin@example.com', '7c865181413a7c64c7f3e1b0c03426e6:e4904800d5be4aa79a187efb187bd85fc4904800d5be4aa79a187efb187bd85fc4904800d5be4aa79a187efb187bd85f', 'System Admin', 'LazPlay operator.', ARRAY['PLAYER', 'DEVELOPER', 'ADMIN'], 'ACTIVE', NOW())
ON CONFLICT (id) DO NOTHING;

-- Developer Profile
INSERT INTO "DeveloperProfile" ("id", "userId", "displayName", "website", "supportEmail", "verificationStatus", "payoutStatus", "updatedAt")
VALUES 
('dev_neon_labs', 'usr_dev', 'Neon Labs', 'https://neonlabs.example.com', 'support@neonlabs.example.com', 'VERIFIED', 'ACTIVE', NOW())
ON CONFLICT (id) DO NOTHING;

-- Games
INSERT INTO "Game" ("id", "developerId", "slug", "title", "shortDescription", "description", "price", "currency", "priceType", "releaseDate", "publisher", "genres", "tags", "platforms", "status", "featured", "coverUrl", "heroImageUrl", "latestBuildId", "systemRequirements", "publishedAt", "updatedAt")
VALUES 
('game_cyber_quest', 'dev_neon_labs', 'cyber-quest', 'Cyber Quest', 'Run-and-gun arcade adventure through neon sectors.', 'A high-octane run-and-gun adventure through the neon-drenched sectors of Neo-Tokyo.', 49900, 'INR', 'PAID', '2026-05-01', 'Neon Labs', ARRAY['Action', 'Platformer'], ARRAY['Cyberpunk', 'Multiplayer'], ARRAY['PC', 'CLOUD'], 'PUBLISHED', true, 'https://cdn.lazplay.tech/games/cyber-quest/cover.jpg', 'https://cdn.lazplay.tech/games/cyber-quest/hero.jpg', 'build_cyber_webgl_104', '{"minimum": {"cpu": "Dual core", "memory": "4 GB", "storage": "2 GB"}, "recommended": {"cpu": "Quad core", "memory": "8 GB", "storage": "4 GB"}}'::jsonb, NOW(), NOW()),
('game_neon_drifter', 'dev_neon_labs', 'neon-drifter-84', 'Neon Drifter 84', 'High-speed synthwave racing protocol.', 'Race through retro-futuristic highways with hosted multiplayer.', 24900, 'INR', 'PAID', '2026-04-20', 'Neon Labs', ARRAY['Racing'], ARRAY['Arcade', 'Multiplayer'], ARRAY['PC', 'CLOUD'], 'PUBLISHED', true, 'https://cdn.lazplay.tech/games/neon-drifter/cover.jpg', 'https://cdn.lazplay.tech/games/neon-drifter/hero.jpg', 'build_neon_webgl_100', '{"minimum": {"cpu": "Dual core", "memory": "4 GB", "storage": "1 GB"}, "recommended": {"cpu": "Quad core", "memory": "8 GB", "storage": "2 GB"}}'::jsonb, NOW(), NOW()),
('game_terminal_defense', 'dev_neon_labs', 'terminal-defense', 'Terminal Defense', 'Command-line strategy defense game.', 'Protect your data from incoming breaches in real time.', 0, 'INR', 'FREE', '2026-04-01', 'Neon Labs', ARRAY['Strategy'], ARRAY['Indie', 'Singleplayer'], ARRAY['WEB', 'CLOUD'], 'PUBLISHED', false, 'https://cdn.lazplay.tech/games/terminal-defense/cover.jpg', 'https://cdn.lazplay.tech/games/terminal-defense/hero.jpg', 'build_terminal_webgl_100', '{"minimum": {"cpu": "Dual core", "memory": "2 GB", "storage": "512 MB"}, "recommended": {"cpu": "Dual core", "memory": "4 GB", "storage": "1 GB"}}'::jsonb, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Builds
INSERT INTO "GameBuild" ("id", "gameId", "version", "platform", "runtime", "entrypoint", "changelog", "status", "scanStatus", "sizeBytes")
VALUES 
('build_cyber_webgl_104', 'game_cyber_quest', '1.0.4', 'WEBGL', 'BROWSER', 'index.html', 'Improved multiplayer latency.', 'DEPLOYED', 'PASSED', 536870912),
('build_neon_webgl_100', 'game_neon_drifter', '1.0.0', 'WEBGL', 'BROWSER', 'index.html', 'Initial release.', 'DEPLOYED', 'PASSED', 300000000),
('build_terminal_webgl_100', 'game_terminal_defense', '1.0.0', 'WEBGL', 'BROWSER', 'index.html', 'Initial release.', 'DEPLOYED', 'PASSED', 120000000)
ON CONFLICT (id) DO NOTHING;

-- Media
INSERT INTO "GameMedia" ("id", "gameId", "type", "url", "alt", "sortOrder")
VALUES 
('media_cyber_1', 'game_cyber_quest', 'IMAGE', 'https://cdn.lazplay.tech/games/cyber-quest/screenshot-1.jpg', 'Cyber Quest screenshot', 1)
ON CONFLICT (id) DO NOTHING;

-- Reviews
INSERT INTO "GameReview" ("id", "gameId", "userId", "rating", "body", "updatedAt")
VALUES 
('rev_seed_1', 'game_cyber_quest', 'usr_player', 5, 'Great multiplayer hosting performance.', NOW())
ON CONFLICT (id) DO NOTHING;

-- Library & Entitlements
INSERT INTO "LibraryItem" ("id", "userId", "gameId", "ownershipType", "installedStatus", "favorite", "playtimeSeconds", "installedBuildVersion", "lastPlayedAt")
VALUES 
('lib_seed_1', 'usr_player', 'game_cyber_quest', 'PURCHASED', 'READY', false, 8420, '1.0.4', NOW()),
('lib_seed_2', 'usr_player', 'game_terminal_defense', 'FREE', 'READY', false, 0, '1.0.0', NULL)
ON CONFLICT (id) DO NOTHING;

INSERT INTO "Entitlement" ("id", "userId", "gameId", "source", "status")
VALUES 
('ent_seed_1', 'usr_player', 'game_cyber_quest', 'SEED', 'ACTIVE'),
('ent_seed_2', 'usr_player', 'game_terminal_defense', 'FREE', 'ACTIVE')
ON CONFLICT (id) DO NOTHING;

INSERT INTO "WishlistItem" ("id", "userId", "gameId")
VALUES 
('wish_seed_1', 'usr_player', 'game_neon_drifter')
ON CONFLICT (id) DO NOTHING;

-- Server Nodes
INSERT INTO "ServerNode" ("id", "region", "status", "cpuPercent", "memoryPercent", "packetLossPercent", "activeInstances")
VALUES 
('node_1', 'ap-south-1', 'HEALTHY', 42, 45, 0.2, 12),
('node_3', 'ap-south-1', 'DEGRADED', 84, 45, 15.2, 120)
ON CONFLICT (id) DO NOTHING;
