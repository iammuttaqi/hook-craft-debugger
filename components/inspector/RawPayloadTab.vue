<script setup lang="ts">
import { computed } from 'vue';
import CodeBlock from '~/components/common/CodeBlock.vue';

const props = defineProps<{
  rawBody: string;
}>();

const byteLength = computed(() => {
  return props.rawBody ? new TextEncoder().encode(props.rawBody).length : 0;
});
</script>

<template>
  <div class="space-y-3">
    <div class="flex items-center justify-between text-xs text-zinc-400 font-mono">
      <span>Raw Payload Buffer</span>
      <span>{{ byteLength }} bytes</span>
    </div>

    <div v-if="rawBody && rawBody.length > 0">
      <CodeBlock
        :code="rawBody"
        language="raw"
        max-height="600px"
        title="Unmodified Request Stream"
      />
    </div>

    <div
      v-else
      class="p-6 text-center text-xs text-zinc-500 rounded border border-dashed border-zinc-800"
    >
      Request payload body is empty (0 bytes).
    </div>
  </div>
</template>
