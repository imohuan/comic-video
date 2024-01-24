<template>
  <div class="wh-full bg-white">
    <div class="wh-full center" @click="handleAudioToggle">
      <img :src="cur?.url" class="blcok h-full" />
      <div class="absolute left-0 right-0 top-0 bottom-0 bg-gray-400 bg-opacity-50 center z-20" v-show="!isPlay"><img :src="PlaySvg" alt="" /></div>
    </div>
    <div class="absolute right-0 bottom-0 hidden">
      <audio ref="audioRef" @timeupdate="handleTimeUpdate" v-show="cur?.audio" :src="cur?.audio || ''" controls autoplay @ended="handleEndedd"></audio>
    </div>
    <Progress :total="totalTime" v-model:time="time" @update:time="handleChangeTime" />
  </div>
</template>

<script setup lang="ts">
import PlaySvg from "../assets/play.svg";
import Progress from "./Progress.vue";
import { computed, ref, watch, onMounted } from "vue";
import { Item } from "../interface";
import { sum } from "lodash-es";
import { useEventListener } from "@vueuse/core";

interface Props {
  data: Item[];
}
const props = withDefaults(defineProps<Props>(), {});
/** 时间对照 */
const times = ref<number[]>([]);
/** 当前音频正在播放时间 */
const time = ref(0);
/** 空白显示时间 */
const whiteTime = 3;
/** 计算总时长 */
const totalTime = computed(() => sum(times.value));

const isPlay = ref(true);

const audioRef = ref<HTMLAudioElement>();
const index = ref(0);
const cur = computed(() => {
  if (props.data.length === 0) return null;
  return props.data[index.value];
});

const handleEndedd = () => {
  let i = index.value + 1;
  if (i >= props.data.length - 1) i = props.data.length - 1;

  if (times.value[i] < whiteTime) setTimeout(() => (index.value = i), (whiteTime - times.value[i]) * 1000);
  else index.value = i;
};

const handleAutoPlay = () => {
  isPlay.value = true;
  if (!cur.value?.audio) setTimeout(() => handleEndedd(), times.value[index.value]);
};

const handleChangeTime = () => {
  let ctime = 0;
  let _index = 0;
  for (let i = 0; i < times.value.length; i++) {
    if (ctime < time.value && ctime + times.value[i] < time.value) {
      ctime += times.value[i];
    } else {
      _index = i;
      break;
    }
  }
  index.value = _index;
  const skipTime = time.value - ctime;
  audioRef.value!.currentTime = skipTime;
};

const handleTimeUpdate = () => {
  const duration: number = audioRef.value?.currentTime ?? 0;
  time.value = sum(times.value.slice(0, index.value)) + duration;
};

const handleAudioToggle = () => {
  if (!audioRef.value) return;
  if (isPlay.value) {
    audioRef.value.pause();
    isPlay.value = false;
  } else {
    audioRef.value.play();
    isPlay.value = true;
  }
};

watch(
  () => cur.value?.audio,
  () => handleAutoPlay()
);

useEventListener("keydown", (event) => {
  console.log(event.key);

  let _time = time.value;

  switch (event.key) {
    case "ArrowLeft":
      _time -= 1;
      if (_time === 0) _time = 0;
      break;
    case "ArrowRight":
      _time += 1;
      if (_time >= totalTime.value) _time = totalTime.value;
      break;
  }

  time.value = _time;
  handleChangeTime();
});

onMounted(async () => {
  function getAudioDuration(audioSrc: string): Promise<number> {
    return new Promise((resolve, reject) => {
      var audio = new Audio(audioSrc);
      audio.addEventListener("loadedmetadata", function () {
        var duration = audio.duration;
        // console.log("duration", duration);
        resolve(duration);
      });
      audio.addEventListener("error", function (err) {
        reject(err);
      });
      audio.src = audioSrc;
    });
  }

  times.value = await Promise.all(props.data.map((item) => (item.audio ? getAudioDuration(item.audio) : whiteTime)));
  handleAutoPlay();
});
</script>

<style scoped lang="scss"></style>
