import { CanvasTexture, PlaneGeometry, SRGBColorSpace } from 'three';
import type { Mesh } from 'three';
import type { EmphasisGroup, PartContext } from '../context';
import { flatMesh } from './flat';

export interface PlateStyle {
  readonly width: number;
  readonly height: number;
  readonly pixelsPerMetre: number;
  readonly fontShare: number;
  readonly ink: string;
  readonly plate?: string;
  readonly rim?: string;
  readonly depthTest?: boolean;
}

export const FONT_FAMILY = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
const FONT_WEIGHT = 700;
const RIM_SHARE = 0.06;
const BASELINE_NUDGE_SHARE = 0.04;
const TEXT_ANISOTROPY = 4;

function drawPlate(
  context: CanvasRenderingContext2D,
  style: PlateStyle,
  width: number,
  height: number,
): void {
  if (!style.plate) return;
  const radius = height / 2;
  context.beginPath();
  context.roundRect(0, 0, width, height, radius);
  context.fillStyle = style.plate;
  context.fill();
  if (!style.rim) return;
  const rim = height * RIM_SHARE;
  context.beginPath();
  context.roundRect(rim / 2, rim / 2, width - rim, height - rim, radius - rim / 2);
  context.lineWidth = rim;
  context.strokeStyle = style.rim;
  context.stroke();
}

function drawText(canvas: HTMLCanvasElement, style: PlateStyle, text: string): void {
  const context = canvas.getContext('2d');
  if (!context) return;
  const { width, height } = canvas;
  context.clearRect(0, 0, width, height);
  drawPlate(context, style, width, height);
  context.font = `${FONT_WEIGHT} ${Math.round(height * style.fontShare)}px ${FONT_FAMILY}`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillStyle = style.ink;
  context.fillText(text, width / 2, height * (0.5 + BASELINE_NUDGE_SHARE));
}

export class TextPlate {
  readonly mesh: Mesh;
  private readonly canvas = document.createElement('canvas');
  private readonly texture: CanvasTexture;
  private readonly style: PlateStyle;
  private text: string | null = null;

  constructor(context: PartContext, group: EmphasisGroup, style: PlateStyle, order: number) {
    this.style = style;
    this.canvas.width = Math.round(style.width * style.pixelsPerMetre);
    this.canvas.height = Math.round(style.height * style.pixelsPerMetre);
    this.texture = context.tracker.track(new CanvasTexture(this.canvas));
    this.texture.colorSpace = SRGBColorSpace;
    this.texture.anisotropy = TEXT_ANISOTROPY;
    const look = { colour: '#ffffff', map: this.texture, depthTest: style.depthTest };
    this.mesh = flatMesh(context, new PlaneGeometry(style.width, style.height), group, look, order);
  }

  show(text: string): void {
    if (text === this.text) return;
    this.text = text;
    drawText(this.canvas, this.style, text);
    this.texture.needsUpdate = true;
  }
}
