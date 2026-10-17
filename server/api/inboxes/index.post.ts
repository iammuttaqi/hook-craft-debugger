import { usePrisma } from '~/server/utils/prisma';
import crypto from 'node:crypto';
import type { CreateInboxPayload } from '~/types/api';

function generateSlug(name?: string): string {
  if (name) {
    const base = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    if (base.length >= 3) {
      const suffix = crypto.randomBytes(3).toString('hex');
      return `${base.slice(0, 24)}-${suffix}`;
    }
  }
  return `inb_${crypto.randomBytes(4).toString('hex')}`;
}

export default defineEventHandler(async (event) => {
  const prisma = usePrisma();
  const body = await readBody<CreateInboxPayload>(event);

  if (!body || !body.name || !body.name.trim()) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Inbox name is required.'
    });
  }

  let slug = (body.slug || '').trim().toLowerCase().replace(/[^a-z0-9-_]/g, '-');
  if (!slug) {
    slug = generateSlug(body.name);
  }

  // Ensure slug uniqueness
  const existing = await prisma.inbox.findUnique({
    where: { slug }
  });

  if (existing) {
    slug = `${slug}-${crypto.randomBytes(2).toString('hex')}`;
  }

  const mockStatusCode = Number(body.mockStatusCode) || 200;
  const mockDelayMs = Math.min(Math.max(Number(body.mockDelayMs) || 0, 0), 10000);

  const inbox = await prisma.inbox.create({
    data: {
      name: body.name.trim(),
      slug,
      mockStatusCode,
      mockDelayMs
    }
  });

  setResponseStatus(event, 201);
  return {
    inbox: {
      ...inbox,
      eventCount: 0,
      lastEventAt: null
    }
  };
});
