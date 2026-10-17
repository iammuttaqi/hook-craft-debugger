<script setup lang="ts">
import { ref, watch } from 'vue';
import { Sliders, Clock, Check } from 'lucide-vue-next';
import type { Inbox } from '~/types/database';
import Button from '~/components/common/Button.vue';

const props = defineProps<{
  inbox: Inbox;
}>();

const emit = defineEmits<{
  (e: 'update', rules: { mockStatusCode: number; mockDelayMs: number }): void;
}>();

const selectedStatus = ref<number>(props.inbox.mockStatusCode || 200);
const delayMs = ref<number>(props.inbox.mockDelayMs || 0);
const isSaving = ref<boolean>(false);
const saveSuccess = ref<boolean>(false);

watch(
  () => props.inbox,
  (newInbox) => {
    if (newInbox) {
      selectedStatus.value = newInbox.mockStatusCode || 200;
      delayMs.value = newInbox.mockDelayMs || 0;
    }
  },
  { immediate: true }
);

const statusOptions = [
  { code: 200, label: '200 OK' },
  { code: 201, label: '201 Created' },
  { code: 202, label: '202 Accepted' },
  { code: 400, label: '400 Bad Request' },
  { code: 401, label: '401 Unauthorized' },
  { code: 429, label: '429 Too Many Requests' },
  { code: 500, label: '500 Server Error' },
  { code: 503, label: '503 Service Unavailable' }
];

async function handleSave() {
  isSaving.value = true;
  saveSuccess.value = false;

  try {
    emit('update', {
      mockStatusCode: Number(selectedStatus.value),
      mockDelayMs: Number(delayMs.value)
    });
    saveSuccess.value = true;
    setTimeout(() => {
      saveSuccess.value = false;
    }, 2000);
  } finally {
    isSaving.value = false;
  }
}
</script>

<template>
  <div class="rounded border border-zinc-800 bg-zinc-900/60 p-3.5 space-y-3.5">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-1.5 text-xs font-semibold text-zinc-300">
        <Sliders class="w-3.5 h-3.5 text-emerald-400" />
        <span>Chaos & Ingress Rules</span>
      </div>
      <span v-if="saveSuccess" class="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-mono">
        <Check class="w-3 h-3" />
        Saved
      </span>
    </div>

    <!-- Response Code Selector -->
    <div class="space-y-1.5">
      <label class="block text-[11px] text-zinc-400 font-medium">
        Simulated Response Code
      </label>
      <select
        v-model="selectedStatus"
        class="w-full bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs rounded px-2.5 py-1.5 focus:outline-none focus:border-emerald-500 font-mono transition-colors cursor-pointer"
        @change="handleSave"
      >
        <option v-for="opt in statusOptions" :key="opt.code" :value="opt.code">
          {{ opt.label }}
        </option>
      </select>
    </div>

    <!-- Delay Slider -->
    <div class="space-y-1.5">
      <div class="flex items-center justify-between text-[11px]">
        <label class="text-zinc-400 font-medium flex items-center gap-1">
          <Clock class="w-3 h-3 text-zinc-500" />
          Artificial Delay
        </label>
        <span class="font-mono text-xs text-zinc-200">
          {{ delayMs }} ms
        </span>
      </div>

      <input
        v-model.number="delayMs"
        type="range"
        min="0"
        max="5000"
        step="100"
        class="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
        @change="handleSave"
      />

      <div class="flex justify-between text-[10px] text-zinc-500 font-mono">
        <span>0 ms (Instant)</span>
        <span>2500 ms</span>
        <span>5000 ms</span>
      </div>
    </div>
  </div>
</template>
