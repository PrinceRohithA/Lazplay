import { execSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

/**
 * init-db-with-psql.js
 * 
 * This script initializes the database using the 'psql' CLI tool.
 */

const envFile = path.resolve('.env');
const envContent = fs.existsSync(envFile) ? fs.readFileSync(envFile, 'utf8') : '';
const dbUrlLine = envContent.split('\n').find(line => line.startsWith('DATABASE_URL='));
const dbUrlFromFile = dbUrlLine ? dbUrlLine.split('=')[1].replace(/["']/g, '').trim() : '';
const urlValue = process.env.DATABASE_URL || dbUrlFromFile;

if (!urlValue) {
  console.error('Error: DATABASE_URL not found in environment or .env');
  process.exit(1);
}

// Very simple parsing for standard postgresql://user:pass@host:port/db
try {
  const normalizedUrl = urlValue.replace(/^postgresql\+psycopg:\/\//, 'postgresql://');
  const url = new URL(normalizedUrl);
  const user = url.username;
  const password = url.password;
  const host = url.hostname;
  const port = url.port || '5432';
  const dbName = url.pathname.slice(1);

  console.log(`Initializing database: ${dbName} on ${host}:${port} as ${user}...`);

  process.env.PGPASSWORD = password;

  const psqlBase = `psql -h ${host} -p ${port} -U ${user}`;

  // 1. Create database
  console.log('> Creating database...');
  try {
    execSync(`${psqlBase} -d postgres -c "CREATE DATABASE ${dbName};"`, { stdio: 'inherit' });
  } catch (e) {
    console.log('  Note: Database creation skipped (might already exist or permission issue).');
  }

  // 2. Run Schema
  console.log('> Running schema (prisma/init.sql)...');
  execSync(`${psqlBase} -d ${dbName} -f prisma/init.sql`, { stdio: 'inherit' });

  // 3. Run Seed Data (dev only)
  const appEnv = (process.env.APP_ENV || 'development').toLowerCase();
  if (appEnv !== 'production' && fs.existsSync('prisma/seed-data.sql')) {
    console.log('> Running seed data (prisma/seed-data.sql)...');
    execSync(`${psqlBase} -d ${dbName} -f prisma/seed-data.sql`, { stdio: 'inherit' });
  } else if (appEnv === 'production') {
    console.log('> Skipping seed data (production environment).');
  }

  console.log('SUCCESS: Database initialized successfully.');
} catch (error) {
  console.error('ERROR: Database initialization failed.');
  console.error(error.message);
  process.exit(1);
}
