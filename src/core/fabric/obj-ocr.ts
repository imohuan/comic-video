import { fabric } from "fabric";
import { IRectOptions } from "fabric/fabric-impl";
import { defaultsDeep } from "lodash-es";
/*
fabric.util.createClass 配合 fabric.util.animate 实现扫描动画
*/

export const Ocr = fabric.util.createClass(fabric.Rect, {
  type: "Ocr",
  initialize(option: IRectOptions, options: any) {
    defaultsDeep(option, {
      fill: "rgba(0, 0, 0, 0.4)",
      stroke: "block",
      strokeWidth: 2,
    });
    this.callSuper("initialize", option, options);
    this.animateScan();
  },
  animateScan() {
    const obj = this;
    const duration = 1000;
    fabric.util.animate({
      startValue: -this.width,
      endValue: this.width,
      duration: duration,
      onChange: function (value) {
        obj.scanLineX = value;
        obj.dirty = true;
        obj.setCoords(); // 更新对象的坐标
        obj.canvas && obj.canvas.requestRenderAll(); // 请求重绘画布
      },
      onComplete: function () {
        obj.animateScan(); // 动画完成后重新开始
      },
    });
  },
  _render(ctx: any) {
    this.callSuper("_render", ctx);
    ctx.save();

    const x = -this.width / 2;
    const y = -this.height / 2;

    // 绘制文字
    ctx.font = "14px Arial";
    ctx.fillStyle = "block";
    // ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("OCR", x + 2, y + 10);

    if (typeof this.scanLineX !== "undefined") {
      const gradient = ctx.createLinearGradient(this.scanLineX - 10, 0, this.scanLineX + 10, 0);
      gradient.addColorStop(0, "transparent");
      gradient.addColorStop(0.5, "rgba(255, 255, 255, 0.5)");
      gradient.addColorStop(1, "transparent");
      ctx.fillStyle = gradient;
      ctx.fillRect(x, y, this.width, this.height);
    }

    ctx.restore();
  },
  toObject() {
    return fabric.util.object.extend(this.callSuper("toObject", this), {});
  },
});

Ocr.fromObject = (options: any, callback: any) => {
  return callback(new Ocr(options));
};

Object.assign(fabric, { Ocr });
