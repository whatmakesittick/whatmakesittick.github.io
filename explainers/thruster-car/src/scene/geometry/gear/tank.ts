import { CylinderGeometry, PlaneGeometry, RingGeometry, Shape } from 'three';
import type { BufferGeometry, DataTexture } from 'three';
import { FULL_TURN } from '@core/math';
import { box } from '@core/scene/geometry/box';
import { extrudeProfileAlongX } from '@core/scene/geometry/extrude';
import { TANK } from '../../../model/layout';
import { mergeParts } from '../../parts/context';
import { tinted } from './attributes';
import { latheAround } from './lathe';
import { HALF_TURN, QUARTER_TURN } from '../turns';
import { waveDip } from '../wave';
import type { Profile, Sweep } from './lathe';
import { grey, hash, paintTexture, ridge, seamDistance } from './maps';

export const SHELL = {
  radius: TANK.radius,
  halfLength: TANK.length / 2,
  domeDepth: 0.18,
  bossRadius: 0.045,
  domeSteps: 7,
  windowMargin: 0.05,
  linerScale: 0.955,
  segments: 40,
} as const;

export const STRAIGHT_HALF = SHELL.halfLength - SHELL.domeDepth;
const WINDOW_HALF = STRAIGHT_HALF - SHELL.windowMargin;
const POLE_ANGLE = Math.acos(SHELL.bossRadius / SHELL.radius);
export const POLE = STRAIGHT_HALF + SHELL.domeDepth * Math.sin(POLE_ANGLE);

const WINDOW_SWEEP: Sweep = { start: 3 * QUARTER_TURN, length: QUARTER_TURN };
const CUT_SWEEP: Sweep = { start: 0, length: 3 * QUARTER_TURN };

export const CORE = {
  radius: 0.268,
  inset: 0.03,
  segments: 32,
} as const;

export const CORE_FRONT = STRAIGHT_HALF - CORE.inset;
export const CORE_LENGTH = 2 * CORE_FRONT;

const STRAPS = {
  offsets: [-0.42, 0.42],
  halfWidth: 0.026,
  lift: 0.008,
  padLift: 0.002,
  padOverhang: 0.004,
  shoulderLift: 0.75,
  shoulderInset: 0.5,
  segments: 32,
} as const;

const BRACKET = {
  halfWidth: 0.2,
  thickness: 0.036,
  floor: 0.02 - TANK.centre[1],
  footHeight: 0.012,
  footHalfLength: 0.045,
  footOverhang: 0.025,
  lug: { halfX: 0.016, height: 0.022, sink: 0.007, halfZ: 0.022 },
} as const;

const BOSS_PROFILE: Profile = [
  [0, -0.022],
  [0.03, -0.022],
  [0.036, -0.016],
  [0.052, -0.006],
  [0.052, 0.01],
];

const BOSS_SEGMENTS = 18;

const WINDING = {
  around: 18,
  along: 11,
  edge: 0.04,
  edgeShade: 0.82,
  tows: 5,
  towDepth: 0.05,
  base: 0.97,
  grain: 0.04,
} as const;

const WINDING_MAP = { width: 512, height: 512, repeat: true } as const;

function domePoints(sign: 1 | -1): Profile {
  return Array.from({ length: SHELL.domeSteps + 1 }, (_, step) => {
    const angle = (step / SHELL.domeSteps) * POLE_ANGLE;
    const axial = STRAIGHT_HALF + SHELL.domeDepth * Math.sin(angle);
    return [SHELL.radius * Math.cos(angle), sign * axial] as const;
  });
}

export const SHELL_PROFILE: Profile = [
  ...[...domePoints(-1)].reverse(),
  [SHELL.radius, -WINDOW_HALF],
  [SHELL.radius, WINDOW_HALF],
  ...domePoints(1),
];

const WINDOW_START = SHELL.domeSteps + 1;
const WINDOW_END = WINDOW_START + 1;

function shellLathe(span: readonly [number, number], sweep?: Sweep): BufferGeometry {
  return latheAround(SHELL_PROFILE, { axis: 'x', segments: SHELL.segments, span, sweep });
}

export function fullShellGeometry(): BufferGeometry {
  return shellLathe([0, SHELL_PROFILE.length - 1]);
}

export function cutShellGeometry(): BufferGeometry {
  return mergeParts([
    shellLathe([0, WINDOW_START]),
    shellLathe([WINDOW_START, WINDOW_END], CUT_SWEEP),
    shellLathe([WINDOW_END, SHELL_PROFILE.length - 1]),
  ]);
}

export function windowGhostGeometry(): BufferGeometry {
  return shellLathe([WINDOW_START, WINDOW_END], WINDOW_SWEEP);
}

function wallMiddle(): number {
  return (SHELL.radius * (1 + SHELL.linerScale)) / 2;
}

function wallThickness(): number {
  return SHELL.radius * (1 - SHELL.linerScale);
}

function windowEnd(sign: 1 | -1): BufferGeometry {
  const ring = new RingGeometry(
    SHELL.radius * SHELL.linerScale,
    SHELL.radius,
    SHELL.segments / 4,
    1,
    sign > 0 ? QUARTER_TURN : 0,
    QUARTER_TURN,
  );
  ring.rotateY(sign * QUARTER_TURN);
  ring.translate(sign * WINDOW_HALF, 0, 0);
  return ring;
}

