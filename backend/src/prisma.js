import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis;

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.APP_ENV === 'development'
      ? ['query', 'warn', 'error']
      : ['warn', 'error'],
  });

if (process.env.APP_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
