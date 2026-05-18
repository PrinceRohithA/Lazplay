import { prisma } from '../prisma.js';

const DEFAULT_PLATFORM_COSMETICS = [
  {
    id: 'cos_neon_glow',
    sku: 'neon_glow',
    name: 'Cyberpunk Neon Border',
    kind: 'border',
    sourceType: 'platform',
    price: 150,
    metadata: {
      borderColor: '#ff0055',
      glowColor: 'rgba(255, 0, 85, 0.6)',
      style: 'pulse',
    }
  },
  {
    id: 'cos_matrix_border',
    sku: 'matrix_border',
    name: 'Matrix Digital Border',
    kind: 'border',
    sourceType: 'platform',
    price: 200,
    metadata: {
      borderColor: '#00ff66',
      glowColor: 'rgba(0, 255, 102, 0.4)',
      style: 'matrix',
    }
  },
  {
    id: 'cos_diwali_sparkle',
    sku: 'diwali_sparkle',
    name: 'Diwali Golden Border',
    kind: 'border',
    sourceType: 'platform',
    price: 300,
    metadata: {
      borderColor: '#ffaa00',
      glowColor: 'rgba(255, 170, 0, 0.8)',
      style: 'gold-sparkle',
    }
  },
  {
    id: 'cos_cyberpunk_theme',
    sku: 'cyberpunk_theme',
    name: 'Retro Cyber Theme',
    kind: 'theme',
    sourceType: 'platform',
    price: 250,
    metadata: {
      bgGradient: 'linear-gradient(135deg, #0d0015 0%, #1a0033 100%)',
      textColor: '#00ffcc',
      accentColor: '#ff0055',
      primaryBg: '#110022',
      cardBg: 'rgba(30, 0, 50, 0.8)',
    }
  },
  {
    id: 'cos_sakura_theme',
    sku: 'sakura_theme',
    name: 'Sakura Petals Theme',
    kind: 'theme',
    sourceType: 'platform',
    price: 250,
    metadata: {
      bgGradient: 'linear-gradient(135deg, #150005 0%, #33001a 100%)',
      textColor: '#ffb3d9',
      accentColor: '#ff33aa',
      primaryBg: '#220011',
      cardBg: 'rgba(50, 0, 30, 0.8)',
    }
  },
  {
    id: 'cos_pixel_art',
    sku: 'pixel_art_avatar',
    name: 'Glitch Pixel Avatar Frame',
    kind: 'avatar',
    sourceType: 'platform',
    price: 180,
    metadata: {
      frameImage: '/assets/cosmetics/pixel-avatar-frame.png',
      animation: 'glitch',
    }
  },
  {
    id: 'cos_synthwave_banner',
    sku: 'synthwave_banner',
    name: 'Synthwave Skyline Banner',
    kind: 'banner',
    sourceType: 'platform',
    price: 350,
    metadata: {
      bannerUrl: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?auto=format&fit=crop&w=1200&q=80',
      opacity: 0.8,
    }
  }
];

const DEFAULT_PLATFORM_ACHIEVEMENTS = [
  {
    id: 'ach_first_game',
    code: 'FIRST_GAME',
    title: 'First Steps',
    description: 'Add your first game to your library.',
    points: 10,
    coinReward: 100,
  },
  {
    id: 'ach_playtime_1h',
    code: 'PLAYTIME_1H',
    title: 'Dedicated Player',
    description: 'Play games for a total of 1 hour (3600 seconds).',
    points: 25,
    coinReward: 250,
  },
  {
    id: 'ach_write_review',
    code: 'WRITE_REVIEW',
    title: 'Avid Reviewer',
    description: 'Write your first game review.',
    points: 15,
    coinReward: 150,
  },
  {
    id: 'ach_own_5_games',
    code: 'OWN_5_GAMES',
    title: 'Indie Collector',
    description: 'Have 5 or more games in your library.',
    points: 50,
    coinReward: 500,
  },
  {
    id: 'ach_custom_profile',
    code: 'CUSTOM_PROFILE',
    title: 'Social Explorer',
    description: 'Customize your bio or equip a cosmetic profile item.',
    points: 15,
    coinReward: 100,
  }
];

