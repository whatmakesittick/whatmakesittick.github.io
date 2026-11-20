import { BufferGeometry, Float32BufferAttribute, Matrix4, Vector3 } from 'three';
import { FULL_TURN, lerp, toRadians } from '@core/math';
import type { PartId } from '../../ids';
import { SPIN_SENSE } from '../../model/scale';
import { bladeGeometry, mirroredZ } from './blade';
import type { BladeSpec } from './blade';
import { casingAt, hubAt, STATION_X, turbineCasingAt, turbineHubAt } from './profiles';
import type { RadiusAt } from './profiles';

export type RowKind = 'rotor' | 'stator';
export type RowFamily = 'compressor' | 'turbine';
export type SpoolId = 'inner' | 'outer';
export type RowPart = Extract<
  PartId,
  'booster' | 'compressorRotor' | 'compressorStator' | 'hpTurbine' | 'lpTurbine'
>;

export interface RowSpec {
  readonly part: RowPart;
  readonly kind: RowKind;
  readonly family: RowFamily;
  readonly spool: SpoolId | null;
  readonly from: number;
  readonly to: number;
  readonly hub: number;
  readonly tip: number;
  readonly count: number;
}

const ROOT_OVERLAP = 0.006;
const TIP_GAP = 0.004;
const XYZ = 3;

export const ROW_COUNTS = {
  booster: 44,
  compressorRotor: 52,
  compressorStator: 52,
  hptNozzle: 36,
  hptRotor: 52,
  lptStator: 60,
  lptRotor: 66,
} as const;

interface RowRun {
  readonly from: number;
  readonly to: number;
  readonly rows: number;
  readonly fill: number;
  readonly first: RowKind;
}

const BOOSTER_RUN: RowRun = { from: -2.03, to: -1.58, rows: 6, fill: 0.72, first: 'rotor' };
const COMPRESSOR_RUN: RowRun = {
  from: STATION_X.compressorStart,
  to: STATION_X.compressorEnd - 0.01,
  rows: 22,
  fill: 0.66,
  first: 'rotor',
};
const HPT_RUN: RowRun = { from: 0.735, to: 1.0, rows: 4, fill: 0.72, first: 'stator' };
const LPT_RUN: RowRun = { from: 1.09, to: 2.11, rows: 12, fill: 0.68, first: 'stator' };

interface RowSlot {
  from: number;
  to: number;
  kind: RowKind;
}

function slots(run: RowRun): RowSlot[] {
  const pitch = (run.to - run.from) / run.rows;
  return Array.from({ length: run.rows }, (_, index) => {
    const start = run.from + index * pitch;
    const isFirst = index % 2 === 0;
    const kind: RowKind = isFirst ? run.first : run.first === 'rotor' ? 'stator' : 'rotor';
    return { from: start, to: start + pitch * run.fill, kind };
  });
}

function fitted(slot: RowSlot, hub: RadiusAt, casing: RadiusAt) {
  const middle = (slot.from + slot.to) / 2;
  return { hub: hub(middle) - ROOT_OVERLAP, tip: casing(middle) - TIP_GAP };
}

function boosterRows(): RowSpec[] {
  return slots(BOOSTER_RUN).map((slot) => ({
    ...slot,
    ...fitted(slot, hubAt, casingAt),
    part: 'booster',
    family: 'compressor',
    spool: slot.kind === 'rotor' ? 'inner' : null,
    count: ROW_COUNTS.booster,
  }));
}

function compressorRows(): RowSpec[] {
  return slots(COMPRESSOR_RUN).map((slot) => ({
    ...slot,
    ...fitted(slot, hubAt, casingAt),
    part: slot.kind === 'rotor' ? 'compressorRotor' : 'compressorStator',
    family: 'compressor',
    spool: slot.kind === 'rotor' ? 'outer' : null,
    count: slot.kind === 'rotor' ? ROW_COUNTS.compressorRotor : ROW_COUNTS.compressorStator,
  }));
}

function turbineRows(run: RowRun, part: 'hpTurbine' | 'lpTurbine', spool: SpoolId): RowSpec[] {
  const counts =
    part === 'hpTurbine'
      ? { rotor: ROW_COUNTS.hptRotor, stator: ROW_COUNTS.hptNozzle }
      : { rotor: ROW_COUNTS.lptRotor, stator: ROW_COUNTS.lptStator };
  return slots(run).map((slot) => ({
    ...slot,
    ...fitted(slot, turbineHubAt, turbineCasingAt),
    part,
    family: 'turbine',
    spool: slot.kind === 'rotor' ? spool : null,
    count: counts[slot.kind],
  }));
}

