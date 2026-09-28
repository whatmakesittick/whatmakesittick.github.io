import { describe, expect, it } from 'vitest';
import { FITNESS_PROFILES, REST_SYSTOLE_MS, beatLength } from '../model';
import { TIME_TICKS_MS, sampleBeat, shownTimeTicks, xOfTime, yOfValue } from './beatPlot';
import { beatRates, beatSplitRows } from './beatSplitView';
import { ecgLayout, waveLabelX } from './ecgView';
import { wiggersLayout } from './wiggersView';

const PLOT = { left: 40, right: 440, top: 10, bottom: 110 };

describe('beat plots', () => {
  it('spreads one beat across the plot', () => {
    expect(xOfTime(PLOT, 0)).toBe(40);
    expect(xOfTime(PLOT, 400)).toBe(240);
    expect(xOfTime(PLOT, TIME_TICKS_MS.at(-1) ?? 0)).toBe(440);
  });

  it('puts the bottom of the scale on the bottom edge', () => {
    const scale = { min: 0, max: 100 };
    expect(yOfValue(PLOT, 0, scale)).toBe(110);
    expect(yOfValue(PLOT, 100, scale)).toBe(10);
    expect(yOfValue(PLOT, 25, scale)).toBe(85);
  });

  it('labels every other time tick when the labels would touch', () => {
    expect(shownTimeTicks(PLOT, 40)).toEqual([0, 1, 2, 3, 4]);
    expect(shownTimeTicks(PLOT, 70)).toEqual([0, 2, 4]);
  });

  it('samples a curve over the whole beat, both ends included', () => {
    const samples = sampleBeat((time) => time / 2, 200);
    expect(samples.map((sample) => sample.time)).toEqual([0, 200, 400, 600, 800]);
    expect(samples.at(-1)?.value).toBe(400);
  });
});

describe('pressure and volume canvas', () => {
  it('stacks the phase strip, the pressures and the volume without overlap', () => {
    const { strip, pressure, volume, axisBaseline } = wiggersLayout(640, 400, 60);
    expect(strip.bottom).toBeLessThan(pressure.top);
    expect(pressure.bottom).toBeLessThan(volume.top);
    expect(volume.bottom).toBeLessThan(axisBaseline);
    expect(axisBaseline).toBeLessThan(400);
    expect(pressure.bottom - pressure.top).toBeGreaterThan(volume.bottom - volume.top);
  });

  it('leaves the gutter for the tick labels and lines every panel up', () => {
    const layout = wiggersLayout(320, 200, 52);
    [layout.strip, layout.pressure, layout.volume].forEach((plot) => {
      expect(plot.left).toBe(52);
      expect(plot.right).toBeLessThan(320);
    });
  });
});

describe('electrocardiogram canvas', () => {
  it('keeps room above the trace for the wave names and below it for the time', () => {
    const { plot, waveBaseline, axisBaseline } = ecgLayout(640, 240);
    expect(waveBaseline).toBeLessThan(plot.top);
    expect(waveBaseline).toBeGreaterThan(0);
    expect(axisBaseline).toBeGreaterThan(plot.bottom);
  });

  it('keeps each wave name inside the plot', () => {
    const { plot } = ecgLayout(320, 120);
    expect(waveLabelX(plot, 'p', 60)).toBe(plot.left + 30);
    expect(waveLabelX(plot, 'qrs', 20)).toBeCloseTo(xOfTime(plot, 178));
  });
});

describe('beat split canvas', () => {
  it('fills the track with the resting beat and draws the effort beat to the same scale', () => {
    const [rest, hard] = beatSplitRows(640, 160, 100, beatRates('typical', 1));
    const trackEnd = rest.segments[1].left + rest.segments[1].width;
    expect(rest.segments[0].left).toBe(100);
    expect(trackEnd).toBeCloseTo(628);
    const hardEnd = hard.segments[1].left + hard.segments[1].width;
    expect((hardEnd - 100) / (trackEnd - 100)).toBeCloseTo(
      beatLength(FITNESS_PROFILES.typical.maxRate) / beatLength(FITNESS_PROFILES.typical.restRate),
    );
    expect(hard.top).toBeGreaterThan(rest.top + rest.height);
  });

  it('splits the resting beat into the squeeze and the time left to fill', () => {
    const [rest] = beatSplitRows(640, 160, 100, beatRates('typical', 0));
    expect(rest.segments.map((segment) => segment.part)).toEqual(['squeeze', 'fill']);
    expect(rest.segments[0].ms).toBeCloseTo(REST_SYSTOLE_MS);
    expect(rest.segments[1].left).toBeCloseTo(rest.segments[0].left + rest.segments[0].width);
  });

  it('starts from the resting rate of the picked fitness', () => {
    expect(beatRates('athlete', 0)).toEqual([50, 50]);
    expect(beatRates('typical', 0.5)).toEqual([75, 132.5]);
  });
});
