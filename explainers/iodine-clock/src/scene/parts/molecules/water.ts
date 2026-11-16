import { Color, NormalBlending } from 'three';
import type { Object3D } from 'three';
import { lerp } from '@core/math';
import { PointCloud, createPointMaterial } from '@core/scene/pointCloud';
import type { AssemblyState } from '../../../ids';
import { SOLUTION_BOX, WATER_POINTS } from '../../../model';
import { WATER_LOOK } from '../../constants';
import { label, registeredMaterial } from '../context';
import type { PartContext, Section } from '../context';
import { seededRandom } from '../random';

const SEED = 18;
const XYZ = 3;
const FULL_TURN = Math.PI * 2;
const SPEED = [0.25, 0.7] as const;
const ALPHA_SPREAD = [0.55, 1] as const;
const LABEL_SPOT = [17, 14, 6] as const;

export function buildWater(context: PartContext, parent: Object3D): Section {
  const shade = registeredMaterial(
    context,
    'water',
    createPointMaterial(context.textures.dot, WATER_LOOK.size, NormalBlending),
  );
  const cloud = context.tracker.track(new PointCloud(WATER_POINTS, shade));
  cloud.points.name = 'water';
  parent.add(cloud.points);
  const random = seededRandom(SEED);
  const homes = new Float32Array(WATER_POINTS * XYZ);
  const phases = new Float32Array(WATER_POINTS * XYZ);
  const speeds = new Float32Array(WATER_POINTS * XYZ);
  const extents = [SOLUTION_BOX.x, SOLUTION_BOX.y, SOLUTION_BOX.z] as const;
  const tint = new Color(WATER_LOOK.colour);
  for (let index = 0; index < WATER_POINTS; index += 1) {
    extents.forEach(([min, max], axis) => {
      homes[index * XYZ + axis] = lerp(min, max, random());
      phases[index * XYZ + axis] = random() * FULL_TURN;
      speeds[index * XYZ + axis] = lerp(...SPEED, random());
    });
    const alpha = WATER_LOOK.alpha * lerp(...ALPHA_SPREAD, random());
    cloud.setColor(index, tint.r, tint.g, tint.b, alpha);
  }
  label(context, 'water', cloud.points, [...LABEL_SPOT]);
  return {
    root: cloud.points,
    setState: ({ clock, view }: AssemblyState) => {
      cloud.points.visible = view.water;
      if (!view.water) return;
      const seconds = clock.seconds;
      for (let index = 0; index < WATER_POINTS; index += 1) {
        const offset = (axis: number) =>
          homes[index * XYZ + axis] +
          Math.sin(speeds[index * XYZ + axis] * seconds + phases[index * XYZ + axis]) *
            WATER_LOOK.drift;
        cloud.setPoint(index, offset(0), offset(1), offset(2));
      }
      cloud.commit();
    },
  };
}
