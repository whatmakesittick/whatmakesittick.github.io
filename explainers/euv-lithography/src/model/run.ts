import { clamp, lerp } from '@core/math';
import { MACHINE_IDS, PHASE_IDS } from '../ids';
import type {
  FlashReading,
  MachineId,
  MomentId,
  PhaseId,
  PlaceId,
  Point,
  ScanReading,
} from '../ids';
import {
  DROPLET_FLIGHT_M,
  DROPLET_SPEED_MS,
  MAIN_PULSE_S,
  PREPULSE_DELAY_S,
  REFLECTIVITY,
} from './constants';
import { opticsOf, strokeM } from './optics';
import {
  COLLECT_PATH,
  DROPLET_PATH,
  EXPOSE_BOUNCE_SHARES,
  EXPOSE_PATH,
  MASK_BOUNCE_SHARES,
  MASK_PATH,
  lightSeconds,
  pointOnPath,
} from './path';
import { scanSeconds } from './throughput';
import { BEAM_WAYPOINTS } from './layout';

export interface PhaseRange {
  start: number;
  end: number;
}

export const RUN_UNITS = 1000;
export const BASE_RUN_SECONDS = 120;
export const DEFAULT_SPEED = 2;
export const SPEED_RANGE = { min: 1, max: 8, step: 1, default: DEFAULT_SPEED } as const;

export const PHASE_RANGES: Readonly<Record<PhaseId, PhaseRange>> = {
  droplet: { start: 0, end: 150 },
  prepulse: { start: 150, end: 260 },
  plasma: { start: 260, end: 380 },
  collect: { start: 380, end: 520 },
  mask: { start: 520, end: 700 },
  expose: { start: 700, end: RUN_UNITS },
};

export const SCAN_START_UNITS = 800;
export const PATTERN_INSET_START = 640;

export const MOMENTS: Readonly<Record<MomentId, number>> = {
  launch: PHASE_RANGES.droplet.start,
  firstHit: PHASE_RANGES.prepulse.start,
  flash: PHASE_RANGES.plasma.start,
  atFocus: PHASE_RANGES.mask.start,
  onMask: PHASE_RANGES.expose.start,
  onWafer: SCAN_START_UNITS,
};

export const CHASE_SPAN: Readonly<Record<PhaseId, number>> = {
  droplet: 1.2,
  prepulse: 1.2,
  plasma: 1.2,
  collect: 3,
  mask: 3,
  expose: 2,
};

export const CLOCK_KNOT_UNITS = [0, 150, 260, 380, 520, 700, SCAN_START_UNITS, RUN_UNITS] as const;

const GEOMETRIC_SEGMENTS: ReadonlySet<number> = new Set([0, 6]);
const LAST_SEGMENT = CLOCK_KNOT_UNITS.length - 2;
const GENERATOR_SHARE = 0.1;
const FLASH_FOCUS_SECONDS = MAIN_PULSE_S + lightSeconds(COLLECT_PATH);
const MASK_SECONDS = FLASH_FOCUS_SECONDS + lightSeconds(MASK_PATH);
const WAFER_SECONDS = MASK_SECONDS + lightSeconds(EXPOSE_PATH);
const DROPLET_FLIGHT_S = DROPLET_FLIGHT_M / DROPLET_SPEED_MS;

function knotsFor(machine: MachineId): readonly number[] {
  return [
    -DROPLET_FLIGHT_S,
    -PREPULSE_DELAY_S,
    0,
    MAIN_PULSE_S,
    FLASH_FOCUS_SECONDS,
    MASK_SECONDS,
    WAFER_SECONDS,
    scanSeconds(machine),
  ];
}

export const CLOCK_KNOTS: Readonly<Record<MachineId, readonly number[]>> = Object.fromEntries(
  MACHINE_IDS.map((machine) => [machine, knotsFor(machine)]),
) as Record<MachineId, readonly number[]>;

export function rate(speed: number): number {
  return (RUN_UNITS * speed) / BASE_RUN_SECONDS;
}

export function phaseAt(units: number): PhaseId {
  const clamped = clamp(units, 0, RUN_UNITS);
  return PHASE_IDS.find((id) => clamped < PHASE_RANGES[id].end) ?? PHASE_IDS[PHASE_IDS.length - 1];
}

function shareIn({ start, end }: PhaseRange, units: number): number {
  return clamp((units - start) / (end - start), 0, 1);
}

function segmentAtUnits(units: number): number {
  const index = CLOCK_KNOT_UNITS.findIndex(
    (knot, at) => units < CLOCK_KNOT_UNITS[at + 1] && knot <= units,
  );
  return index === -1 ? LAST_SEGMENT : index;
}

function interpolate(segment: number, from: number, to: number, share: number): number {
  if (!GEOMETRIC_SEGMENTS.has(segment)) return lerp(from, to, share);
  return Math.sign(from) * Math.abs(from) * (Math.abs(to) / Math.abs(from)) ** share;
}

