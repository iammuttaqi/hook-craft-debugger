import type { Inbox, CapturedEvent, ReplayLog } from './database';
import type { VerificationResult } from './signatures';

export interface CreateInboxPayload {
  name: string;
  slug?: string;
  mockStatusCode?: number;
  mockDelayMs?: number;
}

export interface UpdateInboxPayload {
  name?: string;
  mockStatusCode?: number;
  mockDelayMs?: number;
}

export interface InboxesResponse {
  inboxes: Inbox[];
}

export interface InboxResponse {
  inbox: Inbox;
}

export interface EventsResponse {
  events: CapturedEvent[];
  total?: number;
}

export interface ReplayPayload {
  eventId: string;
  targetUrl: string;
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}

export interface ReplayResponse {
  success: boolean;
  replayLog: ReplayLog;
}

export type VerifyResponse = VerificationResult;
