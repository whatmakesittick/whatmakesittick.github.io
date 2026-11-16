import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { CanvasSurface } from '@core/ui/canvasSurface';
import type { CanvasFrame } from '@core/ui/canvasSurface';
import { CYCLE_UNITS, PHASE_RANGES } from '../model';
import { createClockStore } from '../state';
import {
  AXIS_MAX_MM,
  GRAPH_COLORS,
  GRAPH_SAMPLES,
  SWITCH_DASH,
  ClockGraphView,
  mountClockGraph,
  paintClockGraph,
  plotOf,
  sampleSeconds,
  timeTickStep,
  xOfSeconds,
  yOfMillimolar,
} from './clockGraph';
import { GRAPH, TEST_LOCALE, fill, initTestLocale } from './testing';

const FRAME: CanvasFrame = { width: 600, height: 300, ratio: 2, fontFamily: 'sans-serif' };
const { graph } = TEST_LOCALE.chapters;

interface Stroke {
  color: string;
  dash: readonly number[];
  xs: number[];
}

function recordingContext() {
  const texts: string[] = [];
  const strokes: Stroke[] = [];
  const saved: (readonly number[])[] = [];
  let dash: readonly number[] = [];
  let xs: number[] = [];
  const noop = () => {};
  const context = {
    font: '',
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    textAlign: 'left',
    textBaseline: 'alphabetic',
    measureText: (text: string) => ({ width: text.length * 6 }),
    fillText: (text: string) => texts.push(text),
    setLineDash: (segments: number[]) => {
      dash = [...segments];
    },
    save: () => saved.push(dash),
    restore: () => {
      dash = saved.pop() ?? [];
    },
    beginPath: () => {
      xs = [];
    },
    moveTo: (x: number) => xs.push(x),
    lineTo: (x: number) => xs.push(x),
    stroke: () => strokes.push({ color: context.strokeStyle, dash, xs }),
    fill: noop,
  };
  return { context: context as unknown as CanvasRenderingContext2D, texts, strokes };
}

describe('clock graph', () => {
  beforeAll(() => initTestLocale());

  afterEach(() => vi.restoreAllMocks());

  it('spans the whole run across and 0 to 12.5 mM up', () => {
    const plot = plotOf(FRAME, 10);
    expect(plot.endSeconds).toBe(15);
    expect(xOfSeconds(plot, 0)).toBe(plot.left);
    expect(xOfSeconds(plot, 15)).toBe(plot.right);
    expect(yOfMillimolar(plot, 0)).toBe(plot.bottom);
    expect(yOfMillimolar(plot, AXIS_MAX_MM)).toBe(plot.top);
    expect(AXIS_MAX_MM).toBe(12.5);
  });

  it('ticks every 5 s, or every 2 s on a short run', () => {
    expect(timeTickStep(15)).toBe(5);
    expect(timeTickStep(8.3)).toBe(2);
  });

  it('samples densely around the switch', () => {
    const samples = sampleSeconds(10);
    expect(samples).toHaveLength(GRAPH_SAMPLES + 1);
    expect(samples[0]).toBe(0);
    expect(samples.at(-1)).toBeCloseTo(15, 9);
    const nearSwitch = samples.filter((seconds) => seconds >= 10 && seconds <= 10.4);
    expect(nearSwitch.length).toBeGreaterThan(GRAPH_SAMPLES * 0.15);
  });

  it('draws both curves, a dashed switch line with its label and the cursor', () => {
    const { context, texts, strokes } = recordingContext();
    paintClockGraph(context, FRAME, { switchAt: 10, seconds: 5 });
    [graph.time, graph.unit, fill(graph.switch, { seconds: '10.0' })].forEach((label) =>
      expect(texts).toContain(label),
    );
    const plot = plotOf(FRAME, 10);
    const curves = strokes.filter(({ xs }) => xs.length === GRAPH_SAMPLES + 1);
    expect(curves.map(({ color }) => color)).toEqual([GRAPH_COLORS.bisulfite, GRAPH_COLORS.iodine]);
    const switchLine = strokes.find(({ color }) => color === GRAPH_COLORS.switch);
    expect(switchLine).toEqual({
      color: GRAPH_COLORS.switch,
      dash: SWITCH_DASH,
      xs: [xOfSeconds(plot, 10), xOfSeconds(plot, 10)],
    });
    expect(strokes.at(-1)).toEqual({
      color: GRAPH_COLORS.cursor,
      dash: [],
      xs: [xOfSeconds(plot, 5), xOfSeconds(plot, 5)],
    });
  });

  it('moves the cursor with the scrubber and the switch with the recipe', () => {
    const paint = vi.spyOn(CanvasSurface.prototype, 'paint');
    document.body.innerHTML = GRAPH;
    const store = createClockStore({ phase: 0, playing: false });
    const dispose = mountClockGraph(document, store);
    expect(paint).toHaveBeenCalledTimes(1);
    store.getState().setPhase(PHASE_RANGES.iodine.start);
    expect(paint).toHaveBeenCalledTimes(2);
    store.getState().setScale('molecules');
    expect(paint).toHaveBeenCalledTimes(2);
    const { context, strokes } = recordingContext();
    store.getState().setIodate(12.5);
    paint.mock.lastCall?.[0](context, FRAME);
    const switchLine = strokes.find(({ color }) => color === GRAPH_COLORS.switch);
    expect(switchLine?.xs[0]).toBeCloseTo(xOfSeconds(plotOf(FRAME, 20), 20), 9);
    store.getState().setPhase(CYCLE_UNITS);
    expect(paint).toHaveBeenCalledTimes(4);
    dispose();
  });

  it('skips a repaint for the same moment', () => {
    const paint = vi.spyOn(CanvasSurface.prototype, 'paint');
    const view = new ClockGraphView(document.createElement('canvas'));
    view.draw({ switchAt: 10, seconds: 3 });
    view.draw({ switchAt: 10, seconds: 3 });
    expect(paint).toHaveBeenCalledTimes(1);
    view.draw({ switchAt: 10, seconds: 4 });
    expect(paint).toHaveBeenCalledTimes(2);
    view.dispose();
  });
});
