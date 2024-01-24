<template>
  <div class="wh-full flex flex-col">
    <div class="w-full center py-1 shadow h-14"><slot name="header" /></div>
    <div class="flex-1 wh-full flex space-x-2 p-2 overflow-hidden">
      <div class="w-full flex flex-col space-y-2 overflow-hidden">
        <div class="flex-1 wh-full overflow-hidden select-none"><slot /></div>
        <div class="h-14 w-full flex space-x-2"><slot name="footer" /></div>
      </div>
      <div class="w-[400px] h-full overflow-hidden">
        <n-scrollbar class="wh-full">
          <slot name="right" />
        </n-scrollbar>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts"></script>
