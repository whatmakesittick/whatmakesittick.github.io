import { ExtrudeGeometry, InstancedMesh, Mesh, ShapeGeometry } from 'three';
import type { BufferGeometry, Matrix4 } from 'three';
import type { MaterialFinish } from '@core/scene/materials';
import { finishMesh } from '../context';
import type { EmphasisGroup, PartContext } from '../context';
import { merged } from '../inset/strokes';
import type { Point2 } from '../inset/strokes';
import { SLICE } from './constants';
import { lifted, shapeOf } from './profile';

const QUARTER_TURN = Math.PI / 2;
const CURVE_SEGMENTS = 4;

export function sliceGeometry(
  outlines: readonly (readonly Point2[])[],
  start: number = SLICE.start,
  end: number = SLICE.end,
): BufferGeometry {
  const geometry = new ExtrudeGeometry(
    outlines.map((points) => shapeOf(points)),
    { depth: end - start, bevelEnabled: false, curveSegments: CURVE_SEGMENTS },
  );
  geometry.rotateY(-QUARTER_TURN);
  geometry.translate(end, 0, 0);
  return geometry;
}

export function cutMesh(
  context: PartContext,
  geometry: BufferGeometry,
  group: EmphasisGroup,
  side: MaterialFinish,
  cap: MaterialFinish,
): Mesh {
  const materials = [context.materials.get(group, cap), context.materials.get(group, side)];
  return new Mesh(context.tracker.track(geometry), materials);
}

export function cutFaceGeometry(points: readonly Point2[], lift: number): BufferGeometry {
  const geometry = new ShapeGeometry(shapeOf(points.map(([a, y]): Point2 => [-a, y])));
  geometry.rotateY(QUARTER_TURN);
  geometry.translate(SLICE.end + lift, 0, 0);
  return geometry;
}

export function cutFaceMesh(
  context: PartContext,
  group: EmphasisGroup,
  finish: MaterialFinish,
  outlines: readonly (readonly Point2[])[],
  bottom: number,
  lift: number,
): Mesh {
  const faces = outlines.map((outline) => cutFaceGeometry(lifted(outline, bottom), lift));
  return finishMesh(context, merged(faces), group, finish);
}

export function instances(
  context: PartContext,
  geometry: BufferGeometry,
  group: EmphasisGroup,
  finish: MaterialFinish | readonly MaterialFinish[],
  matrices: readonly Matrix4[],
): InstancedMesh {
  const material = Array.isArray(finish)
    ? finish.map((each: MaterialFinish) => context.materials.get(group, each))
    : context.materials.get(group, finish as MaterialFinish);
  const mesh = new InstancedMesh(context.tracker.track(geometry), material, matrices.length);
  matrices.forEach((matrix, index) => mesh.setMatrixAt(index, matrix));
  mesh.instanceMatrix.needsUpdate = true;
  mesh.computeBoundingSphere();
  return context.tracker.track(mesh);
}
