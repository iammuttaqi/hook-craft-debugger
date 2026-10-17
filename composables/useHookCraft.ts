import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import type { Inbox, CapturedEvent, ReplayLog } from '~/types/database';
import type { CreateInboxPayload, UpdateInboxPayload, InboxesResponse, EventsResponse } from '~/types/api';

// Module-level reactive singleton state
const inboxes = ref<Inbox[]>([]);
const activeInboxSlug = ref<string>('');
const events = ref<CapturedEvent[]>([]);
const activeEventId = ref<string>('');
const isLoadingInboxes = ref<boolean>(false);
const isLoadingEvents = ref<boolean>(false);
const isPolling = ref<boolean>(true);

// Filters
const searchQuery = ref<string>('');
const methodFilter = ref<string>('ALL'); // ALL, POST, GET, PUT, PATCH, DELETE

let pollInterval: ReturnType<typeof setInterval> | null = null;

export function useHookCraft() {
  const activeInbox = computed(() => {
    return inboxes.value.find((i) => i.slug === activeInboxSlug.value) || inboxes.value[0] || null;
  });

  const activeEvent = computed(() => {
    if (activeEventId.value) {
      const found = events.value.find((e) => e.id === activeEventId.value);
      if (found) return found;
    }
    return events.value[0] || null;
  });

  const filteredEvents = computed(() => {
    return events.value.filter((e) => {
      const matchesMethod = methodFilter.value === 'ALL' || e.method.toUpperCase() === methodFilter.value.toUpperCase();
      const query = searchQuery.value.trim().toLowerCase();
      if (!query) return matchesMethod;

      const inPath = (e.path || '').toLowerCase().includes(query);
      const inBody = (e.rawBody || '').toLowerCase().includes(query);
      const inHeaders = (e.headersJson || '').toLowerCase().includes(query);
      return matchesMethod && (inPath || inBody || inHeaders);
    });
  });

  async function fetchInboxes() {
    isLoadingInboxes.value = true;
    try {
      const data = await $fetch<InboxesResponse>('/api/inboxes');
      inboxes.value = data.inboxes;

      if (!activeInboxSlug.value && inboxes.value.length > 0) {
        activeInboxSlug.value = inboxes.value[0].slug;
      }
    } catch (err) {
      console.error('Failed to fetch inboxes:', err);
    } finally {
      isLoadingInboxes.value = false;
    }
  }

  async function createInbox(payload: CreateInboxPayload): Promise<Inbox> {
    const data = await $fetch<{ inbox: Inbox }>('/api/inboxes', {
      method: 'POST',
      body: payload
    });

    inboxes.value.unshift(data.inbox);
    activeInboxSlug.value = data.inbox.slug;
    events.value = [];
    activeEventId.value = '';
    await fetchEvents();
    return data.inbox;
  }

  async function updateInboxRules(slug: string, payload: UpdateInboxPayload): Promise<Inbox> {
    const data = await $fetch<{ inbox: Inbox }>(`/api/inbox/${slug}`, {
      method: 'PUT',
      body: payload
    });

    const index = inboxes.value.findIndex((i) => i.slug === slug);
    if (index !== -1) {
      inboxes.value[index] = {
        ...inboxes.value[index],
        ...data.inbox
      };
    }
    return data.inbox;
  }

  async function deleteInbox(slug: string): Promise<boolean> {
    try {
      await $fetch(`/api/inbox/${slug}`, {
        method: 'DELETE'
      });

      inboxes.value = inboxes.value.filter((i) => i.slug !== slug);
      if (activeInboxSlug.value === slug) {
        activeInboxSlug.value = inboxes.value[0]?.slug || '';
        events.value = [];
        activeEventId.value = '';
        if (activeInboxSlug.value) {
          await fetchEvents();
        }
      }
      return true;
    } catch (err) {
      console.error('Failed to delete inbox:', err);
      return false;
    }
  }

  async function fetchEvents(incremental = false) {
    if (!activeInboxSlug.value) return;

    if (!incremental) {
      isLoadingEvents.value = true;
    }

    try {
      const params: Record<string, any> = {};
      if (incremental && events.value.length > 0) {
        params.since = events.value[0].createdAt;
      }

      const data = await $fetch<EventsResponse>(`/api/inbox/${activeInboxSlug.value}/events`, {
        params
      });

      if (incremental) {
        if (data.events && data.events.length > 0) {
          // Prepend newly arrived events and deduplicate by ID
          const existingIds = new Set(events.value.map((e) => e.id));
          const newEvents = data.events.filter((e) => !existingIds.has(e.id));
          if (newEvents.length > 0) {
            events.value = [...newEvents, ...events.value];
            // If no active event, set to newest
            if (!activeEventId.value) {
              activeEventId.value = events.value[0].id;
            }
            // Update inbox event count locally
            const currentInbox = inboxes.value.find((i) => i.slug === activeInboxSlug.value);
            if (currentInbox) {
              currentInbox.eventCount = (currentInbox.eventCount || 0) + newEvents.length;
              currentInbox.lastEventAt = newEvents[0].createdAt;
            }
          }
        }
      } else {
        events.value = data.events || [];
        if (events.value.length > 0) {
          if (!activeEventId.value || !events.value.some((e) => e.id === activeEventId.value)) {
            activeEventId.value = events.value[0].id;
          }
        } else {
          activeEventId.value = '';
        }
      }
    } catch (err) {
      console.error('Failed to fetch events:', err);
    } finally {
      if (!incremental) {
        isLoadingEvents.value = false;
      }
    }
  }

  function startPolling() {
    stopPolling();
    pollInterval = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      if (isPolling.value && activeInboxSlug.value) {
        fetchEvents(true);
      }
    }, 1500);
  }

  function stopPolling() {
    if (pollInterval) {
      clearInterval(pollInterval);
      pollInterval = null;
    }
  }

  function togglePolling() {
    isPolling.value = !isPolling.value;
  }

  function selectInbox(slug: string) {
    if (activeInboxSlug.value === slug) return;
    activeInboxSlug.value = slug;
    activeEventId.value = '';
    events.value = [];
    fetchEvents(false);
  }

  function selectEvent(id: string) {
    activeEventId.value = id;
  }

  function appendReplayLog(replayLog: ReplayLog) {
    const targetEvent = events.value.find((e) => e.id === replayLog.eventId);
    if (targetEvent) {
      if (!targetEvent.replays) {
        targetEvent.replays = [];
      }
      targetEvent.replays.unshift(replayLog);
      if (targetEvent._count) {
        targetEvent._count.replays = (targetEvent._count.replays || 0) + 1;
      }
    }
  }

  function clearEvents() {
    events.value = [];
    activeEventId.value = '';
  }

  return {
    inboxes,
    activeInboxSlug,
    activeInbox,
    events,
    filteredEvents,
    activeEventId,
    activeEvent,
    isLoadingInboxes,
    isLoadingEvents,
    isPolling,
    searchQuery,
    methodFilter,
    fetchInboxes,
    createInbox,
    updateInboxRules,
    deleteInbox,
    fetchEvents,
    startPolling,
    stopPolling,
    togglePolling,
    selectInbox,
    selectEvent,
    appendReplayLog,
    clearEvents
  };
}
