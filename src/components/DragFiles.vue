<template>
  <div
    @dragenter="handleDragEnter"
    @dragleave="handleDragLeave"
    @dragover="handleDragOver"
    @drop="handleDrop"
    @click="file.click()"
    class="w-full h-32 border-2 border-black bg-gray-200 rounded-md center"
  >
    <!--  -->
    <span class="select-none text-gray-800">上传图片(支持点击/拖拽图片)</span>
  </div>
  <input ref="file" type="file" multiple @change="handleChange" class="hidden" />
</template>

<script setup lang="ts">
import { ref } from "vue";

const file = ref();
const emits = defineEmits(["change"]);
// 图片上传
const handleDragEnter = (ev: any) => {
  ev.preventDefault();
  ev.stopPropagation();
  ev.target.classList.add("focus");
};

const handleDragLeave = (ev: any) => {
  ev.preventDefault();
  ev.stopPropagation();
  ev.target.classList.remove("focus");
};
const handleDragOver = (ev: any) => {
  ev.preventDefault();
  ev.stopPropagation();
};
const handleDrop = (ev: any) => {
  ev.preventDefault();
  ev.target.classList.remove("focus");

  const files: File[] = [];
  if (ev.dataTransfer.items) {
    for (var i = 0; i < ev.dataTransfer.items.length; i++) {
      if (ev.dataTransfer.items[i].kind === "file") {
        files.push(ev.dataTransfer.items[i].getAsFile());
      }
    }
  }

  if (files.length > 0) emits("change", files);
};
const handleChange = (ev: any) => {
  if (ev.target.files.length === 0) return;
  emits("change", Array.from(ev.target.files));
};
</script>

<style scoped lang="scss"></style>
