import { fabric } from "fabric";
import { IRectOptions } from "fabric/fabric-impl";
import { defaultsDeep } from "lodash-es";

export const Badge = fabric.util.createClass(fabric.Rect, {
  type: "Badge",
  initialize(option: IRectOptions, options: any) {
    defaultsDeep(option, { fill: "rgba(0, 0, 0, 0.2)", stroke: "red", strokeWidth: 2 });
    this.callSuper("initialize", option, options);
  },
  _render(ctx: any) {
    this.callSuper("_render", ctx);
    ctx.save();

    // ctx.fillStyle = "blue";
    // ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);

    const [x, y] = [this.width, this.height].map((m) => m / 2);

    // 绘制圆
    ctx.beginPath();
    ctx.arc(-x, -y, 14, 0, 2 * Math.PI, false);
    ctx.fillStyle = "gray";
    ctx.fill();
    ctx.closePath();

    // 绘制文字
    ctx.font = "14px Arial";
    ctx.fillStyle = "white";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(this.text, -x, -y);

    ctx.restore();
  },
  toObject() {
    return fabric.util.object.extend(this.callSuper("toObject", this), { text: this.text });
  },
});

Badge.fromObject = (options: any, callback: any) => {
  return callback(new Badge(options));
};

Object.assign(fabric, { Badge });
