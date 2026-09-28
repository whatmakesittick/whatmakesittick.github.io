import { toRadians } from '@core/math';
import type { Vec2 } from './outline';
import { arcPoints, polar, roundCorners } from './outline';
import { toothPitch } from './gear';

export interface ClubToothForm {
  readonly tipRadius: number;
  readonly rootRadius: number;
  readonly heelDrop: number;
  readonly clubDeg: number;
  readonly leanDeg: number;
  readonly backDeg: number;
}

export interface SpokeStyle {
  readonly spokes: number;
  readonly rimInner: number;
  readonly hubRadius: number;
  readonly spokeWidth: number;
  readonly fillet: number;
  readonly offset: number;
}

const ORIGIN: Vec2 = { x: 0, y: 0 };
const BACK_SAMPLES = 4;
const BACK_BELLY = 0.18;
const ROOT_SAMPLES = 3;
const FILLET_SEGMENTS = 4;
const FILLET_MIN_TURN_DEG = 30;
const FULL_CIRCLE = Math.PI * 2;

export function leanOffset(form: ClubToothForm): number {
  const depth = form.tipRadius - form.rootRadius;
  const middle = (form.tipRadius + form.rootRadius) / 2;
  return (depth * Math.tan(toRadians(form.leanDeg))) / middle;
}

function backCurve(form: ClubToothForm, corner: number): Vec2[] {
  const heel = { angle: corner + toRadians(form.clubDeg), radius: form.tipRadius - form.heelDrop };
  const root = { angle: corner + toRadians(form.backDeg), radius: form.rootRadius };
  const control = {
    angle: heel.angle + (root.angle - heel.angle) * (1 - BACK_BELLY),
    radius: heel.radius - (heel.radius - root.radius) * BACK_BELLY,
  };
  return Array.from({ length: BACK_SAMPLES + 1 }, (_, index) => {
    const t = index / BACK_SAMPLES;
    const mix = (a: number, b: number, c: number) =>
      (1 - t) * (1 - t) * a + 2 * (1 - t) * t * b + t * t * c;
    return polar(
      ORIGIN,
      mix(heel.radius, control.radius, root.radius),
      mix(heel.angle, control.angle, root.angle),
    );
  });
}

export function clubToothProfile(teeth: number, form: ClubToothForm, offset = 0): Vec2[] {
  const pitch = toothPitch(teeth);
  const lean = leanOffset(form);
  const back = toRadians(form.backDeg);
  return Array.from({ length: teeth }, (_, tooth) => {
    const corner = offset + tooth * pitch;
    const rootStart = corner + back;
    const rootEnd = corner + pitch + lean;
    const root = arcPoints(ORIGIN, form.rootRadius, rootStart, rootEnd, ROOT_SAMPLES);
    return [
      polar(ORIGIN, form.rootRadius, corner + lean),
      polar(ORIGIN, form.tipRadius, corner),
      ...backCurve(form, corner),
      ...root.slice(1, -1),
    ];
  }).flat();
}

function spokeEdge(radius: number, halfWidth: number): number {
  return Math.asin(Math.min(1, halfWidth / radius));
}

export function crossingHoles(style: SpokeStyle, segments: number): Vec2[][] {
  const span = FULL_CIRCLE / style.spokes;
  const half = style.spokeWidth / 2;
  const rimEdge = spokeEdge(style.rimInner, half);
  const hubEdge = spokeEdge(style.hubRadius, half);
  const steps = Math.max(3, Math.ceil(segments / style.spokes));
  return Array.from({ length: style.spokes }, (_, index) => {
    const start = style.offset + index * span;
    const end = start + span;
    const outline = [
      ...arcPoints(ORIGIN, style.rimInner, start + rimEdge, end - rimEdge, steps),
      ...arcPoints(ORIGIN, style.hubRadius, end - hubEdge, start + hubEdge, steps),
    ];
    return roundCorners(outline, style.fillet, FILLET_MIN_TURN_DEG, FILLET_SEGMENTS);
  });
}
