<template>
  <Play v-if="isPlay" class="fixed left-0 right-0 bottom-0 top-0 z-10" :data="list" />

  <Layout>
    <template #header>
      <div class="font-mono font-bold text-2xl relative">
        <span>{{ index + 1 }} / {{ list.length }}</span>
        <div class="absolute left-full bottom-0 ml-2 text-xs">
          <span v-if="ocrLoadingLen > 0">OCR{{ ocrLoadingLen }}</span>
          <span v-if="ttsLoadingLen > 0">TTS{{ ttsLoadingLen }}</span>
        </div>
      </div>
    </template>
    <template #default>
      <Canvas ref="canvas" :index="index" :image="cur?.url ?? cur?.file" :ocr-result="cur?.ocrResult" @change-detail="handleChangeDetail"></Canvas>
    </template>
    <template #right>
      <div class="flex flex-col space-y-2">
        <DragFiles @change="handleUploadFiles" />

        <!-- <input ref="file" type="file" multiple @change="handleUploadFiles" /> -->
        <div class="flex center space-x-2">
          <n-checkbox v-model:checked="isTrans"> 翻译 </n-checkbox>
          <div class="flex-1"><n-select v-model:value="targetLang" :options="langOption" /></div>
        </div>

        <div class="space-x-2">
          <n-button @click="handleOcr()">OCR</n-button>
          <n-button @click="handleTTS()">TTS</n-button>
          <n-button>
            <label for="import">Import</label>
            <input id="import" type="file" accept=".imohuan" class="hidden" @change="handleImport" />
          </n-button>
          <n-button @click="handleExport()">Export</n-button>
        </div>

        <div class="flex items-center space-x-2">
          <n-select v-model:value="ttsRole" :options="VOICE_OPTION" />
          <n-input-number v-model:value="ttsRate" button-placement="both" :min="0.5" :max="2" :step="0.1" class="w-48 font-mono" />
          <n-button @click="handleTestAudio">试听</n-button>
        </div>

        <audio v-if="cur?.audio" :src="cur.audio" controls></audio>

        <div class="space-x-2">
          <!-- <n-button @click="handleTTS()">Sort R->L</n-button> -->
        </div>
        <div class="w-full pr-4 space-y-2">
          <VueDraggable
            v-if="cur?.ocrResult && cur.ocrResult.details.length > 0"
            v-model="cur.ocrResult.details"
            @update:model-value="handleChangeDetail(index, cur.ocrResult)"
            :animation="150"
            target=".sort-target"
          >
            <TransitionGroup type="transition" tag="div" name="fade" class="sort-target w-full pr-4 space-y-2">
              <div v-for="(detail, index) in cur.ocrResult.details" class="" :key="detail.text + index">
                <n-badge show-zero :value="index" processing class="w-full">
                  <n-input type="textarea" v-model:value="detail.text" @update:value="handleChangeText" clearable show-count />
                </n-badge>
              </div>
            </TransitionGroup>
          </VueDraggable>
        </div>
      </div>
    </template>
    <template #footer>
      <n-input type="textarea" :value="cur?.text" readonly placeholder="文本内容"></n-input>
    </template>
  </Layout>
</template>

<script setup lang="ts">
import Layout from "./components/Layout.vue";
import Play from "./components/Play.vue";
import Canvas from "./components/Canvas/index.vue";
import DragFiles from "./components/DragFiles.vue";
import { VueDraggable } from "vue-draggable-plus";

import pako from "pako";
import hotkeys from "hotkeys-js";
import { ref, computed, onMounted } from "vue";
import { Item } from "./interface";
import { getText } from "./core/ocr";
import { OcrTextResult } from "./interface/index";
// import { useEventListener } from "@vueuse/core";
import { TTS } from "./core/tts";
import { VOICE_OPTION } from "./core/tts/config";
import { fileToBase64, clone, fileToArrayBuffer, base64ToFile } from "./core/utils";
import { defaultsDeep } from "lodash-es";

const canvas = ref<any>();
const index = ref(0);
const isTrans = ref(false);
const targetLang = ref("CHS");
const list = ref<Item[]>([]);
const tts = new TTS();
const ttsRole = ref(VOICE_OPTION[0].value);
const ttsRate = ref(1);
const isPlay = ref(false);

