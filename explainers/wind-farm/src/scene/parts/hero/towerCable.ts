import {
  BufferGeometry,
  CatmullRomCurve3,
  Float32BufferAttribute,
  TubeGeometry,
  Vector3,
} from 'three';
import type { Object3D } from 'three';
import { smoothstep } from '@core/math';
import { TURBINE_GEOMETRY, TURBINE_LAND } from '../../../model/layout';
import { FINISHES } from '../../finishes';
import { finishMesh, label, partMesh } from '../context';
import type { PartContext } from '../context';
import { heroGroundHeight } from './heroGround';

const [TRANSFORMER_X, , TRANSFORMER_Z] = TURBINE_GEOMETRY.transformer.centre;
const [TRANSFORMER_WIDTH] = TURBINE_GEOMETRY.transformer.size;

const RUN = {
  radius: 0.13,
  y: 0.16,
  tubular: 28,
  radial: 8,
  points: [
    [TRANSFORMER_X - TRANSFORMER_WIDTH / 2 + 0.2, 0.16, TRANSFORMER_Z - 0.4],
    [5.6, 0.16, 6.1],
    [3.4, 0.16, 3.4],
  ],
} as const;

const TRENCH_FINISH = {
  ...FINISHES.cable,
  polygonOffset: true,
  polygonOffsetFactor: -2,
  polygonOffsetUnits: -2,
};

const TRENCH = {
  startX: TRANSFORMER_X + TRANSFORMER_WIDTH / 2,
  endX: TURBINE_LAND.radius,
  halfWidth: 0.55,
  nearStep: 6,
  farStep: 40,
  nearReach: TURBINE_LAND.flatRadius + TURBINE_LAND.blendRadius,
  lift: 0.1,
  hillLift: 0.6,
  distanceLift: 0.0005,
} as const;

function runGeometry(): BufferGeometry {
  const curve = new CatmullRomCurve3(RUN.points.map((point) => new Vector3(...point)));
  return new TubeGeometry(curve, RUN.tubular, RUN.radius, RUN.radial);
}

function trenchStations(): number[] {
  const stations: number[] = [];
  for (let x = TRENCH.startX; x < TRENCH.endX;) {
    stations.push(x);
    x += x < TRENCH.nearReach ? TRENCH.nearStep : TRENCH.farStep;
  }
  return [...stations, TRENCH.endX];
}

function trenchLift(x: number): number {
  const hill = smoothstep(x, TURBINE_LAND.flatRadius, TRENCH.nearReach);
  return TRENCH.lift + hill * TRENCH.hillLift + x * TRENCH.distanceLift;
}

function trenchGeometry(): BufferGeometry {
  const positions: number[] = [];
  const indices: number[] = [];
  trenchStations().forEach((x, index) => {
    [-1, 1].forEach((side) => {
      const z = TRANSFORMER_Z + side * TRENCH.halfWidth;
      positions.push(x, heroGroundHeight(x, z) + trenchLift(x), z);
    });
    if (index === 0) return;
    const base = index * 2;
    indices.push(base - 2, base - 1, base, base - 1, base + 1, base);
  });
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

export function buildTowerCable(context: PartContext, parent: Object3D): void {
  const run = partMesh(context, runGeometry(), 'towerCable');
  const trench = finishMesh(context, trenchGeometry(), 'towerCable', TRENCH_FINISH);
  run.add(trench);
  parent.add(run);
  const [, middle] = RUN.points;
  label(context, 'towerCable', run, [middle[0], RUN.y + RUN.radius, middle[2]]);
}
