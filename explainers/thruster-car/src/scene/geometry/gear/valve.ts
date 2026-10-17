import {
  CatmullRomCurve3,
  CircleGeometry,
  CylinderGeometry,
  Euler,
  Matrix4,
  Quaternion,
  TubeGeometry,
  Vector3,
} from 'three';
import type { BufferGeometry, DataTexture } from 'three';
import { FULL_TURN, lerp } from '@core/math';
import { box } from '@core/scene/geometry/box';
import { extrudeProfileAlongX, roundedRectShape } from '@core/scene/geometry/extrude';
import type { Point } from '../../../ids';
import { mergeParts } from '../../parts/context';
import { tinted } from './attributes';
import { latheAround } from './lathe';
import { QUARTER_TURN } from '../turns';
import type { Profile } from './lathe';
import { grey, paintTexture, seamDistance } from './maps';
import type { Rgba } from './maps';

const BLOCK = {
  front: -0.02,
  back: -0.12,
  halfZ: 0.045,
  bottom: -0.045,
  top: 0.05,
  corner: 0.01,
} as const;

const REGULATOR = {
  x: -0.07,
  bonnet: { radius: 0.024, height: 0.035, segments: 16 },
  knob: { radius: 0.02, height: 0.024, segments: 12 },
} as const;

export const KNOB_TOP = BLOCK.top + REGULATOR.bonnet.height + REGULATOR.knob.height;
export const REGULATOR_X = REGULATOR.x;

export const GAUGE = {
  centre: [-0.07, 0.004, BLOCK.halfZ + 0.012] as Point,
  tilt: -0.35,
  radius: 0.032,
  segments: 24,
  stem: { radius: 0.008, length: 0.014, segments: 8 },
  dialLift: 0.006,
  needleLift: 0.0075,
  start: (5 * FULL_TURN) / 8,
  sweep: (3 * FULL_TURN) / 4,
} as const;

const BEZEL_PROFILE: Profile = [
  [GAUGE.radius + 0.004, -0.006],
  [GAUGE.radius + 0.006, 0],
  [GAUGE.radius + 0.005, 0.008],
  [GAUGE.radius + 0.001, 0.0095],
  [GAUGE.radius - 0.002, GAUGE.dialLift],
];

const NEEDLE = {
  tail: -0.006,
  tip: 0.026,
  halfWidth: 0.0013,
  thickness: 0.0015,
  hub: 0.003,
  hubSegments: 10,
} as const;

const FITTING = { radius: 0.013, length: 0.02, sides: 6 } as const;
const BULKHEAD = { radius: 0.016, length: 0.024, sides: 6 } as const;

const LINE = { radius: 0.0085, tubular: 20, radial: 8 } as const;

const LINE_PATHS: readonly (readonly Point[])[] = [
  [
    [BLOCK.back - FITTING.length, -0.01, -0.022],
    [-0.22, -0.02, -0.04],
    [-0.38, -0.045, -0.12],
    [-0.5, -0.05, -0.15],
  ],
  [
    [BLOCK.back - FITTING.length, 0.015, 0.022],
    [-0.22, 0.008, 0.05],
    [-0.38, -0.035, 0.17],
    [-0.5, -0.05, 0.2],
  ],
];

const DIAL = {
  face: [0.95, 0.94, 0.9, 1] as Rgba,
  ink: [0.1, 0.1, 0.11, 1] as Rgba,
  warn: [0.84, 0.24, 0.19, 1] as Rgba,
  ring: 0.9,
  ticks: 10,
  tickFrom: 0.62,
  tickTo: 0.82,
  tickHalf: 0.012,
  minorHalf: 0.006,
  minorFrom: 0.72,
  warnShare: 0.15,
  warnFrom: 0.84,
  warnTo: 0.9,
  hub: 0.08,
} as const;

const DIAL_MAP = { width: 128, height: 128 } as const;

const BRAID = { crossings: 2, floor: 0.42, lift: 0.58, sharpness: 0.6 } as const;
const BRAID_MAP = { width: 64, height: 64, repeat: true } as const;
const BRAID_REPEAT = { along: 16, around: 2 } as const;

function hexAlongX(radius: number, length: number, at: Point, sides: number): BufferGeometry {
  const nut = new CylinderGeometry(radius, radius, length, sides);
  nut.rotateZ(QUARTER_TURN);
  nut.translate(...at);
  return nut;
}

function upright(radius: number, height: number, segments: number, base: number): BufferGeometry {
  const cylinder = new CylinderGeometry(radius, radius, height, segments);
  cylinder.translate(REGULATOR.x, base + height / 2, 0);
  return cylinder;
}

function blockGeometry(): BufferGeometry {
  const shape = roundedRectShape(
    { minA: -BLOCK.halfZ, minB: BLOCK.bottom, maxA: BLOCK.halfZ, maxB: BLOCK.top },
    BLOCK.corner,
  );
  const ports = LINE_PATHS.map(([start]) =>
    hexAlongX(
      FITTING.radius,
      FITTING.length,
      [BLOCK.back - FITTING.length / 2, start[1], start[2]],
      FITTING.sides,
    ),
  );
  return mergeParts([extrudeProfileAlongX(shape, BLOCK.back, BLOCK.front), ...ports]);
}

