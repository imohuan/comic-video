import { fabric } from "fabric";
import { Canvas, EventName, ICanvasOptions, IEvent, IPoint, Object as IObject, StaticCanvas } from "fabric/fabric-impl";
import hotkeys from "hotkeys-js";
import { defaultsDeep, get } from "lodash-es";
import mitt from "mitt";

export enum DrawingToolEnum {
  /** 手绘 */
  Pencil = "pencil",
  /** 选择 */
  Select = "select",
  /** 橡皮檫 */
  Eraser = "eraser",
  /** Ocr 识别框 */
  Ocr = "ocr",
  /** 对话顺序画笔 */
  Sort = "sort",
  /** None */
  None = "",
}

export interface ShapeOptions {
  stroke: string;
  strokeWidth: number;
  fill: string;
  opacity: number;
}

export interface Shape {
  hotkey: string;
  draw: (objOps: { x: number; y: number }, options: any) => IObject;
  moveChange: (option: { width: number; height: number }) => any;
  name: string;
}

export interface ImohuanFabricOption {
  /** 开启画布缩放功能 */
  enableScale: boolean;
  /** 最大缩放 */
  scaleMax: number;
  /** 最小缩放 */
  scaleMin: number;
  /** 开启平移功能 */
  enableTranslation: boolean;
}

fabric.Object.prototype.toObject = (function (toObject) {
  return function (this: fabric.Object) {
    return fabric.util.object.extend(toObject.call(this), {
      selectable: this.selectable,
      lock: get(this, "lock", false),
    });
  };
})(fabric.Object.prototype.toObject);

export class ImohuanFabric {
  public canvas: Canvas;

  /** 是否画图 */
  isDrawing = false;
  startPoint = { x: 0, y: 0 };
  /** 是否平移 */
  isTranslation = false;
  isEraser = false;
  isSort = false;
  lastPoint = { x: 0, y: 0 };
  drawingTool: DrawingToolEnum = DrawingToolEnum.None;
  currentShape: IObject | null = null;
  private emitter = mitt();
  private option: ImohuanFabricOption;
  private shapeMap = new Map<string, Shape>();

  constructor(element: HTMLCanvasElement, option: Partial<ImohuanFabricOption> = {}) {
    this.canvas = new fabric.Canvas(element, {
      isDrawingMode: true,
      selection: false,
      includeDefaultValues: false, // 转换成json对象，不包含默认值
    });
    this.option = defaultsDeep(option, {
      enableScale: true,
      scaleMin: 1,
      scaleMax: 20,
      enableTranslation: true,
    } as ImohuanFabricOption);
    this.setDrawingTool(DrawingToolEnum.Pencil);
    this.initEvent();
  }

  get zoom() {
    return this.canvas.getZoom();
  }

  public setDrawingTool(tool: DrawingToolEnum) {
    if (this.drawingTool === tool) return;
    this.drawingTool = tool;
    // 清空状态
    this.canvas.selection = false;
    this.canvas.isDrawingMode = false;
    this.isEraser = tool === "eraser";
    this.isSort = tool === "sort";

    if (tool === "pencil") {
      this.draw();
    } else if (tool === "eraser") {
      this.eraser();
    } else if (tool === "sort") {
      this.drawSort();
    } else if (tool === "select") {
      this.canvas.selection = true;
      this.canvas.defaultCursor = "auto";
    }
  }

  public addShape(shape: Shape) {
    this.shapeMap.set(shape.name, shape);
    if (shape.hotkey) hotkeys(shape.hotkey, () => this.setDrawingTool(shape.name as any));
  }

  private initEvent() {
    this.initSortEvents();
    this.initDrawingRemoveEvents();
    this.initDrawingEvents();
    this.initScalingEvents();
    this.initTranslationEvents();
  }

