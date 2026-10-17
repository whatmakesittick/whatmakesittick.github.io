import { Group, InstancedMesh, Matrix4, Quaternion, Vector3 } from 'three';
import type { Object3D } from 'three';
import { UNDIMMED_GROUP } from '@core/scene/materials';
import { anchorAt } from '@core/scene/parts';
import { SITE, SITE_ANCHORS } from '../../../model/layout';
import type { ConcreteMaps } from '../../geometry/site/concrete';
import { coneGeometry } from '../../geometry/site/cone';
import {
  landingMarks,
  marksGeometry,
  pitMarks,
  startMarks,
  wornPaintMap,
} from '../../geometry/site/markings';
import { hash2 } from '../../geometry/site/noise';
import type { Pit } from '../../geometry/site/pit';
import { slabGeometry } from '../../geometry/site/slab';
import { partMesh } from '../context';
import type { PartContext } from '../context';
import { MARK_COLOURS, WORLD_FINISHES, WORLD_PAINT, concreteFinish, paintFinish } from './finishes';

export interface RunwayPart {
  object: Group;
  runwayLabel: Object3D;
  padLabel: Object3D;
}

export const CONES = { spacing: 5, yaw: 0.6, seed: 71 } as const;

const RUNWAY_LABEL = { x: 12, z: -4 } as const;
const UP = new Vector3(0, 1, 0);

export function conePositions(): number[] {
  const [from, to] = SITE.run.x;
  const count = Math.floor((to - from) / CONES.spacing) + 1;
  return Array.from({ length: count }, (_, index) => from + index * CONES.spacing);
}

function createCones(context: PartContext): InstancedMesh {
  const positions = conePositions();
  const cones = new InstancedMesh(
    context.tracker.track(coneGeometry()),
    context.materials.get(UNDIMMED_GROUP, WORLD_FINISHES.cones),
    positions.length,
  );
  const matrix = new Matrix4();
  const turn = new Quaternion();
  const scale = new Vector3(1, 1, 1);
  positions.forEach((x, index) => {
    turn.setFromAxisAngle(UP, (hash2(index, CONES.seed) - 0.5) * CONES.yaw);
    matrix.compose(new Vector3(x, 0, SITE.coneLineZ), turn, scale);
    cones.setMatrixAt(index, matrix);
  });
  cones.instanceMatrix.needsUpdate = true;
  cones.computeBoundingSphere();
  context.tracker.track(cones);
  return cones;
}

export function createRunway(
  context: PartContext,
  concrete: ConcreteMaps,
  pit: Pit | null,
): RunwayPart {
  const object = new Group();
  object.name = 'runway';
  const wear = context.tracker.track(wornPaintMap());
  const slab = partMesh(
    context,
    slabGeometry(SITE.run, pit),
    'runway',
    concreteFinish(concrete.map, concrete.normal, WORLD_PAINT.white),
  );
  const start = partMesh(
    context,
    marksGeometry([...startMarks(), ...(pit ? pitMarks(pit) : [])]),
    'runway',
    paintFinish(wear, MARK_COLOURS.start),
  );
  const landing = partMesh(
    context,
    marksGeometry(landingMarks()),
    'landingPad',
    paintFinish(wear, MARK_COLOURS.landing),
  );
  object.add(slab, start, landing, createCones(context));
  const [padX, padY, padZ] = SITE_ANCHORS.pad;
  return {
    object,
    runwayLabel: anchorAt(object, RUNWAY_LABEL.x, 0, RUNWAY_LABEL.z),
    padLabel: anchorAt(object, padX, padY, padZ),
  };
}