export function registerCosmeticsRoutes(router, ctx) {
  const { ok, HttpError, requireAuth, createId } = ctx;

  // 1. Fetch Cosmetics (Auto-Seeds if Empty)
  router.add('GET', '/cosmetics/platform', async (_req, _ctx) => {
    let cosmetics = await prisma.cosmetic.findMany({
      where: { sourceType: 'platform', status: 'ACTIVE' }
    });

    if (cosmetics.length === 0) {
      await Promise.all(DEFAULT_PLATFORM_COSMETICS.map(async (c) => {
        return prisma.cosmetic.upsert({
          where: { sku: c.sku },
          update: {},
          create: c
        });
      }));
      cosmetics = await prisma.cosmetic.findMany({
        where: { sourceType: 'platform', status: 'ACTIVE' }
      });
    }

    return ok(cosmetics);
  });

  // 2. Purchase Cosmetic with Coins
  router.add('POST', '/cosmetics/:sku/purchase', async (req, _ctx) => {
    const user = await requireAuth(req, prisma);
    const cosmetic = await prisma.cosmetic.findUnique({ where: { sku: req.params.sku } });
    
    if (!cosmetic) throw new HttpError(404, 'COSMETIC_NOT_FOUND', 'Cosmetic not found');
    if (cosmetic.status !== 'ACTIVE') throw new HttpError(400, 'UNAVAILABLE', 'Cosmetic is not active');
    
    const owns = await prisma.userInventory.findFirst({
        where: { userId: user.id, cosmeticId: cosmetic.id }
    });
    if (owns) throw new HttpError(409, 'ALREADY_OWNED', 'You already own this cosmetic');
    
    const price = Number(cosmetic.price || 0);
    const currentCoins = Number(user.coins || 0);
    
    if (currentCoins < price) {
        throw new HttpError(402, 'INSUFFICIENT_COINS', 'Not enough coins to purchase this cosmetic');
    }
    
    const [, inventory] = await prisma.$transaction([
        prisma.user.update({
            where: { id: user.id },
            data: { coins: currentCoins - price }
        }),
        prisma.userInventory.create({
            data: {
                id: createId('inv'),
                userId: user.id,
                cosmeticId: cosmetic.id
            }
        })
    ]);
    
    return ok({ inventory, remainingCoins: currentCoins - price });
  });

  // 3. Fetch Platform Achievements (Auto-Seeds if Empty)
  router.add('GET', '/achievements/platform', async (req, _ctx) => {
    const user = await requireAuth(req);

    let achievements = await prisma.achievement.findMany({
      where: { gameId: null }
    });

    if (achievements.length === 0) {
      await Promise.all(DEFAULT_PLATFORM_ACHIEVEMENTS.map(async (a) => {
        return prisma.achievement.upsert({
          where: { gameId_code: { gameId: null, code: a.code } },
          update: {},
          create: {
            id: a.id,
            gameId: null,
            code: a.code,
            title: a.title,
            description: a.description,
            points: a.points,
            coinReward: a.coinReward
          }
        });
      }));
      achievements = await prisma.achievement.findMany({
        where: { gameId: null }
      });
    }

    const unlocked = await prisma.userAchievement.findMany({
      where: { userId: user.id },
      include: { achievement: true }
    });

    const unlockedIds = new Set(unlocked.map(u => u.achievementId));

    const results = achievements.map(a => ({
      ...a,
      isUnlocked: unlockedIds.has(a.id),
      unlockedAt: unlocked.find(u => u.achievementId === a.id)?.unlockedAt || null
    }));

    return ok(results);
  });

  // 4. Achievement Verification & Auto-Unlock Engine
  router.add('POST', '/achievements/check', async (req, _ctx) => {
    const user = await requireAuth(req);

    // Dynamic stats computation for the current user
    const playSessions = await prisma.gamePlaySession.findMany({ where: { userId: user.id } });
    const totalPlaytime = playSessions.reduce((acc, s) => acc + (s.durationSeconds || 0), 0);
    const libraryCount = await prisma.libraryItem.count({ where: { userId: user.id } });
    const reviewsCount = await prisma.gameReview.count({ where: { userId: user.id } });
    const bioText = await prisma.user.findUnique({ where: { id: user.id }, select: { bio: true } });
    const equippedCount = await prisma.userEquippedCosmetic.count({ where: { userId: user.id } });
    const hasCustomized = !!bioText?.bio || equippedCount > 0;

    // Load or seed platform achievements
    let platformAchievements = await prisma.achievement.findMany({ where: { gameId: null } });
    if (platformAchievements.length === 0) {
      await Promise.all(DEFAULT_PLATFORM_ACHIEVEMENTS.map(async (a) => {
        return prisma.achievement.upsert({
          where: { gameId_code: { gameId: null, code: a.code } },
          update: {},
          create: {
            id: a.id,
            gameId: null,
            code: a.code,
            title: a.title,
            description: a.description,
            points: a.points,
            coinReward: a.coinReward
          }
        });
      }));
      platformAchievements = await prisma.achievement.findMany({ where: { gameId: null } });
    }

    const unlocked = await prisma.userAchievement.findMany({
      where: { userId: user.id }
    });
    const unlockedCodes = new Set(unlocked.map(u => {
      const match = platformAchievements.find(pa => pa.id === u.achievementId);
      return match ? match.code : null;
    }).filter(Boolean));

    const newlyUnlocked = [];
    let coinsToAward = 0;

    // Criteria mappings
    const criteria = {
      'FIRST_GAME': libraryCount >= 1,
      'PLAYTIME_1H': totalPlaytime >= 3600,
      'WRITE_REVIEW': reviewsCount >= 1,
      'OWN_5_GAMES': libraryCount >= 5,
      'CUSTOM_PROFILE': hasCustomized
    };

    for (const ach of platformAchievements) {
      if (criteria[ach.code] && !unlockedCodes.has(ach.code)) {
        newlyUnlocked.push(ach);
        coinsToAward += ach.coinReward;

        // Create achievement record
        await prisma.userAchievement.create({
          data: {
            id: createId('uach'),
            userId: user.id,
            achievementId: ach.id
          }
        });

        // Push real-time platform notification
        await prisma.notification.create({
          data: {
            id: createId('notif'),
            userId: user.id,
            type: 'ACHIEVEMENT_UNLOCKED',
            title: `🏆 Achievement Unlocked: ${ach.title}`,
            body: `Congratulations! You unlocked "${ach.title}" and earned ${ach.coinReward} coins.`
          }
        });
      }
    }

    if (coinsToAward > 0) {
      await prisma.user.update({
        where: { id: user.id },
        data: { coins: { increment: coinsToAward } }
      });
    }

    return ok({
      checked: true,
      newlyUnlocked,
      coinsAwarded: coinsToAward,
      stats: {
        totalPlaytime,
        libraryCount,
        reviewsCount,
        hasCustomized
      }
    });
  });

  // 5. Game-Specific Achievement Unlock API
  router.add('POST', '/games/:gameId/achievements/:code/unlock', async (req, _ctx) => {
    const user = await requireAuth(req);
    const { gameId, code } = req.params;

    const game = await prisma.game.findUnique({ where: { id: gameId } });
    if (!game) throw new HttpError(404, 'GAME_NOT_FOUND', 'Game not found');

    const libraryItem = await prisma.libraryItem.findUnique({
      where: { userId_gameId: { userId: user.id, gameId } }
    });
    if (!libraryItem) {
      throw new HttpError(403, 'NOT_OWNED', 'You must own or claim the game to unlock achievements.');
    }

    // Upsert the game achievement if not already registered in DB (dynamic on-demand registration)
    const achievement = await prisma.achievement.upsert({
      where: { gameId_code: { gameId, code } },
      update: {},
      create: {
        id: createId('ach'),
        gameId,
        code,
        title: code.replace(/_/g, ' '),
        description: `Unlocked during gameplay in ${game.title}.`,
        points: 20,
        coinReward: 50
      }
    });

    const alreadyUnlocked = await prisma.userAchievement.findUnique({
      where: { userId_achievementId: { userId: user.id, achievementId: achievement.id } }
    });

    if (alreadyUnlocked) {
      return ok({ success: true, alreadyUnlocked: true, achievement });
    }

    await prisma.$transaction([
      prisma.userAchievement.create({
        data: {
          id: createId('uach'),
          userId: user.id,
          achievementId: achievement.id
        }
      }),
      prisma.user.update({
        where: { id: user.id },
        data: { coins: { increment: achievement.coinReward } }
      }),
      prisma.notification.create({
        data: {
          id: createId('notif'),
          userId: user.id,
          type: 'ACHIEVEMENT_UNLOCKED',
          title: `🎮 Game Achievement: ${achievement.title}`,
          body: `You unlocked a secret in ${game.title} and earned ${achievement.coinReward} coins!`
        }
      })
    ]);

    return ok({ success: true, newlyUnlocked: true, achievement, coinsAwarded: achievement.coinReward });
  });
}
