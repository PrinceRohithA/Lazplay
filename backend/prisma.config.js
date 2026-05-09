// prisma.config.js — Prisma v7 configuration
// See: https://pris.ly/d/config-datasource
import { defineConfig } from 'prisma/config';

export default defineConfig({
  datasourceUrl: process.env.DATABASE_URL,
});
