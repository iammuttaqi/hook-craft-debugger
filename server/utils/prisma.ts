import { PrismaClient } from '@prisma/client';
import fs from 'node:fs';
import path from 'node:path';
import { STARTER_DB_BASE64 } from './starter-db-embedded';

let prismaInstance: PrismaClient | null = null;

export function ensureDatabase(): string {
  // If explicitly overridden via environment variable (e.g. external Turso / LibSQL / Postgres)
  if (process.env.DATABASE_URL && !process.env.DATABASE_URL.startsWith('file:')) {
    return process.env.DATABASE_URL;
  }

  const isServerless =
    Boolean(process.env.VERCEL) ||
    Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME) ||
    process.env.NODE_ENV === 'production';

  if (isServerless) {
    const tmpDbPath = '/tmp/hookcraft.db';

    if (!fs.existsSync(tmpDbPath)) {
      try {
        const candidateStarterPaths = [
          path.resolve(process.cwd(), 'prisma/starter.db'),
          path.resolve(process.cwd(), 'public/starter.db'),
          path.resolve(process.cwd(), '.output/server/prisma/starter.db'),
          path.resolve(process.cwd(), '../prisma/starter.db')
        ];

        let copied = false;
        for (const candidate of candidateStarterPaths) {
          if (fs.existsSync(candidate)) {
            fs.copyFileSync(candidate, tmpDbPath);
            fs.chmodSync(tmpDbPath, 0o666);
            console.info(`[HookCraft DB] Seeded starter database from ${candidate} into ${tmpDbPath}`);
            copied = true;
            break;
          }
        }

        if (!copied) {
          console.info('[HookCraft DB] Disk starter.db not found; unpacking embedded starter database to', tmpDbPath);
          fs.writeFileSync(tmpDbPath, Buffer.from(STARTER_DB_BASE64, 'base64'));
          fs.chmodSync(tmpDbPath, 0o666);
        }
      } catch (err) {
        console.error('[HookCraft DB] Failed to initialize /tmp database:', err);
      }
    }
    return `file:${tmpDbPath}`;
  }

  // Local development handling
  const rawUrl = process.env.DATABASE_URL || 'file:./prisma/dev.db';
  const localDbRelPath = rawUrl.replace('file:', '');
  let localDbFullPath = path.resolve(process.cwd(), localDbRelPath);

  // If path is ./dev.db but actual file is at ./prisma/dev.db, point to that
  if (!fs.existsSync(localDbFullPath) && fs.existsSync(path.resolve(process.cwd(), 'prisma/dev.db'))) {
    localDbFullPath = path.resolve(process.cwd(), 'prisma/dev.db');
    return `file:${localDbFullPath}`;
  }

  if (!fs.existsSync(localDbFullPath)) {
    const starterCandidate = path.resolve(process.cwd(), 'prisma/starter.db');
    if (fs.existsSync(starterCandidate)) {
      try {
        const parentDir = path.dirname(localDbFullPath);
        if (!fs.existsSync(parentDir)) {
          fs.mkdirSync(parentDir, { recursive: true });
        }
        fs.copyFileSync(starterCandidate, localDbFullPath);
        console.info(`[HookCraft DB] Initialized local dev database from ${starterCandidate}`);
      } catch (err) {
        console.error('[HookCraft DB] Failed to copy starter database to local dev path:', err);
      }
    }
  }

  return `file:${localDbFullPath}`;
}

declare global {
  var __hookcraft_prisma__: PrismaClient | undefined;
}

export function usePrisma(): PrismaClient {
  if (!prismaInstance) {
    const dbUrl = ensureDatabase();

    if (process.env.NODE_ENV === 'production') {
      prismaInstance = new PrismaClient({
        datasources: { db: { url: dbUrl } },
        log: ['error']
      });
    } else {
      if (!global.__hookcraft_prisma__) {
        global.__hookcraft_prisma__ = new PrismaClient({
          datasources: { db: { url: dbUrl } },
          log: ['error', 'warn']
        });
      }
      prismaInstance = global.__hookcraft_prisma__;
    }
  }

  return prismaInstance;
}

export const prisma = usePrisma();
export default prisma;
