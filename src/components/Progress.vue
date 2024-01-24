<template>
  <div
    ref="root"
    class="absolute left-0 right-0 bottom-0 h-2 bg-slate-300"
    @mouseenter="show = true"
    @mousemove="handleMouseMove"
    @mouseleave="show = false"
    @click="handleChangeTime"
  >
    <span v-show="show" class="font-mono font-bold bg-slate-700 text-white rounded-md absolute bottom-0 mb-4 px-2 py-[1px] -translate-x-1/2" :style="`left: ${x}px`">
      {{ hoverTime }}
    </span>
    <div :style="wd" class="h-full bg-slate-700"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useElementSize } from "@vueuse/core";

interface Props {
  total: number;
  time: number;
}
const props = withDefaults(defineProps<Props>(), {});
const emits = defineEmits(["update:time"]);
const root = ref();
const show = ref(false);

const progress = ref(0);

const { width } = useElementSize(root);
const x = ref(0);

function secondsToTime(seconds: number) {
  var hours = Math.floor(seconds / 3600);
  var minutes = Math.floor((seconds % 3600) / 60);
  var remainingSeconds = Math.floor(seconds % 60);
  var formattedTime = (hours < 10 ? "0" : "") + hours + ":" + (minutes < 10 ? "0" : "") + minutes + ":" + (remainingSeconds < 10 ? "0" : "") + remainingSeconds;
  return formattedTime;
}

const wd = computed(() => {
  if (show.value) return { width: width.value * progress.value + "px" };
  return { width: (props.time / props.total) * width.value + "px" };
});
const hoverTime = computed(() => secondsToTime(props.total! * progress.value));

const handleMouseMove = (ev: any) => {
  progress.value = ev.clientX / width.value;
  x.value = ev.clientX;
};

const handleChangeTime = () => {
  emits("update:time", props.total! * progress.value);
};
</script>

<style scoped lang="scss"></style>