  private initSortEvents() {
    const getPointer = (event: IEvent): IPoint => this.canvas.getPointer(event.e);
    const objects = new Set<fabric.Object>();
    this.canvas.on("mouse:down", () => {
      objects.clear();
    });

    this.canvas.on("mouse:move", (event) => {
      if (this.drawingTool !== "sort" || !this.isDrawing || !this.isSort) return;
      const { x, y } = getPointer(event);

      this.canvas.forEachObject((object) => {
        if (object.containsPoint(new fabric.Point(x, y))) {
          if (get(object, "lock", false)) return;
          object.set("stroke", "gray");
          this.canvas.renderAll();
          objects.add(object);
        }
      });
    });

    this.canvas.on("mouse:up:before", () => {
      if (!this.isSort) return;
      const objs = Array.from(objects);
      objs.forEach((obj) => obj.set("stroke", "red"));
      const sortIndexs = objs.map((m: any) => m.text);
      this.emitter.emit("sort-indexs", sortIndexs);
    });

    this.canvas.on("path:created", (options: any) => {
      if (!this.isSort) return;
      this.canvas.remove(options.path);
    });
  }

  private initDrawingRemoveEvents() {
    const getPointer = (event: IEvent): IPoint => this.canvas.getPointer(event.e);
    const objects = new Set<fabric.Object>();
    this.canvas.on("mouse:down", () => {
      objects.clear();
    });

    this.canvas.on("mouse:move", (event) => {
      if (this.drawingTool !== "eraser" || !this.isDrawing || !this.isEraser) return;
      const { x, y } = getPointer(event);
      this.canvas.forEachObject((object) => {
        if (object.containsPoint(new fabric.Point(x, y))) {
          if (get(object, "lock", false)) return;
          objects.add(object);
        }
      });
    });

    this.canvas.on("mouse:up:before", () => {
      if (!this.isEraser) return;
      Array.from(objects).forEach((obj) => {
        this.canvas.remove(obj);
      });
      this.canvas.renderAll();
      // this.canvas.forEachObject((obj) => console.log(obj.type, obj?.text));
    });

    this.canvas.on("path:created", (options: any) => {
      if (!this.isEraser) return;
      this.canvas.remove(options.path);
    });
  }

  private initDrawingEvents() {
    // 缩放过后会导致直接获取Point错误，使用该方法可以获得原始的坐标
    const getPointer = (event: IEvent): IPoint => this.canvas.getPointer(event.e);

    this.canvas.on("mouse:down", (event) => {
      if (event.e.altKey || this.drawingTool === "select") return;
      this.isDrawing = true;

      // 如果当前有活动的元素则不添加
      const activeObject = this.canvas.getActiveObject();
      if (!event.pointer || activeObject) return;
      if (!this.shapeMap.has(this.drawingTool)) return;

      const { x, y } = getPointer(event);
      this.startPoint = { x, y };
      const obj = this.shapeMap.get(this.drawingTool)!.draw({ x, y }, {});
      this.canvas.add(obj);
      this.currentShape = obj;
      this.canvas.defaultCursor = "crosshair";
    });

    // 计算偏移 通过设置 currentShape 宽高或者其他属性实现实时绘制改变大小
    this.canvas.on("mouse:move", (event) => {
      if (!this.isDrawing || !event.pointer || !this.currentShape) return;
      if (!this.shapeMap.has(this.drawingTool)) return;

      const { x, y } = getPointer(event);
      const { x: startX, y: startY } = this.startPoint;
      const width = Math.abs(x - startX);
      const height = Math.abs(y - startY);
      this.currentShape.set(this.shapeMap.get(this.drawingTool)!.moveChange({ width, height }));
      this.canvas.renderAll();
    });

    // 清空数据
    this.canvas.on("mouse:up", () => {
      this.isDrawing = false;

      if (this.currentShape) {
        const { width, height } = this.currentShape;
        if (width === height && width === 0) {
          this.canvas.remove(this.currentShape);
        }
      }
      this.currentShape = null;
      this.startPoint = { x: 0, y: 0 };
    });
  }

