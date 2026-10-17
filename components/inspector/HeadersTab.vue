<script setup lang="ts">
import { ref, computed } from 'vue';
import { Search, Copy, Check } from 'lucide-vue-next';
import { useClipboard } from '~/composables/useClipboard';

const props = defineProps<{
  headersJson: string;
}>();

const searchQuery = ref('');
const { copy, copiedKey } = useClipboard();

const parsedHeaders = computed<Record<string, string>>(() => {
  if (!props.headersJson) return {};
  try {
    return JSON.parse(props.headersJson);
  } catch {
    return {};
  }
});

const filteredHeaderEntries = computed(() => {
  const entries = Object.entries(parsedHeaders.value);
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return entries;
  return entries.filter(([key, val]) => {
    return key.toLowerCase().includes(q) || String(val).toLowerCase().includes(q);
  });
});
</script>

<template>
  <div class="space-y-3">
    <!-- Search filter -->
    <div class="relative">
      <Search class="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Search headers by key or value..."
        class="w-full bg-zinc-950 border border-zinc-800 rounded pl-8 pr-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition-colors"
      />
    </div>

    <!-- Headers Table -->
    <div class="rounded border border-zinc-800 overflow-hidden bg-zinc-950">
      <table class="w-full text-left text-xs font-mono border-collapse">
        <thead>
          <tr class="bg-zinc-900/80 border-b border-zinc-800 text-[11px] font-sans font-medium text-zinc-400 select-none">
            <th class="py-2 px-3 w-1/3">Header Key</th>
            <th class="py-2 px-3">Header Value</th>
            <th class="py-2 px-3 w-12 text-right"></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-zinc-850">
          <tr
            v-for="[key, value] in filteredHeaderEntries"
            :key="key"
            class="hover:bg-zinc-900/40 transition-colors group"
          >
            <td class="py-2 px-3 text-zinc-400 font-medium break-all align-top select-all">
              {{ key }}
            </td>
            <td class="py-2 px-3 text-zinc-200 break-all align-top select-all">
              {{ value }}
            </td>
            <td class="py-2 px-3 text-right align-top">
              <button
                type="button"
                :title="`Copy ${key}`"
                class="p-1 rounded text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors opacity-60 group-hover:opacity-100"
                @click="copy(String(value), key)"
              >
                <Check v-if="copiedKey === key" class="w-3.5 h-3.5 text-emerald-400" />
                <Copy v-else class="w-3.5 h-3.5" />
              </button>
            </td>
          </tr>

          <tr v-if="filteredHeaderEntries.length === 0">
            <td colspan="3" class="py-6 text-center text-xs text-zinc-500 font-sans">
              No matching headers found.
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
