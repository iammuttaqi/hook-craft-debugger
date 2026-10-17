<script setup lang="ts">
import { computed } from 'vue';
import { Radio, Shield, Activity, Terminal } from 'lucide-vue-next';
import { useHookCraft } from '~/composables/useHookCraft';

const { activeInbox } = useHookCraft();

const currentOrigin = computed(() => {
  if (typeof window !== 'undefined') {
    return window.location.host;
  }
  return 'localhost:3000';
});
</script>

<template>
  <div class="h-screen w-screen flex flex-col bg-canvas text-zinc-100 antialiased overflow-hidden select-none">
    <!-- Studio Header -->
    <header class="h-12 border-b border-zinc-800 bg-zinc-950 px-4 flex items-center justify-between shrink-0 z-20">
      <!-- Left: Brand / Studio Title -->
      <div class="flex items-center gap-3">
        <div class="flex items-center gap-2">
          <div class="w-6 h-6 rounded bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
            <Radio class="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <h1 class="text-xs font-bold tracking-tight text-zinc-100 uppercase">
            HookCraft <span class="text-zinc-500 font-normal">Debugger</span>
          </h1>
        </div>

        <span class="text-zinc-700 font-mono text-xs">/</span>

        <!-- Active Inbox Indicator -->
        <div v-if="activeInbox" class="flex items-center gap-1.5 text-xs font-mono text-zinc-400">
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
          <span class="text-zinc-300 font-medium">{{ activeInbox.name }}</span>
          <span class="text-zinc-500">({{ activeInbox.slug }})</span>
        </div>
      </div>

      <!-- Center: Ingress Host Notification -->
      <div class="hidden md:flex items-center gap-2 px-3 py-1 rounded bg-zinc-900 border border-zinc-800 text-[11px] font-mono text-zinc-400">
        <Terminal class="w-3.5 h-3.5 text-zinc-500" />
        <span>Ingress Host:</span>
        <span class="text-zinc-200 select-all">{{ currentOrigin }}</span>
      </div>

      <!-- Right: Privacy Badge & Status -->
      <div class="flex items-center gap-3">
        <div class="flex items-center gap-1.5 px-2 py-0.5 rounded border border-zinc-800 text-[11px] font-mono text-zinc-400">
          <Shield class="w-3 h-3 text-emerald-400" />
          <span>Local-First &amp; Zero Data Leakage</span>
        </div>
      </div>
    </header>

    <!-- Studio Body: 3 Columns Grid -->
    <main class="flex-1 min-h-0 overflow-hidden">
      <slot />
    </main>
  </div>
</template>
