import { Color, Vector3 } from 'three';
import type { Object3D } from 'three';
import { toRadians } from '@core/math';
import { createPointMaterial, PointCloud } from '@core/scene/pointCloud';
import type { AssemblyState, PartId } from '../../ids';
import { CRANK_Y, ENGINE_GEOMETRY, crownY } from '../../model';
import { THEME } from '../../theme';
import { CARB, CYLINDER } from '../constants';
import type { Vec3 } from '../geometry/builder';
import { label, namedGroup, registeredMaterial } from './context';
import type { PartContext, Section } from './context';
import { seededRandom } from './random';

interface StreamSpec {
  part: PartId;
  path: readonly Vec3[];
  count: number;
  spread: number;
  loopsPerTurn: number;
  color: string;
  reading: 'intake' | 'transfer' | 'exhaust';
  seed: number;
}

const POINT_SIZE = 0.0075;
const CLOUD_SIZE = 0.0065;
const STREAM_ALPHA = 0.95;
const CASE_ALPHA = 0.6;
const CHAMBER_ALPHA = 0.75;
const CASE_COUNT = 36;
const CHAMBER_COUNT = 56;
const SWIRL = 0.5;
const SQUEEZE = 0.16;
const SCAVENGE = { from: 120, to: 260, reach: 1.25 } as const;
const BLOWDOWN_FROM = 100;
const CHAMBER_RADIUS = CYLINDER.bore - 0.002;
const CHAMBER_MARGIN = 0.0015;

const STREAMS: readonly StreamSpec[] = [
  {
    part: 'freshCharge',
    path: [
      [-0.098, 0.192, 0.002],
      [-0.108, 0.172, 0],
      [-0.1, CARB.boreY, 0],
      [-0.06, CARB.boreY, 0],
      [-0.032, CARB.boreY, 0],
      [-0.018, 0.146, 0.002],
      [-0.013, 0.122, 0],
      [-0.022, 0.092, -0.01],
      [-0.01, 0.07, -0.02],
    ],
    count: 40,
    spread: 0.005,
    loopsPerTurn: 2.5,
    color: THEME.mixture,
    reading: 'intake',
    seed: 11,
  },
  {
    part: 'freshCharge',
    path: [
      [0, 0.085, -0.026],
      [0, 0.13, -0.031],
      [0, 0.166, -0.031],
      [0, 0.175, -0.022],
      [-0.012, 0.19, -0.01],
      [-0.008, 0.211, 0],
      [0.008, 0.209, 0.002],
      [0.018, 0.19, 0],
    ],
    count: 40,
    spread: 0.0038,
    loopsPerTurn: 2.2,
    color: THEME.mixture,
    reading: 'transfer',
    seed: 23,
  },
  {
    part: 'exhaustGas',
    path: [
      [0, 0.2, 0],
      [0.02, 0.181, 0],
      [0.04, 0.177, 0],
      [0.062, 0.18, 0.01],
      [0.085, 0.17, 0.015],
      [0.11, 0.166, 0.015],
      [0.15, 0.158, 0.015],
    ],
    count: 44,
    spread: 0.005,
    loopsPerTurn: 3,
    color: THEME.exhaustGas,
    reading: 'exhaust',
    seed: 37,
  },
];

class Polyline {
  private readonly points: Vector3[];
  private readonly lengths: number[] = [0];

  constructor(path: readonly Vec3[]) {
    this.points = path.map((point) => new Vector3(...point));
    for (let index = 1; index < this.points.length; index += 1)
      this.lengths.push(
        this.lengths[index - 1] + this.points[index].distanceTo(this.points[index - 1]),
      );
  }

  at(share: number, target: Vector3): Vector3 {
    const distance = share * this.lengths[this.lengths.length - 1];
    let index = 1;
    while (index < this.lengths.length - 1 && this.lengths[index] < distance) index += 1;
    const start = this.lengths[index - 1];
    const local = (distance - start) / Math.max(1e-9, this.lengths[index] - start);
    return target.lerpVectors(this.points[index - 1], this.points[index], local);
  }
}

function cloudFor(
  context: PartContext,
  parent: Object3D,
  part: PartId,
  count: number,
  size: number,
): PointCloud {
  const material = registeredMaterial(
    context,
    part,
    createPointMaterial(context.textures.dot, size),
  );
  const cloud = context.tracker.track(new PointCloud(count, material));
  parent.add(cloud.points);
  return cloud;
}

