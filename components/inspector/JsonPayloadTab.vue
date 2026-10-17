<script setup lang="ts">
import { computed } from 'vue';
import CodeBlock from '~/components/common/CodeBlock.vue';
import { AlertCircle, Code2 } from 'lucide-vue-next';

const props = defineProps<{
  parsedJson: string | null;
  rawBody: string;
}>();

const emit = defineEmits<{
  (e: 'switch-tab', tabId: string): void;
}>();

const hasJson = computed(() => {
  return Boolean(props.parsedJson && props.parsedJson.trim().length > 0);
});
</script>

<template>
  <div class="space-y-3">
    <div v-if="hasJson">
      <CodeBlock
        :code="parsedJson || ''"
        language="json"
        max-height="600px"
        title="Parsed JSON Body"
      />
    </div>

    <div
      v-else-if="rawBody && rawBody.trim().length > 0"
      class="p-4 rounded border border-amber-500/30 bg-amber-500/5 text-amber-300 text-xs flex items-start justify-between gap-3"
    >
      <div class="flex items-start gap-2.5">
        <AlertCircle class="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <h4 class="font-semibold text-zinc-100">Non-JSON Payload Detected</h4>
          <p class="text-zinc-400 mt-0.5 leading-relaxed">
            The inbound request body contains non-JSON bytes (such as URL-encoded form data, plaintext, or binary data).
          </p>
        </div>
      </div>

      <button
        type="button"
        class="px-2.5 py-1 rounded bg-zinc-800 text-zinc-200 border border-zinc-700 hover:bg-zinc-700 text-xs font-medium shrink-0 transition-colors"
        @click="emit('switch-tab', 'raw')"
      >
        View Raw Payload
      </button>
    </div>

    <div
      v-else
      class="p-6 text-center text-xs text-zinc-500 rounded border border-dashed border-zinc-800"
    >
      Request payload body is empty (0 bytes).
    </div>
  </div>
</template>
