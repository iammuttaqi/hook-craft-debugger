import { usePrisma } from '~/server/utils/prisma';

export default defineEventHandler(async (event) => {
  const prisma = usePrisma();
  const slug = getRouterParam(event, 'slug');

  if (!slug) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing inbox slug parameter.'
    });
  }

  const inbox = await prisma.inbox.findUnique({
    where: { slug },
    include: {
      _count: {
        select: { events: true }
      },
      events: {
        take: 1,
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true }
      }
    }
  });

  if (!inbox) {
    throw createError({
      statusCode: 404,
      statusMessage: `Inbox "${slug}" not found.`
    });
  }

  return {
    inbox: {
      id: inbox.id,
      name: inbox.name,
      slug: inbox.slug,
      mockStatusCode: inbox.mockStatusCode,
      mockDelayMs: inbox.mockDelayMs,
      eventCount: inbox._count.events,
      lastEventAt: inbox.events[0]?.createdAt || null,
      createdAt: inbox.createdAt,
      updatedAt: inbox.updatedAt
    }
  };
});
