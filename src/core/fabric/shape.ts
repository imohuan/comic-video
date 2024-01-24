import { Shape } from "./index";
import { Badge } from "./obj-badge";
import { Ocr } from "./obj-ocr";

export const ocr: Shape = {
  name: "ocr",
  hotkey: "o",
  draw: ({ x, y }, options) => new Ocr({ left: x, top: y, width: 0, height: 0, ...options }),
  moveChange: ({ width, height }) => ({ width, height }),
};

export const badge: Shape = {
  name: "badge",
  hotkey: "",
  draw: ({ x, y }, options) => new Badge({ left: x, top: y, width: 0, height: 0, ...options }),
  moveChange: ({ width, height }) => ({ width, height }),
};
