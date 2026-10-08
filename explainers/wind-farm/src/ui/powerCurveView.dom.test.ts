import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { CanvasSurface } from '@core/ui/canvasSurface';
import type { CanvasFrame } from '@core/ui/canvasSurface';
import { RATED_KW, RATED_WIND_MS, parkedWindow, turbinePowerKw } from '../model';
import { createWindFarmStore, liveReading } from '../state';
import {
  AXIS_POWER_KW,
  AXIS_WIND_MS,
  CURVE_COLORS,
  CURVE_DASHES,
  PowerCurveView,
  mountPowerCurve,
  paintPowerCurve,
  plotOf,
  xOfWind,
  yOfPower,
} from './powerCurveView';
import type { CurvePoint } from './powerCurveView';
import { TEST_LOCALE, initTestLocale } from './testing';

const FRAME: CanvasFrame = { width: 600, height: 300, ratio: 2, fontFamily: 'sans-serif' };
const CHAR_WIDTH = 6;
const { curve } = TEST_LOCALE.chapters;
const RATED_POINT: CurvePoint = { wind: RATED_WIND_MS, powerKw: RATED_KW };

interface Arc {
  x: number;
  y: number;
}

interface Stroke {
  color: string;
  dash: readonly number[];
}

function recordingContext() {
  const texts: string[] = [];
  const arcs: Arc[] = [];
  const strokes: Stroke[] = [];
  const savedDashes: (readonly number[])[] = [];
  let dash: readonly number[] = [];
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
    setLineDash: (segments: number[]) => {
      dash = [...segments];
    },
    save: () => savedDashes.push(dash),
    restore: () => {
      dash = savedDashes.pop() ?? [];
    },
    rect: noop,
    clip: noop,
    beginPath: noop,
    moveTo: noop,
    lineTo: noop,
    stroke: () => strokes.push({ color: context.strokeStyle, dash }),
    fill: noop,
  };
  return { context: context as unknown as CanvasRenderingContext2D, texts, arcs, strokes };
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
    paintPowerCurve(context, FRAME, RATED_POINT);
    [curve.axisWind, curve.axisPower, curve.lineWind, curve.lineBetz, curve.lineTurbine].forEach(
      (label) => expect(texts).toContain(label),
    );
  });

  it('dashes the wind and Betz lines and their legend swatches apart from the turbine line', () => {
    const { context, strokes } = recordingContext();
    paintPowerCurve(context, FRAME, RATED_POINT);
    const lines = ['wind', 'betz', 'turbine'] as const;
    lines.forEach((line) => {
      const dashes = strokes.filter(({ color }) => color === CURVE_COLORS[line]);
      expect(dashes).toEqual([
        { color: CURVE_COLORS[line], dash: CURVE_DASHES[line] },
        { color: CURVE_COLORS[line], dash: CURVE_DASHES[line] },
      ]);
    });
    const patterns = new Set(lines.map((line) => CURVE_DASHES[line].join()));
    expect(patterns.size).toBe(lines.length);
    expect(strokes.at(-1)).toEqual({ color: CURVE_COLORS.dotRing, dash: [] });
  });

  it('labels the canvas as an image with the caption', () => {
    document.body.innerHTML = '<canvas data-canvas="power-curve"></canvas>';
    const dispose = mountPowerCurve(document, createWindFarmStore({ playing: false }));
    const canvas = document.querySelector('canvas');
    expect(canvas?.getAttribute('role')).toBe('img');
    expect(canvas?.getAttribute('aria-label')).toBe(curve.caption);
    dispose();
  });

  it('puts the dot at the live wind and power', () => {
    const { context, arcs } = recordingContext();
    paintPowerCurve(context, FRAME, RATED_POINT);
    const plot = plotOf(FRAME);
    expect(arcs).toEqual([{ x: xOfWind(plot, RATED_WIND_MS), y: yOfPower(plot, RATED_KW) }]);
  });

  it('drops the dot to zero while the hero starts up after the storm', () => {
    const { context, arcs } = recordingContext();
    vi.spyOn(CanvasSurface.prototype, 'paint').mockImplementation((painter) =>
      painter(context, FRAME),
    );
    document.body.innerHTML = '<canvas data-canvas="power-curve"></canvas>';
    const restart = parkedWindow('typical')?.restart ?? 0;
    const store = createWindFarmStore({ playing: false, phase: restart });
    const { wind, heroKw, operating } = liveReading(store.getState());
    expect(operating.state).toBe('starting');
    expect(turbinePowerKw(wind)).toBeGreaterThan(0);
    expect(heroKw).toBe(0);
    const dispose = mountPowerCurve(document, store);
    const plot = plotOf(FRAME);
    expect(arcs).toEqual([{ x: xOfWind(plot, wind), y: yOfPower(plot, 0) }]);
    dispose();
  });

  it('repaints only when the live wind or the hero power changes', () => {
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

  it('skips a repaint for the same point and language', () => {
    const paint = vi.spyOn(CanvasSurface.prototype, 'paint');
    const view = new PowerCurveView(document.createElement('canvas'));
    view.draw(RATED_POINT);
    view.draw({ ...RATED_POINT });
    expect(paint).toHaveBeenCalledTimes(1);
    view.draw({ ...RATED_POINT, powerKw: 0 });
    expect(paint).toHaveBeenCalledTimes(2);
    view.dispose();
  });
});
