import { Color, DoubleSide, Group } from 'three';
import type { InstancedMesh, MeshBasicMaterial } from 'three';
import { FULL_TURN, lerp, smoothstep } from '@core/math';
import { wrapPhase } from '@core/store';
import { PointCloud, createPointMaterial } from '@core/scene/pointCloud';
import type { MotionReading } from '../../../ids';
import { TRAIN } from '../../../model';
import { LINE_GROUP, instancesOf, registeredMaterial } from '../context';
import type { PartContext } from '../context';
import { groundQuad, overlayMaterial } from './overlay';
import { between, seededRandom } from './random';
import { placement } from './scenery/instances';

export const AIR = {
  speed: [25, 110] as const,
  wake: 220,
  count: 420,
  size: 1.4,
  colour: '#cdc4ae',
  height: [0.15, 4.5] as const,
  spread: [2.2, 7] as const,
  swirl: 1.4,
  swirlWave: 0.045,
  alpha: 0.32,
  streaks: {
    count: 9,
    opacity: 0.3,
    width: [0.8, 2] as const,
    length: [70, 220] as const,
    lift: 0.12,
  },
  seed: 8_803,
} as const;

const SPAN = TRAIN.length + AIR.wake;
const WAKE_SHAPE = { riseFrom: 0.35, fadeFrom: 0.3 } as const;
const STREAK_LAYOUT = { lead: 0.32, scatter: 0.4 } as const;
const HALF = 0.5;

export interface Air {
  readonly root: Group;
  setState(motion: Pick<MotionReading, 'distance' | 'speedMs'>): void;
}

export function airStrength(speedMs: number): number {
  return smoothstep(speedMs, ...AIR.speed);
}

export function dustBehindNose(phase: number, distance: number): number {
  return wrapPhase(phase * SPAN + distance, SPAN);
}

function wakeAlpha(behind: number): number {
  const rise = smoothstep(behind, TRAIN.length * WAKE_SHAPE.riseFrom, TRAIN.length);
  return rise * (1 - smoothstep(behind, TRAIN.length + AIR.wake * WAKE_SHAPE.fadeFrom, SPAN));
}

function streaks(context: PartContext): InstancedMesh {
  const { count, opacity, width, length, lift } = AIR.streaks;
  const material = overlayMaterial(context, {
    color: AIR.colour,
    map: context.textures.glow,
    opacity,
    side: DoubleSide,
  });
  const random = seededRandom(AIR.seed);
  const matrices = Array.from({ length: count }, () => {
    const long = between(random, length);
    const wide = between(random, width);
    const scatter = (random() - HALF) * TRAIN.length * STREAK_LAYOUT.scatter;
    const x = TRAIN.tailX - long * STREAK_LAYOUT.lead + scatter;
    const z = (random() - HALF) * AIR.spread[0] * 2;
    return placement([x, lift, z], 0, [long, 1, wide]);
  });
  const mesh = instancesOf(context, groundQuad(), material, matrices);
  mesh.name = 'airStreaks';
  mesh.renderOrder = 2;
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
        const spread = lerp(...AIR.spread, share);
        const height = lerp(...AIR.height, share * lift * strength);
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
