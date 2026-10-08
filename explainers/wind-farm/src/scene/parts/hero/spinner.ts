import type { BufferGeometry, Object3D } from 'three';
import { latheAlongX, sampleProfile } from '@core/scene/geometry/lathe';
import type { ProfilePoint } from '@core/scene/geometry/lathe';
import { finishMesh, label } from '../context';
import type { PartContext } from '../context';
import { HUB } from './constants';
import { SHELL_FINISH } from './nacelleShell';

const PROFILE: readonly ProfilePoint[] = [
  [-3.3, 0],
  [-3.12, 0.55],
  [-2.6, 1.12],
  [-1.7, 1.58],
  [-0.6, 1.86],
  [0.6, 1.9],
  [1.7, 1.86],
  [2.3, 1.78],
];
const SAMPLES = 20;
const HALF_SEGMENTS = 24;
const LABEL_X = 1.7;
const LABEL_RADIUS = 1.85;

export interface Spinner {
  readonly openable: Object3D;
  readonly casters: readonly BufferGeometry[];
}

function half(start: number): BufferGeometry {
  const geometry = latheAlongX(sampleProfile(PROFILE, SAMPLES), HALF_SEGMENTS, {
    start,
    length: Math.PI,
  });
  geometry.translate(...HUB);
  return geometry;
}

export function buildSpinner(context: PartContext, yaw: Object3D): Spinner {
  const back = half(Math.PI / 2);
  const front = half(-Math.PI / 2);
  const kept = finishMesh(context, back, 'hub', SHELL_FINISH);
  const openable = finishMesh(context, front, 'hub', SHELL_FINISH);
  kept.name = 'hub';
  yaw.add(kept, openable);
  label(context, 'hub', kept, [HUB[0] + LABEL_X, HUB[1] + LABEL_RADIUS, HUB[2]]);
  return { openable, casters: [back, front] };
}