  private initScalingEvents() {
    if (this.option.enableScale) {
      this.canvas.on("mouse:wheel", (event) => {
        const { scaleMin, scaleMax } = this.option;
        let delta = event.e.deltaY; // 滚轮向上滚一下是 -100，向下滚一下是 100
        let zoom = this.canvas.getZoom(); // 获取画布当前缩放值
        // 控制缩放范围在 0.01~20 的区间内
        zoom *= 0.999 ** delta;
        if (zoom > scaleMax) zoom = scaleMax;
        if (zoom < scaleMin) zoom = scaleMin;
        // 设置画布缩放比例
        // this.canvas.setZoom(zoom);
        this.canvas.zoomToPoint({ x: event.e.offsetX, y: event.e.offsetY }, zoom);
      });
    }
  }

  private initTranslationEvents() {
    window.addEventListener("keydown", (e) => {
      if (e.altKey) {
        this.setDrawingTool(DrawingToolEnum.Select);
        this.isDrawing = false;
        this.startPoint = { x: 0, y: 0 };
        this.currentShape = null;
      }
    });

    this.canvas.on("mouse:down", (event) => {
      const { altKey, clientX, clientY } = event.e;
      if (!altKey) return;
      this.isTranslation = true;
      this.lastPoint = { x: clientX, y: clientY };
    });

    this.canvas.on("mouse:move", (event) => {
      // 鼠标移动时触发
      if (!this.isTranslation) return;
      const { clientX, clientY } = event.e;
      const { x, y } = this.lastPoint;

      const vpt = this.canvas.viewportTransform; // 聚焦视图的转换
      if (!vpt) return;
      vpt[4] += clientX - x;
      vpt[5] += clientY - y;

      this.canvas.setViewportTransform(vpt);
      this.canvas.requestRenderAll(); // 重新渲染
      this.lastPoint = { x: clientX, y: clientY };
    });

    this.canvas.on("mouse:up", () => {
      this.isTranslation = false;
      this.lastPoint = { x: 0, y: 0 };
    });
  }

  public on(eventName: EventName, handler: (e: IEvent<MouseEvent>) => void): StaticCanvas {
    this.canvas.on(eventName, handler);
    return this.canvas;
  }

  public onCustom(eventName: string, handler: (e: any) => void): StaticCanvas {
    this.emitter.on(eventName, handler);
    return this.canvas;
  }

  /** 画笔 */
  public draw() {
    this.canvas.freeDrawingBrush = new fabric.PencilBrush(this.canvas);
    this.canvas.freeDrawingBrush.color = "#ff0000";
    this.canvas.freeDrawingBrush.width = 20;
    this.canvas.freeDrawingCursor = "default";
    this.canvas.isDrawingMode = true;
  }

  /** 橡皮檫 */
  public eraser(_options?: any) {
    this.draw();
    this.canvas.freeDrawingBrush.color = "green";
  }
  /** 橡皮檫 */
  public drawSort(_options?: any) {
    this.draw();
    this.canvas.freeDrawingBrush.color = "yellow";
  }

  /** 将画布元素导出为dataurl图像。注意，当使用倍增器(multiplier)时，裁剪会适当缩放 */
  public toDataURL(options?: ICanvasOptions) {
    return this.canvas.toDataURL(options);
  }

  /** 返回画布的JSON数据 */
  public getJSON(): { version: string; objects: IObject[] } {
    return this.canvas.toJSON();
  }

  /**
   * 使用来自指定JSON的数据填充画布。JSON格式必须符合fabric的格式
   * @param json fabric.Canvas.toJSON 数据
   * @param callback 解析json并初始化相应对象(例如fabric.Image)时调用
   * @param reviver 用于进一步解析JSON元素的方法，在创建每个fabric对象后调用。
   * @returns Canvas实例
   */
  public loadJSON(json: any, callback: Function, reviver?: Function): Canvas {
    return this.canvas.loadFromJSON(json, callback, reviver);
  }

  /* 销毁事件监听 */
  public destroy() {
    this.canvas.removeListeners();
    this.canvas.dispose();
  }
}
