export interface Inbox {
  id: string;
  name: string;
  slug: string;
  mockStatusCode: number;
  mockDelayMs: number;
  createdAt: string | Date;
  updatedAt: string | Date;
  eventCount?: number;
  lastEventAt?: string | Date | null;
}

export interface CapturedEvent {
  id: string;
  inboxId: string;
  method: string;
  path: string;
  queryParams: string | null;
  headersJson: string;
  rawBody: string;
  parsedJson: string | null;
  clientIp: string | null;
  responseStatus: number;
  createdAt: string | Date;
  replays?: ReplayLog[];
  _count?: {
    replays: number;
  };
}

export interface ReplayLog {
  id: string;
  eventId: string;
  targetUrl: string;
  requestHeadersJson: string;
  requestBody: string;
  responseStatus: number;
  latencyMs: number;
  responseBody: string | null;
  createdAt: string | Date;
}
