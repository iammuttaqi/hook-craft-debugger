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
    where: { slug }
  });

  if (!inbox) {
    throw createError({
      statusCode: 404,
      statusMessage: `Inbox "${slug}" not found.`
    });
  }

  const query = getQuery(event);
  const since = query.since ? new Date(String(query.since)) : undefined;
  const search = query.search ? String(query.search).trim() : undefined;
  const method = query.method && query.method !== 'ALL' ? String(query.method).toUpperCase() : undefined;
  const limit = Math.min(Math.max(Number(query.limit) || 50, 1), 200);

  const whereClause: Record<string, any> = {
    inboxId: inbox.id
  };

  if (since && !isNaN(since.getTime())) {
    whereClause.createdAt = {
      gt: since
    };
  }

  if (method) {
    whereClause.method = method;
  }

  if (search) {
    whereClause.OR = [
      { path: { contains: search } },
      { rawBody: { contains: search } },
      { headersJson: { contains: search } }
    ];
  }

  const [events, total] = await Promise.all([
    prisma.capturedEvent.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        _count: {
          select: { replays: true }
        },
        replays: {
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    }),
    prisma.capturedEvent.count({
      where: { inboxId: inbox.id }
    })
  ]);

  return {
    events,
    total
  };
});