function stream(context: PartContext, parent: Object3D, spec: StreamSpec) {
  const cloud = cloudFor(context, parent, spec.part, spec.count, POINT_SIZE);
  const line = new Polyline(spec.path);
  const random = seededRandom(spec.seed);
  const jitter = Array.from({ length: spec.count }, () => [
    random() - 0.5,
    random() - 0.5,
    random() - 0.5,
    random(),
  ]);
  const color = new Color(spec.color);
  const point = new Vector3();
  return (state: AssemblyState) => {
    const strength = state.crank.flows[spec.reading];
    const turn = state.crank.angle / 360;
    jitter.forEach(([dx, dy, dz, phase], index) => {
      const share = (((index / spec.count + phase * 0.15 + turn * spec.loopsPerTurn) % 1) + 1) % 1;
      line.at(share, point);
      cloud.setPoint(
        index,
        point.x + dx * spec.spread,
        point.y + dy * spec.spread,
        point.z + dz * spec.spread * 2,
      );
      cloud.setColor(
        index,
        color.r,
        color.g,
        color.b,
        STREAM_ALPHA * strength * Math.sin(share * Math.PI),
      );
    });
    cloud.commit();
  };
}

function crankcaseCloud(context: PartContext, parent: Object3D) {
  const cloud = cloudFor(context, parent, 'freshCharge', CASE_COUNT, CLOUD_SIZE);
  const random = seededRandom(53);
  const seeds = Array.from({ length: CASE_COUNT }, () => [
    0.012 + random() * 0.03,
    random() * Math.PI * 2,
    (random() - 0.5) * 0.06,
  ]);
  const color = new Color(THEME.mixture);
  const [minX, minY] = ENGINE_GEOMETRY.crankcase.min;
  const [maxX, maxY] = ENGINE_GEOMETRY.crankcase.max;
  const inset = 0.006;
  seeds.forEach((_, index) => cloud.setColor(index, color.r, color.g, color.b, CASE_ALPHA));
  return (state: AssemblyState) => {
    const squeeze = 1 - SQUEEZE * state.crank.crankcasePressure;
    const turn = -toRadians(state.crank.angle) * SWIRL;
    seeds.forEach(([radius, angle, z], index) => {
      const x = Math.min(
        maxX - inset,
        Math.max(minX + inset, radius * squeeze * Math.cos(angle + turn)),
      );
      const y = Math.min(
        maxY - inset,
        Math.max(minY + inset, CRANK_Y + radius * squeeze * Math.sin(angle + turn)),
      );
      cloud.setPoint(index, x, y, z * squeeze);
    });
    cloud.commit();
  };
}

function chamberCloud(context: PartContext, parent: Object3D) {
  const cloud = cloudFor(context, parent, 'exhaustGas', CHAMBER_COUNT, CLOUD_SIZE);
  const random = seededRandom(71);
  const seeds = Array.from({ length: CHAMBER_COUNT }, () => [
    Math.sqrt(random()),
    random() * Math.PI * 2,
    random(),
  ]);
  const fresh = new Color(THEME.mixture);
  const burnt = new Color(THEME.exhaustGas);
  const flame = new Color(THEME.burn);
  const mixed = new Color();
  return (state: AssemblyState) => {
    const { angle, flows } = state.crank;
    const crown = crownY(angle) + CHAMBER_MARGIN;
    const height = CYLINDER.headInner - CHAMBER_MARGIN - crown;
    const sweep = (angle - SCAVENGE.from) / (SCAVENGE.to - SCAVENGE.from);
    seeds.forEach(([radius, turn, rise], index) => {
      cloud.setPoint(
        index,
        radius * CHAMBER_RADIUS * Math.cos(turn),
        crown + rise * height,
        radius * CHAMBER_RADIUS * Math.sin(turn),
      );
      if (flows.burn > 0) mixed.copy(burnt).lerp(flame, flows.burn);
      else if (angle < BLOWDOWN_FROM || angle >= SCAVENGE.to) mixed.copy(fresh);
      else if (angle < SCAVENGE.from) mixed.copy(burnt);
      else mixed.copy(rise < sweep * SCAVENGE.reach ? fresh : burnt);
      cloud.setColor(index, mixed.r, mixed.g, mixed.b, CHAMBER_ALPHA);
    });
    cloud.commit();
  };
}

export function buildFlow(
  context: PartContext,
  parent: Object3D,
): Section & { readonly glow: Object3D; readonly oil: Object3D } {
  const root = namedGroup('flow', parent);
  const glow = namedGroup('combustion', root);
  const oil = namedGroup('barOil', parent);
  const writers = [
    ...STREAMS.map((spec) => stream(context, root, spec)),
    crankcaseCloud(context, root),
    chamberCloud(context, root),
  ];
  label(context, 'freshCharge', root, [0, 0.145, -0.03]);
  label(context, 'exhaustGas', root, [0.112, 0.166, 0.015]);
  label(context, 'oilFlow', oil, [0.09, CRANK_Y + 0.025, 0.09]);
  let drawnAngle = Number.NaN;
  let drawnBurn = Number.NaN;
  return {
    root,
    glow,
    oil,
    setState: (state: AssemblyState) => {
      root.visible = state.view.flow;
      oil.visible = state.drive.oiling;
      const { angle, flows } = state.crank;
      if (!state.view.flow || (angle === drawnAngle && flows.burn === drawnBurn)) return;
      drawnAngle = angle;
      drawnBurn = flows.burn;
      writers.forEach((write) => write(state));
    },
  };
}
