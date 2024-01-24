import { Converter } from "opencc-js";

import { CacheFile } from "../interface";

export function uuidv4() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** 繁体字转简体字 */
export function converterText(text: string) {
  const converter = Converter({ from: "hk", to: "cn" });
  return converter(text);
}

// File转base64
export function fileToBase64(file: File): Promise<CacheFile> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = function (e: any) {
      resolve({ filename: file.name, type: file.type, image: e.target.result });
    };
    reader.readAsDataURL(file);
  });
}

// File转ArrayBuffer
export function fileToArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = function (e: any) {
      resolve(e.target.result);
    };
    reader.readAsArrayBuffer(file);
  });
}

// base64转File
export function base64ToFile(item: CacheFile): File {
  const { filename, type, image } = item;
  const byteCharacters = atob(image.split(",")[1]);
  const byteArrays = [];
  for (let i = 0; i < byteCharacters.length; i++) byteArrays.push(byteCharacters.charCodeAt(i));
  const byteArray = new Uint8Array(byteArrays);
  const blob = new Blob([byteArray], { type });
  return new File([blob], filename, { type });
}

export function clone(data: any) {
  return JSON.parse(JSON.stringify(data));
}
