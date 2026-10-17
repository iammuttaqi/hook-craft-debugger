import { usePrisma } from '~/server/utils/prisma';
import { sanitizeForwardHeaders } from '~/server/utils/http';
import type { ReplayPayload } from '~/types/api';

export default defineEventHandler(async (event) => {
  const prisma = usePrisma();
  const body = await readBody<ReplayPayload>(event);

  if (!body || !body.eventId || !body.targetUrl) {
    throw createError({
      statusCode: 400,
      statusMessage: 'eventId and targetUrl are required.'
    });
  }

  // Ensure event exists
  const capturedEvent = await prisma.capturedEvent.findUnique({
    where: { id: body.eventId }
  });

  if (!capturedEvent) {
    throw createError({
      statusCode: 404,
      statusMessage: `Captured event "${body.eventId}" not found.`
    });
  }

  // Validate URL format
  let url: URL;
  try {
    url = new URL(body.targetUrl);
    if (!['http:', 'https:'].includes(url.protocol)) {
      throw new Error('Only HTTP and HTTPS target URLs are supported.');
    }
  } catch (err: any) {
    throw createError({
      statusCode: 400,
      statusMessage: `Invalid target URL: ${err.message || 'Malformed URL'}`
    });
  }

  // Sanitize headers
  const outboundHeaders = sanitizeForwardHeaders(body.headers || {});
  outboundHeaders['x-hookcraft-replay'] = 'true';
  outboundHeaders['user-agent'] = outboundHeaders['user-agent'] || 'HookCraft-Replayer/1.0';

  const method = (body.method || capturedEvent.method || 'POST').toUpperCase();
  const payloadBody = body.body !== undefined ? body.body : capturedEvent.rawBody;

  const startTime = performance.now();
  let responseStatus = 0;
  let responseBodyPreview = '';
  let isSuccess = false;

  try {
    const fetchOptions: RequestInit = {
      method,
      headers: outboundHeaders,
      signal: AbortSignal.timeout(15000)
    };

    if (method !== 'GET' && method !== 'HEAD') {
      fetchOptions.body = payloadBody;
    }

    const res = await fetch(url.toString(), fetchOptions);
    responseStatus = res.status;
    isSuccess = res.ok;

    try {
      const text = await res.text();
      // Truncate to 10KB
      responseBodyPreview = text.length > 10240 ? text.slice(0, 10240) + '... (truncated)' : text;
    } catch {
      responseBodyPreview = '';
    }
  } catch (err: any) {
    responseStatus = 0;
    isSuccess = false;
    responseBodyPreview = `${err.code || 'ERROR'}: ${err.message || 'Target server is unreachable or timed out'}`;
  }

  const latencyMs = Math.round(performance.now() - startTime);

  // Persist into replay_logs
  const replayLog = await prisma.replayLog.create({
    data: {
      eventId: capturedEvent.id,
      targetUrl: body.targetUrl,
      requestHeadersJson: JSON.stringify(outboundHeaders, null, 2),
      requestBody: payloadBody,
      responseStatus,
      latencyMs,
      responseBody: responseBodyPreview
    }
  });

  return {
    success: isSuccess,
    replayLog
  };
});
