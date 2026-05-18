import { prisma } from '../prisma.js';

export function registerCosmeticsRoutes(router, { ok, HttpError, requireAuth, createId }) {
  router.add('GET', '/cosmetics/platform', async (_req, _ctx) => {
    const cosmetics = await prisma.cosmetic.findMany({
      where: { sourceType: 'platform', status: 'ACTIVE' },
      take: 500
    });
    return ok({ cosmetics });
  });

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
}
