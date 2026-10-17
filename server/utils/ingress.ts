import type { H3Event } from 'h3';
import { usePrisma } from './prisma';
import { tryParseJson } from './http';

export async function handleWebhookIngress(event: H3Event, slugOverride?: string) {
  const prisma = usePrisma();
  const slug = slugOverride || getRouterParam(event, 'slug');

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

  // Read raw payload body
  let rawBody = '';
  try {
    rawBody = (await readRawBody(event, 'utf8')) || '';
  } catch {
    rawBody = '';
  }

  // Capture headers, query parameters, method, path, and client IP
  const headers = getHeaders(event);
  const query = getQuery(event);
  const method = event.method || 'POST';
  const url = getRequestURL(event);
  const clientIp = getRequestIP(event, { xForwardedFor: true }) || '127.0.0.1';

  // Format JSON if valid
  const jsonParseResult = tryParseJson(rawBody);

  // Apply simulated chaos latency if configured
  if (inbox.mockDelayMs > 0) {
    const delay = Math.min(Math.max(inbox.mockDelayMs, 0), 10000);
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  // Persist captured event into SQLite database
  const captured = await prisma.capturedEvent.create({
    data: {
      inboxId: inbox.id,
      method,
      path: url.pathname,
      queryParams: Object.keys(query).length > 0 ? JSON.stringify(query, null, 2) : null,
      headersJson: JSON.stringify(headers, null, 2),
      rawBody,
      parsedJson: jsonParseResult.formatted,
      clientIp,
      responseStatus: inbox.mockStatusCode
    }
  });

  // Set response status and custom headers
  setResponseStatus(event, inbox.mockStatusCode);

  if (inbox.mockStatusCode === 429) {
    setHeader(event, 'Retry-After', '30');
  }

  setHeader(event, 'X-HookCraft-Event-Id', captured.id);
  setHeader(event, 'X-HookCraft-Inbox', inbox.slug);

  return {
    status: 'received',
    eventId: captured.id,
    inbox: inbox.slug,
    timestamp: captured.createdAt,
    responseStatus: inbox.mockStatusCode
  };
}
