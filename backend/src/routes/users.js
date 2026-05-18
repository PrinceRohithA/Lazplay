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
          }
      }
    });
    
    if (!user) throw new HttpError(404, 'USER_NOT_FOUND', 'User profile not found');
    
    return ok({ 
        profile: {
            id: user.id,
            username: user.username,
            displayName: user.displayName,
            avatarUrl: user.avatarUrl,
            bio: user.bio,
            roles: user.roles,
            equipped: user.equippedCosmetics.map(e => ({
                slot: e.slot,
                cosmetic: e.cosmetic
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
