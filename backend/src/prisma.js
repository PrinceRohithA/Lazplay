// src/prisma.js — singleton Prisma client (Prisma v7)
// In Prisma v7, the datasource URL is passed to the constructor.
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis;

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasourceUrl: process.env.DATABASE_URL,
    log: process.env.APP_ENV === 'development'
      ? ['query', 'warn', 'error']
      : ['warn', 'error'],
  });

if (process.env.APP_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
