// prisma/seed.js — run with: node prisma/seed.js
import crypto from 'node:crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const hashPassword = (password, salt = crypto.randomBytes(16).toString('hex')) => {
  const hash = crypto.pbkdf2Sync(password, salt, 120000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
};

const id = (prefix) => `${prefix}_${crypto.randomUUID().replaceAll('-','').slice(0,16)}`;

async function main() {
  console.log('Seeding database...');

  // Upsert users
  await prisma.user.upsert({
    where: { id: 'usr_player' },
    update: {},
    create: {
      id: 'usr_player', username: 'player', email: 'player@example.com',
      passwordHash: hashPassword('Password123!'), displayName: 'Neon Runner',
      bio: 'Arcade player and lobby host.', avatarUrl: '', roles: ['PLAYER'], status: 'ACTIVE',
    },
  });
  await prisma.user.upsert({
    where: { id: 'usr_dev' },
    update: {},
    create: {
      id: 'usr_dev', username: 'developer', email: 'dev@example.com',
      passwordHash: hashPassword('Password123!'), displayName: 'Neon Labs Dev',
      bio: 'Builds games for LazPlay.', avatarUrl: '', roles: ['PLAYER', 'DEVELOPER'], status: 'ACTIVE',
    },
  });
  await prisma.user.upsert({
    where: { id: 'usr_admin' },
    update: {},
    create: {
      id: 'usr_admin', username: 'admin', email: 'admin@example.com',
      passwordHash: hashPassword('Password123!'), displayName: 'System Admin',
      bio: 'LazPlay operator.', avatarUrl: '', roles: ['PLAYER', 'DEVELOPER', 'ADMIN'], status: 'ACTIVE',
    },
  });

  // Developer profile
  await prisma.developerProfile.upsert({
    where: { id: 'dev_neon_labs' },
    update: {},
    create: {
      id: 'dev_neon_labs', userId: 'usr_dev', displayName: 'Neon Labs',
      website: 'https://neonlabs.example.com', supportEmail: 'support@neonlabs.example.com',
      verificationStatus: 'VERIFIED', payoutStatus: 'ACTIVE',
    },
  });

  // Games
  await prisma.game.upsert({
    where: { id: 'game_cyber_quest' },
    update: {},
    create: {
      id: 'game_cyber_quest', developerId: 'dev_neon_labs', slug: 'cyber-quest',
      title: 'Cyber Quest', shortDescription: 'Run-and-gun arcade adventure through neon sectors.',
      description: 'A high-octane run-and-gun adventure through the neon-drenched sectors of Neo-Tokyo.',
      price: 49900, currency: 'INR', priceType: 'PAID', releaseDate: '2026-05-01',
      publisher: 'Neon Labs', genres: ['Action', 'Platformer'], tags: ['Cyberpunk', 'Multiplayer'],
      platforms: ['PC', 'CLOUD'], status: 'PUBLISHED', featured: true,
      coverUrl: 'https://cdn.lazplay.tech/games/cyber-quest/cover.jpg',
      heroImageUrl: 'https://cdn.lazplay.tech/games/cyber-quest/hero.jpg',
      latestBuildId: 'build_cyber_webgl_104',
      systemRequirements: {
        minimum: { cpu: 'Dual core', memory: '4 GB', storage: '2 GB' },
        recommended: { cpu: 'Quad core', memory: '8 GB', storage: '4 GB' },
      },
      publishedAt: new Date(),
    },
  });
  await prisma.game.upsert({
    where: { id: 'game_neon_drifter' },
    update: {},
    create: {
      id: 'game_neon_drifter', developerId: 'dev_neon_labs', slug: 'neon-drifter-84',
      title: 'Neon Drifter 84', shortDescription: 'High-speed synthwave racing protocol.',
      description: 'Race through retro-futuristic highways with hosted multiplayer.',
      price: 24900, currency: 'INR', priceType: 'PAID', releaseDate: '2026-04-20',
      publisher: 'Neon Labs', genres: ['Racing'], tags: ['Arcade', 'Multiplayer'],
      platforms: ['PC', 'CLOUD'], status: 'PUBLISHED', featured: true,
      coverUrl: 'https://cdn.lazplay.tech/games/neon-drifter/cover.jpg',
      heroImageUrl: 'https://cdn.lazplay.tech/games/neon-drifter/hero.jpg',
      latestBuildId: 'build_neon_webgl_100',
      systemRequirements: {
        minimum: { cpu: 'Dual core', memory: '4 GB', storage: '1 GB' },
        recommended: { cpu: 'Quad core', memory: '8 GB', storage: '2 GB' },
      },
      publishedAt: new Date(),
    },
  });
  await prisma.game.upsert({
    where: { id: 'game_terminal_defense' },
    update: {},
    create: {
      id: 'game_terminal_defense', developerId: 'dev_neon_labs', slug: 'terminal-defense',
      title: 'Terminal Defense', shortDescription: 'Command-line strategy defense game.',
      description: 'Protect your data from incoming breaches in real time.',
      price: 0, currency: 'INR', priceType: 'FREE', releaseDate: '2026-04-01',
      publisher: 'Neon Labs', genres: ['Strategy'], tags: ['Indie', 'Singleplayer'],
      platforms: ['WEB', 'CLOUD'], status: 'PUBLISHED', featured: false,
      coverUrl: 'https://cdn.lazplay.tech/games/terminal-defense/cover.jpg',
      heroImageUrl: 'https://cdn.lazplay.tech/games/terminal-defense/hero.jpg',
      latestBuildId: 'build_terminal_webgl_100',
      systemRequirements: {
        minimum: { cpu: 'Dual core', memory: '2 GB', storage: '512 MB' },
        recommended: { cpu: 'Dual core', memory: '4 GB', storage: '1 GB' },
      },
      publishedAt: new Date(),
    },
  });

  // Builds
  for (const build of [
    { id: 'build_cyber_webgl_104', gameId: 'game_cyber_quest', version: '1.0.4', platform: 'WEBGL', runtime: 'BROWSER', entrypoint: 'index.html', changelog: 'Improved multiplayer latency.', status: 'DEPLOYED', scanStatus: 'PASSED', sizeBytes: 536870912n },
    { id: 'build_neon_webgl_100', gameId: 'game_neon_drifter', version: '1.0.0', platform: 'WEBGL', runtime: 'BROWSER', entrypoint: 'index.html', changelog: 'Initial release.', status: 'DEPLOYED', scanStatus: 'PASSED', sizeBytes: 300000000n },
    { id: 'build_terminal_webgl_100', gameId: 'game_terminal_defense', version: '1.0.0', platform: 'WEBGL', runtime: 'BROWSER', entrypoint: 'index.html', changelog: 'Initial release.', status: 'DEPLOYED', scanStatus: 'PASSED', sizeBytes: 120000000n },
  ]) {
    await prisma.gameBuild.upsert({ where: { id: build.id }, update: {}, create: build });
  }

  // Media
  await prisma.gameMedia.upsert({
    where: { id: 'media_cyber_1' },
    update: {},
    create: { id: 'media_cyber_1', gameId: 'game_cyber_quest', type: 'IMAGE', url: 'https://cdn.lazplay.tech/games/cyber-quest/screenshot-1.jpg', alt: 'Cyber Quest screenshot', sortOrder: 1 },
  });

  // Review
  await prisma.gameReview.upsert({
    where: { id: 'rev_seed_1' },
    update: {},
    create: { id: 'rev_seed_1', gameId: 'game_cyber_quest', userId: 'usr_player', rating: 5, body: 'Great multiplayer hosting performance.' },
  });

  // Library & entitlements for player
  await prisma.libraryItem.upsert({
    where: { userId_gameId: { userId: 'usr_player', gameId: 'game_cyber_quest' } },
    update: {},
    create: { id: 'lib_seed_1', userId: 'usr_player', gameId: 'game_cyber_quest', ownershipType: 'PURCHASED', installedStatus: 'READY', favorite: false, playtimeSeconds: 8420, installedBuildVersion: '1.0.4', lastPlayedAt: new Date() },
  });
  await prisma.libraryItem.upsert({
    where: { userId_gameId: { userId: 'usr_player', gameId: 'game_terminal_defense' } },
    update: {},
    create: { id: 'lib_seed_2', userId: 'usr_player', gameId: 'game_terminal_defense', ownershipType: 'FREE', installedStatus: 'READY', favorite: false, playtimeSeconds: 0, installedBuildVersion: '1.0.0' },
  });
  await prisma.entitlement.upsert({
    where: { userId_gameId: { userId: 'usr_player', gameId: 'game_cyber_quest' } },
    update: {},
    create: { id: 'ent_seed_1', userId: 'usr_player', gameId: 'game_cyber_quest', source: 'SEED', status: 'ACTIVE' },
  });
  await prisma.entitlement.upsert({
    where: { userId_gameId: { userId: 'usr_player', gameId: 'game_terminal_defense' } },
    update: {},
    create: { id: 'ent_seed_2', userId: 'usr_player', gameId: 'game_terminal_defense', source: 'FREE', status: 'ACTIVE' },
  });
  await prisma.wishlistItem.upsert({
    where: { userId_gameId: { userId: 'usr_player', gameId: 'game_neon_drifter' } },
    update: {},
    create: { id: 'wish_seed_1', userId: 'usr_player', gameId: 'game_neon_drifter' },
  });

  // Server nodes
  for (const node of [
    { id: 'node_1', region: 'ap-south-1', status: 'HEALTHY', cpuPercent: 42, memoryPercent: 45, packetLossPercent: 0.2, activeInstances: 12 },
    { id: 'node_3', region: 'ap-south-1', status: 'DEGRADED', cpuPercent: 84, memoryPercent: 45, packetLossPercent: 15.2, activeInstances: 120 },
  ]) {
    await prisma.serverNode.upsert({ where: { id: node.id }, update: {}, create: node });
  }

  console.log('Seed complete.');
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