const langOption = [
  { label: "中文(简体)", value: "CHS" },
  { label: "中文(繁体)", value: "CHT" },
  { label: "捷克语", value: "CSY" },
  { label: "荷兰语", value: "NLD" },
  { label: "英语", value: "ENG" },
  { label: "法语", value: "FRA" },
  { label: "德语", value: "DEU" },
  { label: "匈牙利语", value: "HUN" },
  { label: "意大利语", value: "ITA" },
  { label: "日语", value: "JPN" },
  { label: "韩语", value: "KOR" },
  { label: "波兰语", value: "PLK" },
  { label: "葡萄牙语(巴西)", value: "PTB" },
  { label: "罗马尼亚语", value: "ROM" },
  { label: "俄语", value: "RUS" },
  { label: "西班牙语", value: "ESP" },
  { label: "土耳其语", value: "TRK" },
  { label: "乌克兰语", value: "UKR" },
  { label: "越南语", value: "VIN" },
  { label: "阿拉伯语", value: "ARA" },
  { label: "塞尔维亚语", value: "SRP" },
  { label: "克罗地亚语", value: "HRV" },
  { label: "泰语", value: "THA" },
];

const cur = computed(() => {
  if (list.value.length === 0) return null;
  return list.value[index.value];
});

const ocrLoadingLen = computed(() => {
  return list.value.filter((item) => item.ocrLoading).length;
});

const ttsLoadingLen = computed(() => {
  return list.value.filter((item) => item.ttsLoading).length;
});

const addItem = (file: File) => {
  const url = URL.createObjectURL(file);
  list.value.push({ url, file, audio: "", audioBuffer: null, ocrLoading: false, ocrResult: null, text: "", ttsLoading: false, ttsBuffer: null });
};

/** 批量上传图片 */
const handleUploadFiles = (files: File[]) => {
  if (files.length === 0) return;
  list.value = [];
  files.forEach((file) => addItem(file));
  canvas.value.setCanvas();
};

const handleChangeText = () => {
  if (!cur.value || !cur.value.ocrResult) return;
  cur.value.text = cur.value.ocrResult.details.map((m) => m.text).join(" ");
};

const parseText = (ocrResult: OcrTextResult) => {
  const text = ocrResult.details.map((m) => m.text);
  const matchs = text.join(" ").match(/[\u4e00-\u9fa5a-zA-Z0-9]+/g) ?? [text];
  return matchs.join(" ");
};

const handleOcr = (i: number = -1) => {
  if (list.value.length === 0) return;
  if (i === -1) i = index.value;
  const item = list.value[i];
  item.ocrLoading = true;
  getText(item.file, isTrans.value, targetLang.value)
    .then((res) => {
      item.ocrResult = res;
      item.text = parseText(item.ocrResult);
    })
    .finally(() => (item.ocrLoading = false));
};

const handleTTS = (i: number = -1) => {
  if (list.value.length === 0) return;
  if (i === -1) i = index.value;
  const item = list.value[i];
  const text = item.text;
  item.ttsLoading = true;
  if (!text.trim()) {
    item.ttsBuffer = null;
    item.audio = "";
    item.ttsLoading = false;
    return;
  }
  tts
    .speak(text, { roleVoice: { name: ttsRole.value, rate: ttsRate.value } })
    .then((res) => {
      item.ttsBuffer = res.buffers;
      item.audio = URL.createObjectURL(new Blob([res.buffers], { type: "audio/mpeg" }));
    })
    .finally(() => (item.ttsLoading = false));
};

/** 监听子组件 change-detail */
const handleChangeDetail = (index: number, _ocrResult: OcrTextResult) => {
  list.value[index].ocrResult = _ocrResult;
  list.value[index].text = parseText(_ocrResult);
};

/** 试听按钮 */
const handleTestAudio = () => {
  tts.speak("你好，我是你的语音助手", { roleVoice: { name: ttsRole.value, rate: ttsRate.value } }).then((res) => res.audio.play());
};

