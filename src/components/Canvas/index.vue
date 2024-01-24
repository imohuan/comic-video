<template>
  <div ref="container" class="wh-full">
    <canvas ref="canvasdom"></canvas>
  </div>
</template>

<script setup lang="ts">
import hotkeys from "hotkeys-js";

import { ref, onMounted, watch } from "vue";
import { useElementSize, useEventListener, useRefHistory } from "@vueuse/core";
import type { OcrTextResult } from "../../interface/index";
import { addImage, addOcrRect, watchNestOcr } from "./fabric";
import { ImohuanFabric, DrawingToolEnum } from "../../core/fabric/index";
import { badge, ocr } from "../../core/fabric/shape";
import { clone } from "../../core/utils";
import { OcrTextDetail } from "../../interface/index";

// 提供功能 图片 图片Box框展示 删除部分Box框 添加快捷键 添加Box框

interface Props {
  index: number;
  image?: File | string;
  ocrResult?: OcrTextResult | null;
}
const props = withDefaults(defineProps<Props>(), {});
const emits = defineEmits(["change-detail"]);

let fabric: ImohuanFabric;
const container = ref<HTMLDivElement>();
const canvasdom = ref<HTMLCanvasElement>();
const { width, height } = useElementSize(container);

const current = ref<any>(props.ocrResult?.details);
const { undo, redo, clear } = useRefHistory(current, {});

// const event = mitt();
const imageRect = ref({ x: 0, y: 0, w: 0, h: 0, ow: 0, oh: 0 });

const addHistory = () => {
  // const json = fabric.getJSON();
  // for (let i = json.objects.length - 1; i >= 0; i--) {
  //   const obj = json.objects[i];
  //   if (obj.type === "Ocr") json.objects.splice(i, 1);
  // }
  // if (JSON.stringify(current.value) !== JSON.stringify(json)) current.value = json;
  if (props.ocrResult?.details && JSON.stringify(current.value) !== JSON.stringify(props.ocrResult.details)) {
    current.value = clone(props.ocrResult.details);
  }
};

const loadHistory = () => {
  // fabric.setDrawingTool(DrawingToolEnum.Select);
  // fabric.loadJSON(current.value, () => {
  //   fabric.canvas.renderAll();
  // });
  if (props.ocrResult && current.value) {
    // console.log("current.value", current.value);
    emits("change-detail", props.index, { ...props.ocrResult, details: clone(current.value) });
  }
};

useEventListener("resize", () => {
  fabric.canvas.setWidth(width.value);
  fabric.canvas.setHeight(height.value);
});

const setImage = async () => {
  if (!props.image) return;
  clear(); // 历史记录清除
  fabric.canvas.clear(); // 清除画布
  imageRect.value = await addImage(fabric.canvas, props.image);
  addHistory();
};

const setOcrBoxs = async () => {
  if (!props.ocrResult) return;
  // 重复绘制的时候需要清空之前创建的Badge
  fabric.canvas.forEachObject((obj) => {
    if (obj.type === "Badge") fabric.canvas.remove(obj);
  });

  const { x, y, w, h, ow, oh } = imageRect.value;
  addOcrRect(fabric.canvas, props.ocrResult, { w, h, ow, oh }, { x, y });

  // 在OCR结束后会触发重绘，则添加历史记录
  addHistory();
};

const setCanvas = async () => {
  await setImage();
  setOcrBoxs();
};

const handleCanvasEraser = () => {
  // 下面是 mouse:up
  const indexs = new Set<number>();
  fabric.canvas.getObjects().forEach((obj: any) => {
    if (obj.type === "Badge") indexs.add(obj.text);
  });

  emits("change-detail", props.index, {
    ...props.ocrResult,
    details: Array.from(indexs)
      .map((i) => clone(props.ocrResult?.details?.[i]))
      .filter(Boolean),
  });

  addHistory();
};

const handleCanvasChange = () => {
  // 判断添加的是否是ocr识别框，如果是则不添加历史记录
  if (fabric.currentShape?.type !== "Ocr") addHistory();
  if (fabric.isEraser) setTimeout(() => handleCanvasEraser(), 100);
};

hotkeys("a", () => fabric.setDrawingTool(DrawingToolEnum.Ocr));
hotkeys("l", () => fabric.setDrawingTool(DrawingToolEnum.Sort));
hotkeys("d", () => fabric.setDrawingTool(DrawingToolEnum.Eraser));

hotkeys("ctrl+z", () => {
  undo();
  loadHistory();
});

hotkeys("ctrl+y", () => {
  redo();
  loadHistory();
});

hotkeys("ctrl+shift+z", () => {
  redo();
  loadHistory();
});

watch([() => props.image, () => JSON.stringify(props.ocrResult?.details)], async (newValue, oldValue) => {
  const isChangeFile = newValue[0] !== oldValue[0];
  const isChangeDetail = JSON.stringify(newValue[1]) !== JSON.stringify(oldValue[1]);
  if (isChangeFile) await setImage();
  if (isChangeDetail) setOcrBoxs();
});

onMounted(() => {
  fabric = new ImohuanFabric(canvasdom.value!);
  fabric.addShape(ocr);
  fabric.addShape(badge);
  fabric.canvas.setWidth(width.value);
  fabric.canvas.setHeight(height.value);
  fabric.setDrawingTool(DrawingToolEnum.Select);
  setCanvas();

  /** 绘制对话框顺序 */
  fabric.onCustom("sort-indexs", (indexs: number[]) => {
    const _details = props.ocrResult?.details ?? [];
    const details: OcrTextDetail[] = [];
    indexs.forEach((index) => details.push(_details[index]));

    _details.forEach((_detail, index) => {
      if (indexs.includes(index)) return;
      details.push(_detail);
    });

    emits("change-detail", props.index, { ...props.ocrResult, details });
  });

  fabric.on("mouse:up:before", () => {
    // 监听用户画OCR框（内部识别）
    if (fabric.currentShape?.type === "Ocr") {
      let index = props.index;
      const change = (value: any) => emits("change-detail", index, value);
      watchNestOcr(fabric.canvas, fabric.currentShape, imageRect.value, props.ocrResult || { details: [], img: null, detection_size: 1536 }, change);
    }
  });
  fabric.on("mouse:up:before", () => handleCanvasChange());
});

defineExpose({ setCanvas });
</script>

<style scoped lang="scss"></style>
