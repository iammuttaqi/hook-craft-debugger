import type { CapturedEvent } from '~/types/database';

export function useCurlGenerator() {
  function generateCurl(event: CapturedEvent, baseUrl?: string): string {
    const origin = baseUrl || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
    const fullUrl = `${origin}${event.path || ''}`;
    const method = event.method || 'POST';

    const parts: string[] = [`curl -X ${method} "${fullUrl}"`];

    // Headers
    if (event.headersJson) {
      try {
        const headers = JSON.parse(event.headersJson);
        const ignoredHeaders = new Set(['host', 'content-length', 'connection']);

        for (const [key, value] of Object.entries(headers)) {
          if (!ignoredHeaders.has(key.toLowerCase()) && value !== undefined && value !== null) {
            // Escape double quotes inside header value
            const escapedValue = String(value).replace(/"/g, '\\"');
            parts.push(`  -H "${key}: ${escapedValue}"`);
          }
        }
      } catch {
        // ignore parsing error
      }
    }

    // Body
    if (event.rawBody && method !== 'GET' && method !== 'HEAD') {
      // Escape single quotes for bash single-quoted string
      const escapedBody = event.rawBody.replace(/'/g, `'\\''`);
      parts.push(`  --data-raw '${escapedBody}'`);
    }

    return parts.join(' \\\n');
  }

  return {
    generateCurl
  };
}