export const BLADE_ROWS: readonly RowSpec[] = [
  ...boosterRows(),
  ...compressorRows(),
  ...turbineRows(HPT_RUN, 'hpTurbine', 'outer'),
  ...turbineRows(LPT_RUN, 'lpTurbine', 'inner'),
];

interface FamilyLook {
  stagger: readonly [hub: number, tip: number];
  camber: readonly [hub: number, tip: number];
  thickness: readonly [hub: number, tip: number];
  stations: number;
  samples: number;
}

const LOOKS: Readonly<Record<RowFamily, Record<RowKind, FamilyLook>>> = {
  compressor: {
    rotor: {
      stagger: [toRadians(34), toRadians(56)],
      camber: [0.07, 0.03],
      thickness: [0.08, 0.04],
      stations: 4,
      samples: 4,
    },
    stator: {
      stagger: [toRadians(30), toRadians(36)],
      camber: [0.09, 0.07],
      thickness: [0.07, 0.06],
      stations: 4,
      samples: 4,
    },
  },
  turbine: {
    rotor: {
      stagger: [toRadians(26), toRadians(38)],
      camber: [-0.2, -0.13],
      thickness: [0.22, 0.12],
      stations: 4,
      samples: 5,
    },
    stator: {
      stagger: [toRadians(46), toRadians(50)],
      camber: [-0.17, -0.14],
      thickness: [0.18, 0.14],
      stations: 4,
      samples: 5,
    },
  },
};

function between([hub, tip]: readonly [number, number]) {
  return (share: number) => lerp(hub, tip, share);
}

export function rowBladeSpec(row: RowSpec): BladeSpec {
  const look = LOOKS[row.family][row.kind];
  const width = row.to - row.from;
  const stagger = between(look.stagger);
  return {
    hub: row.hub,
    tip: row.tip,
    stations: look.stations,
    samples: look.samples,
    chord: (share) => width / Math.cos(stagger(share)),
    stagger,
    camber: between(look.camber),
    thickness: between(look.thickness),
  };
}

export function handed(geometry: BufferGeometry, kind: RowKind): BufferGeometry {
  const mirror = (kind === 'stator') !== SPIN_SENSE < 0;
  return mirror ? mirroredZ(geometry) : geometry;
}

export function rowBlade(row: RowSpec): BufferGeometry {
  const blade = bladeGeometry(rowBladeSpec(row));
  blade.translate((row.from + row.to) / 2, 0, 0);
  return handed(blade, row.kind);
}

export interface RingBuffers {
  positions: number[];
  normals: number[];
  heat: number[];
  indices: number[];
}

export function emptyRing(): RingBuffers {
  return { positions: [], normals: [], heat: [], indices: [] };
}

export function appendRing(
  buffers: RingBuffers,
  blade: BufferGeometry,
  count: number,
  phase: number,
  heat = 0,
): void {
  const position = blade.getAttribute('position');
  const normal = blade.getAttribute('normal');
  const index = blade.getIndex();
  const turn = new Matrix4();
  const point = new Vector3();
  for (let copy = 0; copy < count; copy += 1) {
    turn.makeRotationX(phase + (FULL_TURN * copy) / count);
    const base = buffers.positions.length / XYZ;
    for (let vertex = 0; vertex < position.count; vertex += 1) {
      point.fromBufferAttribute(position, vertex).applyMatrix4(turn);
      buffers.positions.push(point.x, point.y, point.z);
      point.fromBufferAttribute(normal, vertex).transformDirection(turn);
      buffers.normals.push(point.x, point.y, point.z);
      buffers.heat.push(heat);
    }
    if (index) {
      for (let entry = 0; entry < index.count; entry += 1) {
        buffers.indices.push(base + index.getX(entry));
      }
    }
  }
}

export function ringGeometry(buffers: RingBuffers): BufferGeometry {
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(buffers.positions, XYZ));
  geometry.setAttribute('normal', new Float32BufferAttribute(buffers.normals, XYZ));
  geometry.setAttribute('heatProfile', new Float32BufferAttribute(buffers.heat, 1));
  geometry.setIndex(buffers.indices);
  geometry.computeBoundingSphere();
  return geometry;
}
