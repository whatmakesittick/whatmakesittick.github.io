import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { CanvasSurface } from '@core/ui/canvasSurface';
import type { CanvasFrame } from '@core/ui/canvasSurface';
import { RATED_KW, RATED_WIND_MS } from '../model';
import { createWindFarmStore } from '../state';
import {
  AXIS_POWER_KW,
  AXIS_WIND_MS,
  PowerCurveView,
  mountPowerCurve,
  paintPowerCurve,
  plotOf,
  xOfWind,
  yOfPower,
} from './powerCurveView';
import { TEST_LOCALE, initTestLocale } from './testing';

const FRAME: CanvasFrame = { width: 600, height: 300, ratio: 2, fontFamily: 'sans-serif' };
const CHAR_WIDTH = 6;
const { curve } = TEST_LOCALE.chapters;

interface Arc {
  x: number;
  y: number;
}

function recordingContext() {
  const texts: string[] = [];
  const arcs: Arc[] = [];
  const noop = () => {};
  const context = {
    font: '',
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    textAlign: 'left',
    textBaseline: 'alphabetic',
    measureText: (text: string) => ({ width: text.length * CHAR_WIDTH }),
    fillText: (text: string) => texts.push(text),
    arc: (x: number, y: number) => arcs.push({ x, y }),
    save: noop,
    restore: noop,
    rect: noop,
    clip: noop,
    beginPath: noop,
    moveTo: noop,
    lineTo: noop,
    stroke: noop,
    fill: noop,
  };
  return { context: context as unknown as CanvasRenderingContext2D, texts, arcs };
}

describe('power curve', () => {
  beforeAll(() => initTestLocale());

  afterEach(() => vi.restoreAllMocks());

  it('maps 0 to 30 m/s across and 0 to 10 MW up, clipping above the top', () => {
    const plot = plotOf(FRAME);
    expect(xOfWind(plot, 0)).toBe(plot.left);
    expect(xOfWind(plot, AXIS_WIND_MS)).toBe(plot.right);
    expect(yOfPower(plot, 0)).toBe(plot.bottom);
    expect(yOfPower(plot, AXIS_POWER_KW)).toBe(plot.top);
    expect(yOfPower(plot, AXIS_POWER_KW * 2)).toBe(plot.top);
  });

  it('labels both axes and all three lines', () => {
    const { context, texts } = recordingContext();
    paintPowerCurve(context, FRAME, RATED_WIND_MS);
    [curve.axisWind, curve.axisPower, curve.lineWind, curve.lineBetz, curve.lineTurbine].forEach(
      (label) => expect(texts).toContain(label),
    );
  });

  it('puts the dot on the turbine curve at the live wind', () => {
    const { context, arcs } = recordingContext();
    paintPowerCurve(context, FRAME, RATED_WIND_MS);
    const plot = plotOf(FRAME);
    expect(arcs).toEqual([{ x: xOfWind(plot, RATED_WIND_MS), y: yOfPower(plot, RATED_KW) }]);
  });

  it('repaints only when the live wind changes', () => {
    const paint = vi.spyOn(CanvasSurface.prototype, 'paint');
    document.body.innerHTML = '<canvas data-canvas="power-curve"></canvas>';
    const store = createWindFarmStore({ playing: false, windOverride: RATED_WIND_MS });
    const dispose = mountPowerCurve(document, store);
    expect(paint).toHaveBeenCalledTimes(1);
    store.getState().setSpacing(5);
    expect(paint).toHaveBeenCalledTimes(1);
    store.getState().setWindOverride(RATED_WIND_MS + 1);
    expect(paint).toHaveBeenCalledTimes(2);
    dispose();
  });

  it('skips a repaint for the same wind and language', () => {
    const paint = vi.spyOn(CanvasSurface.prototype, 'paint');
    const view = new PowerCurveView(document.createElement('canvas'));
    view.draw(RATED_WIND_MS);
    view.draw(RATED_WIND_MS);
    expect(paint).toHaveBeenCalledTimes(1);
    view.dispose();
  });
});
