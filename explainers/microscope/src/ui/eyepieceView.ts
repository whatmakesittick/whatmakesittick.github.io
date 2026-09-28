import { FULL_TURN } from '@core/math';
import {
  EYEPIECE_IDS,
  EYEPIECE_MAGNIFICATION,
  MICROMETRES_PER_MM,
  blurShare,
  depthOfField,
  fieldOfView,
  spectralColor,
} from '../model';
import type { EyepieceId, ObjectiveId } from '../model';
import { paintSpecimen } from '../specimenPainter';
import { THEME } from '../theme';

export interface EyepieceSight {
  objective: ObjectiveId;
  eyepiece: EyepieceId;
  focus: number;
  wavelength: number;
}

const VIEW = {
  margin: 8,
  overdraw: 1.2,
  maxBlurPx: 14,
  rimWidth: 1.5,
} as const;
const WIDEST_EYEPIECE = Math.max(...EYEPIECE_IDS.map((id) => EYEPIECE_MAGNIFICATION[id]));

function circlePath(context: CanvasRenderingContext2D, center: number, radius: number): void {
  context.beginPath();
  context.arc(center, center, radius, 0, FULL_TURN);
}

function fieldKey({ objective, eyepiece, wavelength }: EyepieceSight): string {
  return `${objective}:${eyepiece}:${wavelength}`;
}

export class EyepieceView {
  private readonly canvas: HTMLCanvasElement;
  private readonly field = document.createElement('canvas');
  private readonly pixelRatio: number;
  private paintedField: string | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.pixelRatio = window.devicePixelRatio || 1;
    const size = Math.round(canvas.width * this.pixelRatio);
    canvas.width = size;
    canvas.height = size;
  }

  draw(sight: EyepieceSight): void {
    const context = this.canvas.getContext('2d');
    if (!context) return;
    const center = this.canvas.width / 2;
    const radius = this.fieldRadius(sight.eyepiece);
    context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    circlePath(context, center, center);
    context.fillStyle = THEME.viewSurround;
    context.fill();
    this.paintField(sight, radius);
    this.showField(context, center, radius, this.blur(sight));
    circlePath(context, center, radius);
    context.strokeStyle = THEME.viewRim;
    context.lineWidth = VIEW.rimWidth * this.pixelRatio;
    context.stroke();
  }

  private showField(
    context: CanvasRenderingContext2D,
    center: number,
    radius: number,
    filter: string,
  ): void {
    context.save();
    circlePath(context, center, radius);
    context.clip();
    context.filter = filter;
    context.drawImage(this.field, center - this.field.width / 2, center - this.field.height / 2);
    context.restore();
  }

  private fieldRadius(eyepiece: EyepieceId): number {
    const widest = this.canvas.width / 2 - VIEW.margin * this.pixelRatio;
    return (widest * EYEPIECE_MAGNIFICATION[eyepiece]) / WIDEST_EYEPIECE;
  }

  private paintField(sight: EyepieceSight, radius: number): void {
    const key = fieldKey(sight);
    if (key === this.paintedField) return;
    const size = Math.ceil(2 * radius * VIEW.overdraw);
    this.field.width = size;
    this.field.height = size;
    const context = this.field.getContext('2d');
    if (!context) return;
    paintSpecimen(context, size, {
      fieldUm: fieldOfView(sight.objective) * MICROMETRES_PER_MM * VIEW.overdraw,
      tint: spectralColor(sight.wavelength),
      turned: true,
    });
    this.paintedField = key;
  }

  private blur(sight: EyepieceSight): string {
    const share = blurShare(sight.focus, depthOfField(sight.objective));
    return share > 0 ? `blur(${share * VIEW.maxBlurPx * this.pixelRatio}px)` : 'none';
  }
}
