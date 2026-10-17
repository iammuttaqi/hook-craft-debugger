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

  const existing = await prisma.inbox.findUnique({
    where: { slug }
  });

  if (!existing) {
    throw createError({
      statusCode: 404,
      statusMessage: `Inbox "${slug}" not found.`
    });
  }

  await prisma.inbox.delete({
    where: { slug }
  });

  return {
    success: true,
    deletedSlug: slug
  };
});