function shareOfSeconds(segment: number, from: number, to: number, seconds: number): number {
  const share = GEOMETRIC_SEGMENTS.has(segment)
    ? Math.log(Math.abs(seconds) / Math.abs(from)) / Math.log(Math.abs(to) / Math.abs(from))
    : (seconds - from) / (to - from);
  return clamp(share, 0, 1);
}

export function realSecondsAt(units: number, machine: MachineId): number {
  const clamped = clamp(units, 0, RUN_UNITS);
  const segment = segmentAtUnits(clamped);
  const knots = CLOCK_KNOTS[machine];
  const range = { start: CLOCK_KNOT_UNITS[segment], end: CLOCK_KNOT_UNITS[segment + 1] };
  return interpolate(segment, knots[segment], knots[segment + 1], shareIn(range, clamped));
}

export function unitsAt(seconds: number, machine: MachineId): number {
  const knots = CLOCK_KNOTS[machine];
  const clamped = clamp(seconds, knots[0], knots[knots.length - 1]);
  const found = knots.findIndex((_, at) => at < LAST_SEGMENT + 1 && clamped < knots[at + 1]);
  const segment = found === -1 ? LAST_SEGMENT : found;
  const share = shareOfSeconds(segment, knots[segment], knots[segment + 1], clamped);
  return lerp(CLOCK_KNOT_UNITS[segment], CLOCK_KNOT_UNITS[segment + 1], share);
}

export const BOUNCE_UNITS: readonly number[] = [
  ...MASK_BOUNCE_SHARES.map(
    (share) => PHASE_RANGES.mask.start + share * (PHASE_RANGES.mask.end - PHASE_RANGES.mask.start),
  ),
  ...EXPOSE_BOUNCE_SHARES.map(
    (share) => PHASE_RANGES.expose.start + share * (SCAN_START_UNITS - PHASE_RANGES.expose.start),
  ),
];

export function bounceCountAt(units: number): number {
  return BOUNCE_UNITS.filter((reached) => units >= reached).length;
}

export function unitsAfterBounce(count: number): number {
  return count <= 0 ? MOMENTS.atFocus : BOUNCE_UNITS[Math.min(count, BOUNCE_UNITS.length) - 1];
}

export function lightLeftAt(units: number): number {
  if (units < PHASE_RANGES.plasma.start) return 0;
  if (units < PHASE_RANGES.plasma.end) return shareIn(PHASE_RANGES.plasma, units);
  return REFLECTIVITY ** bounceCountAt(units);
}

export function insetAt(units: number): 'droplet' | 'pattern' | 'none' {
  if (units < MOMENTS.atFocus) return 'droplet';
  return units >= PATTERN_INSET_START ? 'pattern' : 'none';
}

export function scanShareAt(units: number): number {
  return clamp((units - SCAN_START_UNITS) / (RUN_UNITS - SCAN_START_UNITS), 0, 1);
}

export function scanAt(units: number, machine: MachineId): ScanReading {
  const share = scanShareAt(units);
  const stroke = strokeM(opticsOf(machine));
  const travel = share - 0.5;
  return { share, maskOffsetM: travel * stroke.mask, waferOffsetM: -travel * stroke.wafer };
}

function placeAt(phase: PhaseId, units: number, share: number): PlaceId {
  if (phase === 'droplet') return share < GENERATOR_SHARE ? 'generator' : 'flight';
  if (phase === 'prepulse' || phase === 'plasma') return 'plasma';
  if (phase === 'collect') return 'collector';
  if (phase === 'mask') return 'illuminator';
  if (units >= SCAN_START_UNITS) return 'wafer';
  return units < BOUNCE_UNITS[MASK_BOUNCE_SHARES.length] ? 'mask' : 'projection';
}

const PLASMA_POINT: Point = BEAM_WAYPOINTS[1].point;
const LASER_DIRECTION: Point = [1, 0, 0];

function poseAt(
  phase: PhaseId,
  units: number,
  share: number,
): { position: Point; direction: Point } {
  if (phase === 'droplet') return pointOnPath(DROPLET_PATH, share);
  if (phase === 'prepulse') return { position: PLASMA_POINT, direction: LASER_DIRECTION };
  if (phase === 'plasma')
    return { position: PLASMA_POINT, direction: pointOnPath(COLLECT_PATH, 0).direction };
  if (phase === 'collect') return pointOnPath(COLLECT_PATH, share);
  if (phase === 'mask') return pointOnPath(MASK_PATH, share);
  const travel =
    (units - PHASE_RANGES.expose.start) / (SCAN_START_UNITS - PHASE_RANGES.expose.start);
  return pointOnPath(EXPOSE_PATH, travel);
}

export function flashAt(units: number, machine: MachineId): FlashReading {
  const clamped = clamp(units, 0, RUN_UNITS);
  const phase = phaseAt(clamped);
  const share = shareIn(PHASE_RANGES[phase], clamped);
  return {
    phase,
    units: clamped,
    share,
    realSeconds: realSecondsAt(clamped, machine),
    ...poseAt(phase, clamped, share),
    place: placeAt(phase, clamped, share),
    span: CHASE_SPAN[phase],
  };
}
