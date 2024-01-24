import { fabric } from "fabric";
import { Canvas as ICanvas, Image as IImage, Object as IObject } from "fabric/fabric-impl";
import { cloneDeep, isString } from "lodash-es";

import { badge } from "../../core/fabric/shape";
import { getText } from "../../core/ocr";
import { OcrTextResult, Rect } from "../../interface";

export function addImage(canvas: ICanvas, imageData: File | string): Promise<Rect> {
  return new Promise((resolve) => {
    const url = isString(imageData) ? imageData : URL.createObjectURL(imageData);

    fabric.Image.fromURL(url, (img: IImage) => {
      // 计算图片居中的位置
      const canvasWidth = canvas.getWidth();
      const canvasHeight = canvas.getHeight();

      const imgWidth = (img.width as number) * (img.scaleX as number);
      const imgHeight = (img.height as number) * (img.scaleY as number);

      // 计算缩放比例
      const scaleX = canvasWidth / imgWidth;
      const scaleY = canvasHeight / imgHeight;
      const scale = Math.min(scaleX, scaleY, 1); // 确保图片不会被放大超过原始尺寸

      // 设置图片宽高
      img.set({ scaleX: scale, scaleY: scale });

      // 更新缩放后的宽高
      const imageWidth = imgWidth * scale;
      const imageHeight = imgHeight * scale;

      // 计算居中位置
      const left = (canvasWidth - imageWidth) / 2;
      const top = (canvasHeight - imageHeight) / 2;

      // rect.value = { x: left, y: top, w: imageWidth, h: imageHeight };

      // 设置图片位置并添加到画布
      img.set({ left, top, selectable: false });
      // 不能删除
      img.set({ lock: true } as any);

      canvas.add(img);
      canvas.renderAll();

      resolve({ x: left, y: top, w: imageWidth, h: imageHeight, ow: imgWidth, oh: imgHeight });
    });
  });
}

export function addOcrRect(
  canvas: ICanvas,
  ocrResult: OcrTextResult,
  imageSize: { w: number; h: number; ow: number; oh: number },
  canvasOffset: { x: number; y: number } = { x: 0, y: 0 }
) {
  const scale = imageSize.h / imageSize.oh;

  ocrResult.details.forEach((detail, index) => {
    //  计算偏移
    const { minX, maxX, minY, maxY } = detail;
    // 重置图片(检测时会放大图片)相对原始图片的缩放
    let [x, y, w, h] = [minX, minY, maxX - minX, maxY - minY].map((m) => m * scale);
    // 修复当前相对画布的偏移
    // 1. 图片居中显示的时候，图片左上角坐标就是偏移坐标
    // 2. 在上述图片中裁剪图片的时候根据画布中的坐标（Point）为偏移坐标
    x += canvasOffset.x;
    y += canvasOffset.y;

    const obj = badge.draw({ x, y }, { width: w, height: h, text: index, selectable: false });
    canvas.add(obj);
  });

  canvas.renderAll();
}

/** 获取画布指定区域图片 */
export function getCanvasRectImage(canvas: ICanvas, left: number, top: number, width: number, height: number, includes: string[] = ["image"]) {
  // 创建一个临时的画布
  const tempCanvas = new fabric.Canvas(null);
  tempCanvas.setWidth(width);
  tempCanvas.setHeight(height);

  // 克隆当前画布上的所有对象
  const imageObjects = canvas.getObjects().filter((f) => f.type && includes.includes(f.type));
  if (imageObjects.length === 0) return null;

  imageObjects.forEach((obj) => {
    const clone = fabric.util.object.clone(obj);
    clone.set({ left: clone.left - left, top: clone.top - top });
    tempCanvas.add(clone);
  });

  // 确保克隆的对象都被渲染到临时画布上
  tempCanvas.renderAll();
  // 获取指定区域的图片数据
  const imageData = tempCanvas.toDataURL({ format: "png", width, height });
  // 删除临时画布
  tempCanvas.dispose();
  return imageData;
}

/** 监听画布创建Ocr框，执行OCR识别 */
export function watchNestOcr(canvas: ICanvas, ocrObject: IObject, rect: Rect, ocrResult: OcrTextResult, change: (ocrResult: OcrTextResult) => void) {
  // 初始化选区
  let { left, top, width, height, strokeWidth } = ocrObject;
  if (!strokeWidth) strokeWidth = 0;
  if (!left || !top || !width || !height) return;

  left += strokeWidth;
  top += strokeWidth;
  width -= strokeWidth;
  height -= strokeWidth;

  // 获取选取截图
  const imgBase64 = getCanvasRectImage(canvas, left, top, width, height);
  if (!imgBase64) return;

  getText(imgBase64)
    .then((res) => {
      const _ocrResult = cloneDeep(ocrResult);
      res.details.forEach((detail) => {
        const scale = rect.oh / rect.h;
        // detail.minX + left! - rect.x 这样才是正常偏移
        // 图片偏移追加x，y轴的偏移，并且因为全局渲染，全局会自定义计算图片相对画布的偏移，但是因为我们的坐标就存在了画布的偏移，所以需要减去
        // scale * ? 因为根据全局的detail进行渲染的，全局会进行缩放（因为画布上显示的图片和本身图片宽高不一致，所以会进行缩放）这里进行反向缩放（--的正把），
        detail.minX = scale * (detail.minX + left! - rect.x);
        detail.maxX = scale * (detail.maxX + left! - rect.x);
        detail.minY = scale * (detail.minY + top! - rect.y);
        detail.maxY = scale * (detail.maxY + top! - rect.y);
        _ocrResult.details.push(detail);
      });
      change(_ocrResult);
      // addOcrRect(canvas, res, { w: width!, h: height!, ow: width!, oh: height! }, { x: left!, y: top! });
    })
    .finally(() => {
      canvas.remove(ocrObject);
      canvas.renderAll();
    });
}