function bonnetGeometry(): BufferGeometry {
  const { bonnet } = REGULATOR;
  const stem = new CylinderGeometry(
    GAUGE.stem.radius,
    GAUGE.stem.radius,
    GAUGE.stem.length,
    GAUGE.stem.segments,
  );
  stem.rotateX(QUARTER_TURN);
  stem.translate(GAUGE.centre[0], GAUGE.centre[1], BLOCK.halfZ + GAUGE.stem.length / 2);
  return mergeParts([upright(bonnet.radius, bonnet.height, bonnet.segments, BLOCK.top), stem]);
}

function knobGeometry(): BufferGeometry {
  const { knob, bonnet } = REGULATOR;
  return upright(knob.radius, knob.height, knob.segments, BLOCK.top + bonnet.height);
}

function bezelGeometry(): BufferGeometry {
  return latheAround(BEZEL_PROFILE, { axis: 'z', segments: GAUGE.segments }).applyMatrix4(
    gaugePose(),
  );
}

export function gaugePose(): Matrix4 {
  const turn = new Quaternion().setFromEuler(new Euler(GAUGE.tilt, 0, 0));
  return new Matrix4().compose(new Vector3(...GAUGE.centre), turn, new Vector3(1, 1, 1));
}

export function dialGeometry(): BufferGeometry {
  const dial = new CircleGeometry(GAUGE.radius, GAUGE.segments);
  dial.translate(0, 0, GAUGE.dialLift);
  return dial;
}

export function needleGeometry(): BufferGeometry {
  const pointer = box({
    minX: NEEDLE.tail,
    maxX: NEEDLE.tip,
    minY: -NEEDLE.halfWidth,
    maxY: NEEDLE.halfWidth,
    minZ: 0,
    maxZ: NEEDLE.thickness,
  });
  const hub = new CylinderGeometry(
    NEEDLE.hub,
    NEEDLE.hub,
    NEEDLE.thickness * 2,
    NEEDLE.hubSegments,
  );
  hub.rotateX(QUARTER_TURN);
  return mergeParts([pointer, hub]);
}

export function needleAngle(share: number): number {
  return GAUGE.start - share * GAUGE.sweep;
}

export function lineGeometry(): BufferGeometry {
  const lines = LINE_PATHS.map((path) => {
    const curve = new CatmullRomCurve3(path.map((point) => new Vector3(...point)));
    return new TubeGeometry(curve, LINE.tubular, LINE.radius, LINE.radial, false);
  });
  return mergeParts(lines);
}

function bulkheadGeometry(): BufferGeometry {
  return mergeParts(
    LINE_PATHS.map((path) => {
      const [x, y, z] = path[path.length - 1];
      return hexAlongX(
        BULKHEAD.radius,
        BULKHEAD.length,
        [x - BULKHEAD.length / 2, y, z],
        BULKHEAD.sides,
      );
    }),
  );
}

export interface ValveTones {
  aluminium: string;
  bonnet: string;
  knob: string;
  brass: string;
}

export function valveMetalGeometry(tones: ValveTones): BufferGeometry {
  return mergeParts([
    tinted(blockGeometry(), tones.aluminium),
    tinted(bezelGeometry(), tones.aluminium),
    tinted(bonnetGeometry(), tones.bonnet),
    tinted(knobGeometry(), tones.knob),
    tinted(bulkheadGeometry(), tones.brass),
  ]);
}

function dialAngleShare(angle: number): number {
  const fromStart = (((GAUGE.start - angle) % FULL_TURN) + FULL_TURN) % FULL_TURN;
  return fromStart / GAUGE.sweep;
}

function isTick(radius: number, share: number): boolean {
  if (share > 1) return false;
  const step = share * DIAL.ticks;
  const majorOff = (Math.abs(step - Math.round(step)) * GAUGE.sweep) / DIAL.ticks;
  const minorOff = (seamDistance(step * 2) * GAUGE.sweep) / (DIAL.ticks * 2);
  const inBand = radius < DIAL.tickTo;
  const major = inBand && radius > DIAL.tickFrom && majorOff * radius < DIAL.tickHalf;
  const minor = inBand && radius > DIAL.minorFrom && minorOff * radius < DIAL.minorHalf;
  return major || minor;
}

export function dialTexture(): DataTexture {
  return paintTexture(DIAL_MAP, (u, v) => {
    const x = 2 * u - 1;
    const y = 2 * v - 1;
    const radius = Math.hypot(x, y);
    const share = dialAngleShare(Math.atan2(y, x));
    if (radius > DIAL.ring || radius < DIAL.hub) return DIAL.ink;
    const warn = share < DIAL.warnShare && radius > DIAL.warnFrom && radius < DIAL.warnTo;
    if (warn) return DIAL.warn;
    return isTick(radius, share) ? DIAL.ink : DIAL.face;
  });
}

export function braidTexture(): DataTexture {
  const texture = paintTexture(BRAID_MAP, (u, v) => {
    const rising = (u + v) * BRAID.crossings;
    const falling = (u - v) * BRAID.crossings;
    const over = (Math.floor(rising) + Math.floor(falling)) % 2 === 0;
    const strand = over ? rising : falling;
    const profile = Math.sin(Math.PI * (strand - Math.floor(strand))) ** BRAID.sharpness;
    return grey(lerp(BRAID.floor, BRAID.floor + BRAID.lift, profile));
  });
  texture.repeat.set(BRAID_REPEAT.along, BRAID_REPEAT.around);
  return texture;
}
