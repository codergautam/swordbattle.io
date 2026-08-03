export interface ResizableRenderer { resize(width: number, height: number): void; }

export class ScaleManager {
  private renderer: ResizableRenderer;
  private canvas: HTMLCanvasElement;
  width = 0;
  height = 0;
  zoom = 1;
  onResize: ((width: number, height: number) => void) | null = null;

  constructor(renderer: ResizableRenderer, canvas: HTMLCanvasElement) {
    this.renderer = renderer;
    this.canvas = canvas;
  }

  resize(width: number, height: number): this {
    this.width = Math.floor(width);
    this.height = Math.floor(height);
    this.renderer.resize(this.width, this.height);
    this.applyCss();
    if (this.onResize) this.onResize(this.width, this.height);
    return this;
  }

  setZoom(value: number): this {
    this.zoom = value;
    this.applyCss();
    return this;
  }

  private applyCss(): void {
    this.canvas.style.width = (this.width * this.zoom) + 'px';
    this.canvas.style.height = (this.height * this.zoom) + 'px';
  }
}
