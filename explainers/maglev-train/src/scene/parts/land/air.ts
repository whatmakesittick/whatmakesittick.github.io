import {
  Color,
  DoubleSide,
  Group,
  InstancedMesh,
  Matrix4,
  MeshBasicMaterial,
  PlaneGeometry,
  Quaternion,
  Vector3,
} from 'three';
import { smoothstep } from '@core/math';
import { PointCloud, createPointMaterial } from '@core/scene/pointCloud';
import type { MotionReading } from '../../../ids';
import { TRAIN } from '../../../model';
import { LINE_GROUP, registeredMaterial } from '../context';
import type { PartContext } from '../context';
import { seededRandom } from './random';

export const AIR = {
  speed: [25, 110] as const,
  wake: 220,
  count: 420,
  size: 2.2,
  colour: '#cdc4ae',
  height: [0.15, 4.5] as const,
  spread: [2.2, 9] as const,
  swirl: 1.4,
  swirlWave: 0.045,
  alpha: 0.4,
  streaks: {
    count: 9,
    opacity: 0.3,
    width: [0.8, 2] as const,
    length: [70, 220] as const,
    lift: 0.12,
  },
  seed: 8_803,
} as const;

const QUARTER_TURN = Math.PI / 2;
const FULL_TURN = Math.PI * 2;
const SPAN = TRAIN.length + AIR.wake;

export interface Air {
  readonly root: Group;
  setState(motion: Pick<MotionReading, 'distance' | 'speedMs'>): void;
}

export function airStrength(speedMs: number): number {
  return smoothstep(speedMs, AIR.speed[0], AIR.speed[1]);
}

export function dustBehindNose(phase: number, distance: number): number {
  return (((phase * SPAN + distance) % SPAN) + SPAN) % SPAN;
}

function wakeAlpha(behind: number): number {
  const rise = smoothstep(behind, TRAIN.length * 0.35, TRAIN.length);
  return rise * (1 - smoothstep(behind, TRAIN.length + AIR.wake * 0.3, SPAN));
}

function streaks(context: PartContext): InstancedMesh {
  const { count, opacity, width, length, lift } = AIR.streaks;
  const geometry = new PlaneGeometry(1, 1);
  geometry.rotateX(-QUARTER_TURN);
  const material = registeredMaterial(
    context,
    LINE_GROUP,
    new MeshBasicMaterial({
      color: AIR.colour,
      map: context.textures.glow,
      transparent: true,
      opacity,
      depthWrite: false,
      side: DoubleSide,
    }),
  );
  const mesh = context.tracker.track(
    new InstancedMesh(context.tracker.track(geometry), material, count),
  );
  const random = seededRandom(AIR.seed);
  const matrix = new Matrix4();
  for (let index = 0; index < count; index += 1) {
    const long = length[0] + (length[1] - length[0]) * random();
    const wide = width[0] + (width[1] - width[0]) * random();
    const x = TRAIN.tailX - long * 0.32 + (random() - 0.5) * TRAIN.length * 0.4;
    const z = (random() - 0.5) * AIR.spread[0] * 2;
    mesh.setMatrixAt(
      index,
      matrix.compose(new Vector3(x, lift, z), new Quaternion(), new Vector3(long, 1, wide)),
    );
  }
  mesh.name = 'airStreaks';
  mesh.renderOrder = 2;
  mesh.computeBoundingSphere();
  return mesh;
}

export function buildAir(context: PartContext): Air {
  const root = new Group();
  root.name = 'air';
  const points = createPointMaterial(context.textures.dot, AIR.size);
  points.color = new Color(AIR.colour);
  const material = registeredMaterial(context, LINE_GROUP, points);
  const dust = new PointCloud(AIR.count, material, 2);
  context.tracker.track(dust);
  const streak = streaks(context);
  root.add(dust.points, streak);
  const random = seededRandom(AIR.seed + 1);
  const phases = Array.from({ length: AIR.count }, () => [random(), random(), random()] as const);
  return {
    root,
    setState({ distance, speedMs }) {
      const strength = airStrength(speedMs);
      root.visible = strength > 0;
      if (!root.visible) return;
      (streak.material as MeshBasicMaterial).opacity = AIR.streaks.opacity * strength;
      phases.forEach(([phase, side, lift], index) => {
        const behind = dustBehindNose(phase, distance);
        const share = behind / SPAN;
        const swirl = Math.sin(behind * AIR.swirlWave + side * FULL_TURN) * AIR.swirl * share;
        const spread = AIR.spread[0] + (AIR.spread[1] - AIR.spread[0]) * share;
        const height = AIR.height[0] + (AIR.height[1] - AIR.height[0]) * share * lift * strength;
        dust.setPoint(
          index,
          TRAIN.noseX - behind,
          height + Math.abs(swirl) * lift,
          (side * 2 - 1) * spread + swirl,
        );
        dust.setColor(index, 1, 1, 1, wakeAlpha(behind) * AIR.alpha * strength);
      });
      dust.commit();
    },
  };
}
