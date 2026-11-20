import { CatmullRomCurve3, Color, Vector3 } from 'three';
import { clamp } from '@core/math';
import type { StreamPath } from '../../model/heat';
import { stationTone } from '../../model/heat';
import { ENGINE_LENGTH_M, LIP_X } from '../../model/scale';
import { phaseIdAt, unitsAt } from '../../model/stations';
import { TONE_COLOURS } from '../../theme';
import { casingAt, cowlAt, ductOuterAt, hubAt, turbineCasingAt, turbineHubAt } from './profiles';
import type { RadiusAt } from './profiles';

export interface PathControl {
  readonly x: number;
  readonly r: number;
  readonly half: number;
  readonly speed: number;
  readonly swirl: number;
}

export interface StreamTable {
  readonly samples: number;
  readonly length: number;
  readonly x: Float32Array;
  readonly r: Float32Array;
  readonly nx: Float32Array;
  readonly nr: Float32Array;
  readonly half: Float32Array;
  readonly speed: Float32Array;
  readonly swirl: Float32Array;
  readonly colour: Float32Array;
}

export const TABLE_SAMPLES = 64;

const MARGIN = 0.02;
const RGB = 3;

function between(
  x: number,
  inner: RadiusAt,
  outer: RadiusAt,
  speed: number,
  swirl = 0,
  margin = MARGIN,
): PathControl {
  const low = inner(x) + margin;
  const high = outer(x) - margin;
  return { x, r: (low + high) / 2, half: (high - low) / 2, speed, swirl };
}

function point(x: number, r: number, half: number, speed: number, swirl = 0): PathControl {
  return { x, r, half, speed, swirl };
}

const COLD_INTAKE: readonly PathControl[] = [
  point(-4.2, 1.8, 0.85, 1.05),
  point(-3.5, 1.52, 0.62, 1),
  point(-2.8, 1.33, 0.44, 0.95),
  point(-2.5, 1.29, 0.38, 1, 1.2),
  point(-2.15, 1.32, 0.35, 1.1, 1.2),
];

function coldDuct(to: number): PathControl[] {
  const stations = [-1.85, -1.2, -0.4, 0.4, 1.0, 1.5, 1.9, 2.15].filter((x) => x <= to);
  return stations.map((x, index) => between(x, cowlAt, ductOuterAt, 1.05 + index * 0.05, 0, 0.05));
}

export const COLD_CONTROLS: readonly PathControl[] = [
  ...COLD_INTAKE,
  ...coldDuct(2.15),
  point(2.7, 1.16, 0.2, 1.38),
  point(3.5, 1.15, 0.26, 1.32),
  point(4.3, 1.15, 0.32, 1.22),
];

export const REVERSED_CONTROLS: readonly PathControl[] = [
  ...COLD_INTAKE,
  ...coldDuct(1.0),
  point(1.3, 1.31, 0.16, 1.1),
  point(1.5, 1.42, 0.14, 1.0),
  point(1.58, 1.7, 0.13, 1.0),
  point(1.52, 2.06, 0.13, 1.0),
  point(1.32, 2.42, 0.13, 0.95),
  point(0.9, 2.72, 0.14, 0.9),
  point(0.2, 2.9, 0.16, 0.85),
  point(-0.7, 2.98, 0.2, 0.8),
];

export const HOT_CONTROLS: readonly PathControl[] = [
  point(-4.2, 0.42, 0.42, 1.05),
  point(-3.5, 0.48, 0.4, 1),
  point(-2.75, 0.56, 0.3, 0.95),
  point(-2.5, 0.665, 0.2, 1, 1.5),
  between(-2.05, hubAt, casingAt, 1),
  between(-1.8, hubAt, casingAt, 0.95, 0.8),
  between(-1.6, hubAt, casingAt, 0.9),
  between(-1.45, hubAt, casingAt, 0.9),
  between(-1.0, hubAt, casingAt, 0.85, 0.6),
  between(-0.4, hubAt, casingAt, 0.82, 0.6),
  between(0.12, hubAt, casingAt, 0.8),
  point(0.36, 0.575, 0.08, 0.7),
  point(0.56, 0.585, 0.075, 0.75),
  between(0.74, turbineHubAt, turbineCasingAt, 1.2, 2.5),
  between(1.03, turbineHubAt, turbineCasingAt, 1.4, 3),
  between(1.5, turbineHubAt, turbineCasingAt, 1.5, 2.4),
  between(2.1, turbineHubAt, turbineCasingAt, 1.6),
  point(2.5, 0.66, 0.11, 1.9),
  point(2.8, 0.52, 0.065, 2),
  point(3.4, 0.4, 0.2, 1.9),
  point(4.3, 0.38, 0.32, 1.7),
];

function toneColour(x: number, path: StreamPath, target: Color): Color {
  const fraction = clamp((x - LIP_X) / ENGINE_LENGTH_M, 0, 1);
  const tone = stationTone(phaseIdAt(unitsAt(fraction)), path);
  return target.set(TONE_COLOURS[tone]);
}

export function streamTable(
  controls: readonly PathControl[],
  path: StreamPath,
  adjust: (colour: Color) => Color = (colour) => colour,
  samples = TABLE_SAMPLES,
): StreamTable {
  const shape = new CatmullRomCurve3(controls.map((c) => new Vector3(c.x, c.r, c.half)));
  const flow = new CatmullRomCurve3(controls.map((c) => new Vector3(c.speed, c.swirl, 0)));
  const table: StreamTable = {
    samples,
    length: 0,
    x: new Float32Array(samples),
    r: new Float32Array(samples),
    nx: new Float32Array(samples),
    nr: new Float32Array(samples),
    half: new Float32Array(samples),
    speed: new Float32Array(samples),
    swirl: new Float32Array(samples),
    colour: new Float32Array(samples * RGB),
  };
  const at = new Vector3();
  const colour = new Color();
  for (let index = 0; index < samples; index += 1) {
    const t = shape.getUtoTmapping(index / (samples - 1), 0);
    shape.getPoint(t, at);
    table.x[index] = at.x;
    table.r[index] = at.y;
    table.half[index] = Math.max(0, at.z);
    flow.getPoint(t, at);
    table.speed[index] = at.x;
    table.swirl[index] = at.y;
    adjust(toneColour(table.x[index], path, colour)).toArray(table.colour, index * RGB);
  }
  let length = 0;
  let turned = 0;
  const rates = Float32Array.from(table.swirl);
  for (let index = 0; index < samples; index += 1) {
    const before = Math.max(0, index - 1);
    const after = Math.min(samples - 1, index + 1);
    const dx = table.x[after] - table.x[before];
    const dr = table.r[after] - table.r[before];
    const span = Math.hypot(dx, dr) || 1;
    table.nx[index] = -dr / span;
    table.nr[index] = dx / span;
    if (index > 0) {
      const step = Math.hypot(
        table.x[index] - table.x[index - 1],
        table.r[index] - table.r[index - 1],
      );
      length += step;
      turned += step * (rates[index] + rates[index - 1]) * 0.5;
    }
    table.swirl[index] = turned;
  }
  return { ...table, length };
}

export function radiusAtX(table: StreamTable, x: number): number {
  for (let index = 1; index < table.samples; index += 1) {
    if (table.x[index] >= x) {
      const x0 = table.x[index - 1];
      const share = clamp((x - x0) / (table.x[index] - x0 || 1), 0, 1);
      return table.r[index - 1] + (table.r[index] - table.r[index - 1]) * share;
    }
  }
  return table.r[table.samples - 1];
}
