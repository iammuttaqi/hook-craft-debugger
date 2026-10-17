<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import { useHookCraft } from '~/composables/useHookCraft';
import InboxList from '~/components/inboxes/InboxList.vue';
import EventList from '~/components/events/EventList.vue';
import EventInspector from '~/components/inspector/EventInspector.vue';

const {
  fetchInboxes,
  fetchEvents,
  startPolling,
  stopPolling
} = useHookCraft();

onMounted(async () => {
  await fetchInboxes();
  await fetchEvents();
  startPolling();
});

onUnmounted(() => {
  stopPolling();
});
</script>

<template>
  <div class="h-full w-full flex flex-row overflow-hidden">
    <!-- Left Column: Inboxes & Response Rules (~300px) -->
    <div class="w-72 lg:w-80 shrink-0 h-full">
      <InboxList />
    </div>

    <!-- Center Column: Real-Time Event Stream (~380px - 440px) -->
    <div class="w-80 lg:w-96 shrink-0 h-full">
      <EventList />
    </div>

    <!-- Right Column: Master Event Inspector & Workbench (Remaining Flex space) -->
    <div class="flex-1 min-w-0 h-full">
      <EventInspector />
    </div>
  </div>
</template>
