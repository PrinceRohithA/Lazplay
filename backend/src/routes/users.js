import { prisma } from '../prisma.js';

export function registerUsersRoutes(router, { ok, HttpError, requireAuth, createId }) {
  router.add('GET', '/users/:username/profile', async (req, _ctx) => {
    const user = await prisma.user.findUnique({
      where: { username: req.params.username },
      include: {
          equippedCosmetics: {
              include: {
                  cosmetic: true
              }
          },
          achievements: {
              include: {
                  achievement: true
              }
          },
          playSessions: {
              take: 5,
              orderBy: { startedAt: 'desc' },
              include: { game: true }
          },
          reviews: {
              include: { game: true }
          },
          libraryItems: {
              include: { game: true }
          }
      }
    });
    
    if (!user) throw new HttpError(404, 'USER_NOT_FOUND', 'User profile not found');

    const totalPlaytime = user.libraryItems.reduce((acc, item) => acc + (item.playtimeSeconds || 0), 0);
    
    return ok({ 
        profile: {
            id: user.id,
            username: user.username,
            displayName: user.displayName,
            avatarUrl: user.avatarUrl,
            bio: user.bio,
            roles: user.roles,
            coins: user.coins,
            equipped: user.equippedCosmetics.map(e => ({
                slot: e.slot,
                cosmetic: e.cosmetic
            })),
            achievements: user.achievements.map(ua => ({
                id: ua.achievement.id,
                code: ua.achievement.code,
                title: ua.achievement.title,
                description: ua.achievement.description,
                points: ua.achievement.points,
                coinReward: ua.achievement.coinReward,
                unlockedAt: ua.unlockedAt
            })),
            stats: {
                totalPlaytime,
                gamesCount: user.libraryItems.length,
                reviewsCount: user.reviews.length
            },
            recentActivity: user.playSessions.map(ps => ({
                gameTitle: ps.game.title,
                gameId: ps.game.id,
                playedAt: ps.startedAt,
                duration: ps.durationSeconds
            })),
            favoriteGames: user.libraryItems.filter(item => item.favorite).map(item => ({
                id: item.game.id,
                title: item.game.title,
                coverUrl: item.game.coverUrl
            }))
        } 
    });
  });

  router.add('GET', '/users/me/inventory', async (req, _ctx) => {
    const user = await requireAuth(req, prisma);
    const inventory = await prisma.userInventory.findMany({
        where: { userId: user.id },
        take: 1000
    });
    const equipped = await prisma.userEquippedCosmetic.findMany({
        where: { userId: user.id }
    });
    return ok({ inventory, equipped });
  });

  router.add('POST', '/users/me/equip', async (req, _ctx) => {
    const user = await requireAuth(req, prisma);
    const { slot, cosmeticId } = req.body || {};
    
    if (!slot || !cosmeticId) {
        throw new HttpError(400, 'VALIDATION_ERROR', 'slot and cosmeticId are required');
    }
    
    const owns = await prisma.userInventory.findFirst({
        where: { userId: user.id, cosmeticId }
    });
    if (!owns) throw new HttpError(403, 'NOT_OWNED', 'You do not own this cosmetic');
    
    const equipped = await prisma.userEquippedCosmetic.upsert({
        where: { userId_slot: { userId: user.id, slot: slot } },
        update: { cosmeticId },
        create: {
            id: createId('uec'),
            userId: user.id,
            slot,
            cosmeticId
        }
    });
    
    return ok({ equipped });
  });
}
