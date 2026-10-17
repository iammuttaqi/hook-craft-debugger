<script setup lang="ts">
import { ref } from 'vue';
import { Plus, Radio, Layers } from 'lucide-vue-next';
import { useHookCraft } from '~/composables/useHookCraft';
import InboxCard from './InboxCard.vue';
import ResponseRulesEditor from './ResponseRulesEditor.vue';
import InboxCreateModal from './InboxCreateModal.vue';
import Button from '~/components/common/Button.vue';
import EmptyState from '~/components/common/EmptyState.vue';
import ShimmerSkeleton from '~/components/common/ShimmerSkeleton.vue';
import type { CreateInboxPayload } from '~/types/api';

const {
  inboxes,
  activeInboxSlug,
  activeInbox,
  isLoadingInboxes,
  selectInbox,
  createInbox,
  updateInboxRules,
  deleteInbox
} = useHookCraft();

const isCreateModalOpen = ref(false);

async function handleCreate(payload: CreateInboxPayload) {
  await createInbox(payload);
}

async function handleUpdateRules(rules: { mockStatusCode: number; mockDelayMs: number }) {
  if (activeInbox.value) {
    await updateInboxRules(activeInbox.value.slug, rules);
  }
}
</script>

<template>
  <div class="h-full flex flex-col justify-between bg-zinc-950 border-r border-zinc-800 overflow-hidden">
    <!-- Top section: Inboxes list -->
    <div class="flex-1 flex flex-col min-h-0">
      <!-- Section Header -->
      <div class="p-3.5 border-b border-zinc-800/80 flex items-center justify-between shrink-0 bg-zinc-950/80">
        <div class="flex items-center gap-2">
          <Layers class="w-4 h-4 text-zinc-400" />
          <h2 class="text-xs font-semibold text-zinc-200 tracking-tight uppercase">
            Inboxes
          </h2>
          <span class="text-[11px] font-mono text-zinc-500">
            ({{ inboxes.length }})
          </span>
        </div>

        <Button
          variant="secondary"
          size="xs"
          @click="isCreateModalOpen = true"
        >
          <Plus class="w-3.5 h-3.5 text-emerald-400" />
          <span>New</span>
        </Button>
      </div>

      <!-- Scrollable inboxes list -->
      <div class="flex-1 overflow-y-auto p-3 space-y-2">
        <div v-if="isLoadingInboxes && inboxes.length === 0" class="p-2">
          <ShimmerSkeleton :count="3" height="h-16" />
        </div>

        <template v-else-if="inboxes.length > 0">
          <InboxCard
            v-for="inbox in inboxes"
            :key="inbox.id"
            :inbox="inbox"
            :is-active="inbox.slug === activeInboxSlug"
            @select="selectInbox"
            @delete="deleteInbox"
          />
        </template>

        <EmptyState
          v-else
          :icon="Radio"
          title="No inboxes provisioned"
          description="Create your first endpoint to start capturing inbound webhooks."
        >
          <Button
            variant="primary"
            size="sm"
            @click="isCreateModalOpen = true"
          >
            Create Ingress Inbox
          </Button>
        </EmptyState>
      </div>
    </div>

    <!-- Bottom section: Active Inbox Chaos Rules -->
    <div v-if="activeInbox" class="p-3 border-t border-zinc-800 shrink-0 bg-zinc-950">
      <ResponseRulesEditor
        :inbox="activeInbox"
        @update="handleUpdateRules"
      />
    </div>

    <!-- Create Modal -->
    <InboxCreateModal
      v-model="isCreateModalOpen"
      @create="handleCreate"
    />
  </div>
</template>
