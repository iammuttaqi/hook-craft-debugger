<script setup lang="ts">
import { computed } from 'vue';
import { Copy, Check } from 'lucide-vue-next';
import { useClipboard } from '~/composables/useClipboard';

const props = withDefaults(
  defineProps<{
    code: string;
    language?: string;
    showLineNumbers?: boolean;
    maxHeight?: string;
    title?: string;
  }>(),
  {
    language: 'json',
    showLineNumbers: true,
    maxHeight: '400px',
    title: ''
  }
);

const { copy, isCopied } = useClipboard();

const lines = computed(() => {
  if (!props.code) return [];
  return props.code.split('\n');
});

function handleCopy() {
  copy(props.code);
}
</script>

<template>
  <div class="relative group rounded border border-zinc-800 bg-zinc-950 overflow-hidden font-mono text-xs">
    <!-- Header bar if title or copy is present -->
    <div
      v-if="title || true"
      class="flex items-center justify-between px-3 py-1.5 bg-zinc-900/70 border-b border-zinc-800/80 text-zinc-400 select-none"
    >
      <div class="flex items-center gap-2">
        <span v-if="title" class="font-sans font-medium text-[11px] text-zinc-300">{{ title }}</span>
        <span class="text-[10px] text-zinc-500 uppercase tracking-wider">{{ language }}</span>
        <span class="text-[10px] text-zinc-500">• {{ lines.length }} lines</span>
      </div>

      <button
        type="button"
        class="inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
        @click="handleCopy"
      >
        <Check v-if="isCopied" class="w-3.5 h-3.5 text-emerald-400" />
        <Copy v-else class="w-3.5 h-3.5" />
        <span>{{ isCopied ? 'Copied' : 'Copy' }}</span>
      </button>
    </div>

    <!-- Code body -->
    <div
      class="overflow-auto p-3 text-zinc-300 leading-relaxed font-mono"
      :style="{ maxHeight: maxHeight }"
    >
      <div v-if="showLineNumbers" class="table w-full">
        <div
          v-for="(line, idx) in lines"
          :key="idx"
          class="table-row hover:bg-zinc-900/40 transition-colors"
        >
          <span
            class="table-cell pr-4 text-right select-none text-zinc-600 font-mono text-[11px] w-8 align-top"
          >
            {{ idx + 1 }}
          </span>
          <span class="table-cell whitespace-pre font-mono text-zinc-200 break-all align-top">
            {{ line || ' ' }}
          </span>
        </div>
      </div>

      <pre v-else class="whitespace-pre-wrap break-all font-mono text-zinc-200"><code>{{ code }}</code></pre>
    </div>
  </div>
</template>