/** 导入 */
const handleImport = async (ev: any) => {
  if (ev.target.files.length === 0) return;
  const file = ev.target.files[0];
  try {
    const arraybuffer = await fileToArrayBuffer(file);
    const decompressedData = pako.inflate(arraybuffer, { to: "string" });
    let _list = JSON.parse(decompressedData);

    _list = _list.map((item: any) => {
      let url = "";
      let audio = "";
      let file = item.file;
      let ttsBuffer = item.ttsBuffer;
      if (file) {
        file = base64ToFile(item.file);
        url = URL.createObjectURL(file);
      }
      if (ttsBuffer) {
        ttsBuffer = pako.inflate(ttsBuffer);
        audio = URL.createObjectURL(new Blob([ttsBuffer], { type: "audio/mpeg" }));
      }
      return { ...item, url, file, audio, ttsBuffer };
    });

    list.value = _list;
  } catch (e) {
    console.log(e);
  }
};

/** 导出 */
const handleExport = async () => {
  // 获取所有图片的 base64
  const datas = await Promise.all(
    list.value.map(async (item) => {
      const base64 = await fileToBase64(item.file);
      let ttsBuffer = null;
      if (item.ttsBuffer) {
        ttsBuffer = pako.deflate(item.ttsBuffer);
      }
      return defaultsDeep(clone(item), { file: base64, ttsBuffer });
    })
  );
  // console.log(datas);

  // 使用 Pako 压缩数据
  let compressedData = pako.deflate(JSON.stringify(datas));
  console.log("compressedData", compressedData);
  // 创建 Blob 并生成下载链接
  let blob = new Blob([compressedData], { type: "application/octet-stream" });
  let link = document.createElement("a");
  link.href = URL.createObjectURL(blob);

  const filename = window.prompt("导出名称:", "");
  link.download = `${filename}.imohuan`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

onMounted(() => {
  hotkeys("ctrl + delete", () => {
    if (cur.value && cur.value.ocrResult && cur.value.ocrResult.details) {
      cur.value.ocrResult.details = [];
    }
  });

  // 全部OCR
  hotkeys("q", () => {
    const loading = list.value.some((item) => item.ocrLoading);
    if (loading) return;
    list.value.forEach((item, index) => {
      if (!item.ocrResult) handleOcr(index);
    });
  });

  // 重新配音
  hotkeys("r", () => {
    if (cur.value && cur.value.ocrResult) handleTTS();
  });

  // 全部配音
  hotkeys("t", () => {
    const ttsLoading = list.value.some((item) => item.ttsLoading);
    if (ttsLoading) return;
    list.value.forEach((item, index) => {
      if (!item.ttsBuffer && item.ocrResult) handleTTS(index);
    });
  });

  hotkeys("w", () => {
    let _index = index.value - 1;
    if (_index < 0) _index = 0;
    index.value = _index;
  });

  hotkeys("s", () => {
    let _index = index.value + 1;
    if (_index > list.value.length - 1) _index = list.value.length - 1;
    index.value = _index;
  });

  hotkeys("space", () => {
    if (list.value.length === 0) return;
    isPlay.value = !isPlay.value;
  });

  // 不知道为什么s键按不下，没有效果，没有触发，其他按钮正常
  // useEventListener(window, "keydown", (event) => {
  //   let _index = index.value;
  //   console.log(event.key);
  //   switch (event.key) {
  //     case "q":
  //       const loading = list.value.some((item) => item.ocrLoading);
  //       if (loading) return;
  //       list.value.forEach((item, index) => {
  //         if (!item.ocrResult) handleOcr(index);
  //       });
  //       break;

  //     case "r":
  //       if (cur.value && cur.value.ocrResult) handleTTS();
  //       break;
  //     case "t":
  //       const ttsLoading = list.value.some((item) => item.ttsLoading);
  //       if (ttsLoading) return;
  //       list.value.forEach((item, index) => {
  //         if (!item.ttsBuffer && item.ocrResult) handleTTS(index);
  //       });
  //       break;
  //     case "w":
  //       _index--;
  //       if (_index < 0) _index = 0;
  //       break;
  //     case "s":
  //       _index++;
  //       if (_index > list.value.length - 1) _index = list.value.length - 1;
  //       break;

  //     case " ":
  //       // 播放
  //       if (list.value.length === 0) return;
  //       isPlay.value = !isPlay.value;
  //       break;
  //   }

  //   index.value = _index;
  //   console.log("_index", _index);
  // });
});
</script>

<style scoped></style>
