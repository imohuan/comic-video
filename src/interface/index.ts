export interface Item {
  /** 图片File */
  file: File;
  /** 图片的blob地址 */
  url: string;
  /** TTS的文本内容 */
  text: string;
  /** audio ArrayBuffer */
  audio: string;
  audioBuffer: ArrayBuffer[] | null;

  ocrLoading: boolean;
  ocrResult: OcrTextResult | null;

  ttsLoading: boolean;
  ttsBuffer: ArrayBuffer | null;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
  ow: number;
  oh: number;
}

export interface Cache {
  id: string;
  list: Item[];
}

export interface CacheFile {
  filename: string;
  type: string;
  image: string;
}

export interface OcrTextDetail {
  /** OCR文本内容 */
  text: string;
  /** 画框 */
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  /** 文字颜色 */
  textColor: {
    fg: [number];
    bg: [number];
  };
  /** 识别到的语言 */
  language: string;
  background: null;

  rect?: Rect;
}

export interface OcrTextResult {
  details: OcrTextDetail[];
  img: null;
  /** 检测图片样本的高度：图片上传后会进行缩放，太小的图片会影响OCR */
  detection_size: number;
}
