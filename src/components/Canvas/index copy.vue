<template>
  <div ref="container" class="wh-full">
    <canvas ref="canvasdom"></canvas>
  </div>
</template>

<script setup lang="ts">
// import mitt from "mitt";
import hotkeys from "hotkeys-js";

import { ref, onMounted, watch } from "vue";
import { useElementSize, useEventListener, useRefHistory } from "@vueuse/core";
import type { OcrTextResult } from "../../interface/index";
import { addImage, addOcrRect, watchNestOcr } from "./fabric";
import { ImohuanFabric, DrawingToolEnum } from "../../core/fabric/index";
import { badge, ocr } from "../../core/fabric/shape";
import { Object as IObject } from "fabric/fabric-impl";

// 提供功能 图片 图片Box框展示 删除部分Box框 添加快捷键 添加Box框

interface Props {
  image?: File;
  ocrResult?: OcrTextResult | null;
}
const props = withDefaults(defineProps<Props>(), {});
const emits = defineEmits(["change-detail"]);

let fabric: ImohuanFabric;
const container = ref<HTMLDivElement>();
const canvasdom = ref<HTMLCanvasElement>();
const { width, height } = useElementSize(container);

const current = ref<{ version: string; objects: IObject[] }>();
const { undo, redo, clear } = useRefHistory(current, {});

// const event = mitt();
const imageRect = ref({ x: 0, y: 0, w: 0, h: 0, ow: 0, oh: 0 });

const addHistory = () => {
  const json = fabric.getJSON();
  for (let i = json.objects.length - 1; i >= 0; i--) {
    const obj = json.objects[i];
    if (obj.type === "Ocr") json.objects.splice(i, 1);
  }

  if (JSON.stringify(current.value) !== JSON.stringify(json)) current.value = json;
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

  emits("change-detail", {
    ...props.ocrResult,
    details: Array.from(indexs)
      .map((i) => props.ocrResult?.details?.[i])
      .filter(Boolean),
  });

  addHistory();
};

const handleCanvasChange = () => {
  // 判断添加的是否是ocr识别框，如果是则不添加历史记录
  if (fabric.currentShape?.type !== "Ocr") current.value = fabric.getJSON();
  if (fabric.isEraser) setTimeout(() => handleCanvasEraser(), 100);
};

const handleHistoryChange = () => {
  fabric.setDrawingTool(DrawingToolEnum.Select);
  fabric.loadJSON(current.value, () => {
    fabric.canvas.renderAll();
  });
};
hotkeys("a", () => fabric.setDrawingTool(DrawingToolEnum.Ocr));
hotkeys("d", () => fabric.setDrawingTool(DrawingToolEnum.Eraser));

hotkeys("ctrl+z", () => {
  undo();
  handleHistoryChange();
});

hotkeys("ctrl+y", () => {
  redo();
  handleHistoryChange();
});

watch([() => props.image, () => props.ocrResult?.details.length], async (newValue, oldValue) => {
  const isChangeFile = newValue[0] !== oldValue[0];
  const isChangeLength = newValue[1] !== oldValue[1];
  if (isChangeFile) await setImage();
  if (isChangeLength) setOcrBoxs();
});

onMounted(() => {
  fabric = new ImohuanFabric(canvasdom.value!);
  fabric.addShape(ocr);
  fabric.addShape(badge);
  fabric.canvas.setWidth(width.value);
  fabric.canvas.setHeight(height.value);
  fabric.setDrawingTool(DrawingToolEnum.Select);
  setCanvas();

  fabric.on("mouse:up:before", () => {
    if (fabric.currentShape?.type === "Ocr") {
      const change = (value: any) => {
        emits("change-detail", value);
      };
      watchNestOcr(fabric.canvas, fabric.currentShape, imageRect.value, props.ocrResult || { details: [], img: null, detection_size: 1536 }, change);
    }
  });
  fabric.on("mouse:up:before", () => handleCanvasChange());
});

defineExpose({ setCanvas });
</script>

<style scoped lang="scss"></style>
