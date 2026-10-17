import { usePrisma } from '~/server/utils/prisma';

export default defineEventHandler(async (event) => {
  const prisma = usePrisma();
  // Ensure DB cold-start initialization and query execution
  await prisma.inbox.count();
  setResponseStatus(event, 200);
  return '';
});
