import { usePrisma } from '~/server/utils/prisma';
import type { UpdateInboxPayload } from '~/types/api';

export default defineEventHandler(async (event) => {
  const prisma = usePrisma();
  const slug = getRouterParam(event, 'slug');

  if (!slug) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing inbox slug parameter.'
    });
  }

  const existing = await prisma.inbox.findUnique({
    where: { slug }
  });

  if (!existing) {
    throw createError({
      statusCode: 404,
      statusMessage: `Inbox "${slug}" not found.`
    });
  }

  const body = await readBody<UpdateInboxPayload>(event);
  const dataToUpdate: Record<string, any> = {};

  if (body?.name !== undefined && body.name.trim()) {
    dataToUpdate.name = body.name.trim();
  }

  if (body?.mockStatusCode !== undefined) {
    dataToUpdate.mockStatusCode = Number(body.mockStatusCode) || 200;
  }

  if (body?.mockDelayMs !== undefined) {
    dataToUpdate.mockDelayMs = Math.min(Math.max(Number(body.mockDelayMs) || 0, 0), 10000);
  }

  const updated = await prisma.inbox.update({
    where: { slug },
    data: dataToUpdate
  });

  return { inbox: updated };
});
