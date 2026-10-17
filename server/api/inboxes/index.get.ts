import { usePrisma } from '~/server/utils/prisma';

export default defineEventHandler(async () => {
  const prisma = usePrisma();

  const inboxes = await prisma.inbox.findMany({
    orderBy: { createdAt: 'desc' },
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

  const formatted = inboxes.map((inbox) => ({
    id: inbox.id,
    name: inbox.name,
    slug: inbox.slug,
    mockStatusCode: inbox.mockStatusCode,
    mockDelayMs: inbox.mockDelayMs,
    eventCount: inbox._count.events,
    lastEventAt: inbox.events[0]?.createdAt || null,
    createdAt: inbox.createdAt,
    updatedAt: inbox.updatedAt
  }));

  return { inboxes: formatted };
});
