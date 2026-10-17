import { ensureDatabase, usePrisma } from '../utils/prisma';

export default defineNitroPlugin(() => {
  try {
    ensureDatabase();
    usePrisma();
    console.info('[HookCraft DB Plugin] Database bootstrap verified.');
  } catch (err) {
    console.error('[HookCraft DB Plugin] Bootstrap error:', err);
  }
});
