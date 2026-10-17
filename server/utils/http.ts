export const HOP_BY_HOP_HEADERS = new Set([
  'host',
  'connection',
  'content-length',
  'transfer-encoding',
  'keep-alive',
  'upgrade',
  'proxy-authorization',
  'proxy-authenticate',
  'trailer',
  'te'
]);

export function sanitizeForwardHeaders(headers: Record<string, string | string[] | undefined>): Record<string, string> {
  const sanitized: Record<string, string> = {};

  for (const [key, value] of Object.entries(headers)) {
    const lowerKey = key.toLowerCase();
    if (!HOP_BY_HOP_HEADERS.has(lowerKey) && value !== undefined && value !== null) {
      sanitized[lowerKey] = Array.isArray(value) ? value.join(', ') : String(value);
    }
  }

  return sanitized;
}

export function tryParseJson(str: string): { isValid: boolean; parsed: any; formatted: string | null } {
  if (!str || !str.trim()) {
    return { isValid: false, parsed: null, formatted: null };
  }

  try {
    const parsed = JSON.parse(str);
    return {
      isValid: true,
      parsed,
      formatted: JSON.stringify(parsed, null, 2)
    };
  } catch {
    return {
      isValid: false,
      parsed: null,
      formatted: null
    };
  }
}
