<script setup lang="ts">
import { Search, Radio, Pause, Play, Trash2 } from 'lucide-vue-next';
import { useHookCraft } from '~/composables/useHookCraft';

const {
  searchQuery,
  methodFilter,
  isPolling,
  togglePolling,
  clearEvents,
  filteredEvents,
  events
} = useHookCraft();

const methodOptions = ['ALL', 'POST', 'GET', 'PUT', 'DELETE'];
</script>

<template>
  <div class="p-3 border-b border-zinc-800 bg-zinc-950/90 space-y-2.5">
    <!-- Top Row: Search Input + Polling Toggle -->
    <div class="flex items-center gap-2">
      <div class="relative flex-1">
        <Search class="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Filter by path, payload or header..."
          class="w-full bg-zinc-900 border border-zinc-800 rounded pl-8 pr-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition-colors"
        />
      </div>

      <!-- Live polling indicator / toggle -->
      <button
        type="button"
        :title="isPolling ? 'Live polling active (Click to pause)' : 'Polling paused (Click to resume)'"
        :class="[
          'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-mono font-medium border transition-colors select-none shrink-0',
          isPolling
            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
            : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:bg-zinc-850 hover:text-zinc-300'
        ]"
        @click="togglePolling"
      >
        <span
          :class="[
            'w-1.5 h-1.5 rounded-full',
            isPolling ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-600'
          ]"
        />
        <span>{{ isPolling ? 'Live' : 'Paused' }}</span>
      </button>

      <!-- Clear stream button -->
      <button
        v-if="events.length > 0"
        type="button"
        title="Clear Event Stream"
        class="p-1.5 rounded border border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-850 transition-colors"
        @click="clearEvents"
      >
        <Trash2 class="w-3.5 h-3.5" />
      </button>
    </div>

    <!-- Method Filter Pills -->
    <div class="flex items-center gap-1">
      <button
        v-for="method in methodOptions"
        :key="method"
        type="button"
        :class="[
          'px-2 py-0.5 rounded text-[11px] font-mono transition-colors select-none',
          methodFilter === method
            ? 'bg-zinc-800 text-zinc-100 font-semibold'
            : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900'
        ]"
        @click="methodFilter = method"
      >
        {{ method }}
      </button>

      <span class="ml-auto text-[11px] font-mono text-zinc-500">
        {{ filteredEvents.length }} / {{ events.length }}
      </span>
    </div>
  </div>
</template>
