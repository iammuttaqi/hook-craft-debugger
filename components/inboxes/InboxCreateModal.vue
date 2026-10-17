<script setup lang="ts">
import { ref } from 'vue';
import Modal from '~/components/common/Modal.vue';
import Button from '~/components/common/Button.vue';
import type { CreateInboxPayload } from '~/types/api';

defineProps<{
  modelValue: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void;
  (e: 'create', payload: CreateInboxPayload): void;
}>();

const name = ref('');
const slug = ref('');
const mockStatusCode = ref(200);
const mockDelayMs = ref(0);
const isSubmitting = ref(false);
const errorMsg = ref('');

function reset() {
  name.value = '';
  slug.value = '';
  mockStatusCode.value = 200;
  mockDelayMs.value = 0;
  errorMsg.value = '';
}

async function handleSubmit() {
  if (!name.value.trim()) {
    errorMsg.value = 'Inbox name is required.';
    return;
  }

  errorMsg.value = '';
  isSubmitting.value = true;

  try {
    emit('create', {
      name: name.value.trim(),
      slug: slug.value.trim() || undefined,
      mockStatusCode: Number(mockStatusCode.value) || 200,
      mockDelayMs: Number(mockDelayMs.value) || 0
    });
    emit('update:modelValue', false);
    reset();
  } catch (err: any) {
    errorMsg.value = err.message || 'Failed to create inbox.';
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <Modal
    :model-value="modelValue"
    title="Create Ingress Inbox"
    description="Provision an isolated webhook receiver endpoint."
    @update:model-value="(val) => emit('update:modelValue', val)"
    @close="reset"
  >
    <form class="space-y-4" @submit.prevent="handleSubmit">
      <div v-if="errorMsg" class="p-2.5 rounded bg-rose-950/40 border border-rose-800/60 text-xs text-rose-300">
        {{ errorMsg }}
      </div>

      <!-- Inbox Name -->
      <div class="space-y-1.5">
        <label class="block text-xs font-medium text-zinc-300">
          Inbox Name <span class="text-rose-400">*</span>
        </label>
        <input
          v-model="name"
          type="text"
          placeholder="e.g. Stripe Checkout Test"
          class="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500 transition-colors"
          required
        />
      </div>

      <!-- Custom Slug (Optional) -->
      <div class="space-y-1.5">
        <label class="block text-xs font-medium text-zinc-300">
          Custom Slug <span class="text-zinc-500 font-normal">(Optional)</span>
        </label>
        <div class="flex items-center">
          <span class="bg-zinc-800 border border-r-0 border-zinc-700/80 px-2.5 py-2 text-xs text-zinc-400 font-mono rounded-l select-none">
            /api/inbox/
          </span>
          <input
            v-model="slug"
            type="text"
            placeholder="auto-generated"
            class="w-full bg-zinc-950 border border-zinc-800 rounded-r px-3 py-2 text-xs text-zinc-100 placeholder-zinc-600 font-mono focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>
      </div>

      <!-- Initial Response Settings -->
      <div class="grid grid-cols-2 gap-3 pt-1">
        <div class="space-y-1.5">
          <label class="block text-xs font-medium text-zinc-300">Default Response Code</label>
          <select
            v-model="mockStatusCode"
            class="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-2 text-xs text-zinc-200 font-mono focus:outline-none focus:border-emerald-500"
          >
            <option :value="200">200 OK</option>
            <option :value="201">201 Created</option>
            <option :value="400">400 Bad Request</option>
            <option :value="429">429 Rate Limited</option>
            <option :value="500">500 Server Error</option>
          </select>
        </div>

        <div class="space-y-1.5">
          <label class="block text-xs font-medium text-zinc-300">Initial Delay (ms)</label>
          <input
            v-model.number="mockDelayMs"
            type="number"
            min="0"
            max="5000"
            step="100"
            class="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-xs text-zinc-100 font-mono focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>
    </form>

    <template #footer="{ close }">
      <Button variant="ghost" size="sm" @click="close">
        Cancel
      </Button>
      <Button variant="primary" size="sm" :loading="isSubmitting" @click="handleSubmit">
        Create Inbox
      </Button>
    </template>
  </Modal>
</template>
