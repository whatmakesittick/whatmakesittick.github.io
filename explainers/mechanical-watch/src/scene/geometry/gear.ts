import { toRadians } from '@core/math';
import type { Vec2 } from './outline';
import { polar } from './outline';

export interface ToothForm {
  readonly addendum: number;
  readonly dedendum: number;
  readonly share: number;
  readonly pressureDeg: number;
}

export interface ProfileOptions {
  readonly share?: number;
  readonly offset?: number;
  readonly flankSamples?: number;
}

const ORIGIN: Vec2 = { x: 0, y: 0 };
const DEFAULT_SHARE = 0.5;
const DEFAULT_FLANK_SAMPLES = 4;
const MIN_TIP_SHARE = 0.18;
const TIP_SAMPLES = 2;
const ROOT_SAMPLES = 2;

function involute(angle: number): number {
  return Math.tan(angle) - angle;
}

export function toothPitch(teeth: number): number {
  return (Math.PI * 2) / teeth;
}

export function gearModule(teeth: number, pitchRadius: number): number {
  return (2 * pitchRadius) / teeth;
}

export interface HalfThickness {
  (radius: number): number;
}

export function halfThickness(
  teeth: number,
  pitchRadius: number,
  pressureDeg: number,
  share: number,
): HalfThickness {
  const pressure = toRadians(pressureDeg);
  const base = pitchRadius * Math.cos(pressure);
  const atPitch = (share * Math.PI) / teeth;
  const minimum = atPitch * MIN_TIP_SHARE;
  return (radius) => {
    const clamped = Math.max(radius, base);
    const angle = Math.acos(base / clamped);
    return Math.max(minimum, atPitch + involute(pressure) - involute(angle));
  };
}

function sampleRadii(from: number, to: number, count: number): number[] {
  return Array.from({ length: count + 1 }, (_, index) => from + ((to - from) * index) / count);
}

export function gearProfile(
  teeth: number,
  pitchRadius: number,
  addendum: number,
  dedendum: number,
  pressureDeg: number,
  options: ProfileOptions = {},
): Vec2[] {
  const share = options.share ?? DEFAULT_SHARE;
  const offset = options.offset ?? 0;
  const flank = options.flankSamples ?? DEFAULT_FLANK_SAMPLES;
  const pitch = toothPitch(teeth);
  const tip = pitchRadius + addendum;
  const root = pitchRadius - dedendum;
  const thickness = halfThickness(teeth, pitchRadius, pressureDeg, share);
  const radii = sampleRadii(root, tip, flank);
  const rootHalf = Math.min(thickness(root), pitch / 2);
  const tipHalf = thickness(tip);
  const points: Vec2[] = [];
  for (let tooth = 0; tooth < teeth; tooth += 1) {
    const centre = offset + tooth * pitch;
    const gapStart = centre - pitch / 2;
    for (let step = 0; step < ROOT_SAMPLES; step += 1) {
      const t = step / ROOT_SAMPLES;
      points.push(polar(ORIGIN, root, gapStart + (centre - rootHalf - gapStart) * t));
    }
    radii.forEach((radius) => points.push(polar(ORIGIN, radius, centre - thickness(radius))));
    for (let step = 1; step < TIP_SAMPLES; step += 1) {
      const t = step / TIP_SAMPLES;
      points.push(polar(ORIGIN, tip, centre - tipHalf + 2 * tipHalf * t));
    }
    [...radii]
      .reverse()
      .forEach((radius) => points.push(polar(ORIGIN, radius, centre + thickness(radius))));
    for (let step = 1; step < ROOT_SAMPLES; step += 1) {
      const t = step / ROOT_SAMPLES;
      points.push(polar(ORIGIN, root, centre + rootHalf + (pitch / 2 - rootHalf) * t));
    }
  }
  return points;
}

export function formProfile(
  teeth: number,
  pitchRadius: number,
  form: ToothForm,
  offset = 0,
): Vec2[] {
  const module = gearModule(teeth, pitchRadius);
  return gearProfile(
    teeth,
    pitchRadius,
    form.addendum * module,
    form.dedendum * module,
    form.pressureDeg,
    { share: form.share, offset },
  );
}

export interface SawForm {
  readonly depth: number;
  readonly hook: number;
  readonly land: number;
}

export function sawProfile(teeth: number, pitchRadius: number, form: SawForm, offset = 0): Vec2[] {
  const pitch = toothPitch(teeth);
  const tip = pitchRadius + form.depth / 2;
  const root = pitchRadius - form.depth / 2;
  return Array.from({ length: teeth }, (_, tooth) => {
    const start = offset + tooth * pitch;
    return [
      polar(ORIGIN, root, start),
      polar(ORIGIN, tip, start - pitch * form.hook),
      polar(ORIGIN, root, start + pitch * (1 - form.land)),
    ];
  }).flat();
}