function cutEdgeGeometry(): BufferGeometry {
  const length = 2 * WINDOW_HALF;
  const side = new PlaneGeometry(length, wallThickness());
  side.rotateX(QUARTER_TURN);
  side.translate(0, 0, wallMiddle());
  const top = new PlaneGeometry(length, wallThickness());
  top.rotateY(HALF_TURN);
  top.translate(0, wallMiddle(), 0);
  return mergeParts([side, top, windowEnd(-1), windowEnd(1)]);
}

export function linerGeometry(): BufferGeometry {
  const liner = fullShellGeometry();
  liner.scale(SHELL.linerScale, SHELL.linerScale, SHELL.linerScale);
  return mergeParts([liner, cutEdgeGeometry()]);
}

export function coreGeometry(): BufferGeometry {
  const core = new CylinderGeometry(CORE.radius, CORE.radius, 1, CORE.segments);
  core.rotateZ(-QUARTER_TURN);
  core.translate(-1 / 2, 0, 0);
  return core;
}

function strapProfile(centre: number, lift: number, halfWidth: number): Profile {
  const radius = SHELL.radius + lift;
  const shoulder = SHELL.radius + lift * STRAPS.shoulderLift;
  const roll = lift * STRAPS.shoulderInset;
  return [
    [SHELL.radius, centre - halfWidth],
    [shoulder, centre - halfWidth + roll],
    [radius, centre],
    [shoulder, centre + halfWidth - roll],
    [SHELL.radius, centre + halfWidth],
  ];
}

function strapRing(centre: number): BufferGeometry {
  return latheAround(strapProfile(centre, STRAPS.lift, STRAPS.halfWidth), {
    axis: 'x',
    segments: STRAPS.segments,
  });
}

function strapPad(centre: number): BufferGeometry {
  const halfWidth = STRAPS.halfWidth + STRAPS.padOverhang;
  const profile: Profile = [
    [SHELL.radius, centre - halfWidth],
    [SHELL.radius + STRAPS.padLift, centre],
    [SHELL.radius, centre + halfWidth],
  ];
  return latheAround(profile, { axis: 'x', segments: STRAPS.segments });
}

function saddleShape(): Shape {
  const radius = SHELL.radius + STRAPS.lift;
  const half = BRACKET.halfWidth;
  const drop = -Math.sqrt(radius ** 2 - half ** 2);
  const start = Math.atan2(drop, half);
  const shape = new Shape();
  shape.moveTo(-half, BRACKET.floor);
  shape.lineTo(half, BRACKET.floor);
  shape.lineTo(half, drop);
  shape.absarc(0, 0, radius, start, -HALF_TURN - start, true);
  shape.closePath();
  return shape;
}

function bracket(centre: number): BufferGeometry {
  const half = BRACKET.thickness / 2;
  const saddle = extrudeProfileAlongX(saddleShape(), centre - half, centre + half);
  const foot = box({
    minX: centre - BRACKET.footHalfLength,
    maxX: centre + BRACKET.footHalfLength,
    minY: BRACKET.floor - BRACKET.footHeight,
    maxY: BRACKET.floor,
    minZ: -BRACKET.halfWidth - BRACKET.footOverhang,
    maxZ: BRACKET.halfWidth + BRACKET.footOverhang,
  });
  return mergeParts([saddle, foot]);
}

function clampLug(centre: number): BufferGeometry {
  const top = SHELL.radius + STRAPS.lift;
  const { lug } = BRACKET;
  return box({
    minX: centre - lug.halfX,
    maxX: centre + lug.halfX,
    minY: top - lug.sink,
    maxY: top + lug.height,
    minZ: -lug.halfZ,
    maxZ: lug.halfZ,
  });
}

function bossGeometry(sign: 1 | -1): BufferGeometry {
  const profile = BOSS_PROFILE.map(([radius, axial]) => [radius, sign * (POLE - axial)] as const);
  const ordered = sign > 0 ? [...profile].reverse() : profile;
  return latheAround(ordered, { axis: 'x', segments: BOSS_SEGMENTS });
}

export interface MountTones {
  strap: string;
  bracket: string;
  pad: string;
}

export function mountGeometry(tones: MountTones): BufferGeometry {
  const straps = STRAPS.offsets.flatMap((centre) => [strapRing(centre), clampLug(centre)]);
  const metal = [...straps, bossGeometry(-1), bossGeometry(1)];
  return mergeParts([
    ...metal.map((part) => tinted(part, tones.strap)),
    ...STRAPS.offsets.map((centre) => tinted(bracket(centre), tones.bracket)),
    ...STRAPS.offsets.map((centre) => tinted(strapPad(centre), tones.pad)),
  ]);
}

function towShade(family: number): number {
  return waveDip(WINDING.towDepth, FULL_TURN * WINDING.tows * family);
}

export function windingShade(u: number, v: number): number {
  const rising = u * WINDING.around + v * WINDING.along;
  const falling = u * WINDING.around - v * WINDING.along;
  const edges = Math.max(
    ridge(seamDistance(rising), 0, WINDING.edge, WINDING.edge),
    ridge(seamDistance(falling), 0, WINDING.edge, WINDING.edge),
  );
  const over = (Math.floor(rising) + Math.floor(falling)) % 2 === 0;
  const tows = towShade(over ? rising : falling);
  const edge = 1 - (1 - WINDING.edgeShade) * edges;
  return WINDING.base * tows * edge;
}

export function windingTexture(): DataTexture {
  return paintTexture(WINDING_MAP, (u, v) => {
    const grain = WINDING.grain * (hash(u * WINDING_MAP.width, v * WINDING_MAP.height) - 0.5);
    return grey(windingShade(u, v) + grain);
  });
}
