import type { CanvasTexture } from 'three';
import { INVERTER_BODY } from '../../constants';
import { PAINT } from '../../finishes';
import { canvasTexture, repaint } from '../canvas';
import type { Painter } from '../canvas';

const FONT = 'bold 64px "Helvetica Neue", Arial, sans-serif';
const UNIT_FONT = '40px "Helvetica Neue", Arial, sans-serif';
const BASELINE_SHARE = 0.68;
const GAP_PX = 10;

function paintPower(watts: number): Painter {
  return (context, width, height) => {
    context.fillStyle = PAINT.screen;
    context.fillRect(0, 0, width, height);
    context.fillStyle = PAINT.screenText;
    context.textBaseline = 'alphabetic';
    const value = String(Math.round(watts));
    context.font = FONT;
    const valueWidth = context.measureText(value).width;
    context.font = UNIT_FONT;
    const unitWidth = context.measureText('W').width;
    const start = (width - valueWidth - GAP_PX - unitWidth) / 2;
    const baseline = height * BASELINE_SHARE;
    context.font = FONT;
    context.fillText(value, start, baseline);
    context.font = UNIT_FONT;
    context.fillText('W', start + valueWidth + GAP_PX, baseline);
  };
}

export function powerDisplayTexture(): CanvasTexture {
  const { width, height } = INVERTER_BODY.display.texture;
  return canvasTexture(width, height, paintPower(0));
}

export function showPower(texture: CanvasTexture, watts: number): void {
  repaint(texture, paintPower(watts));
}
