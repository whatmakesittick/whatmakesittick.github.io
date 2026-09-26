import {
  BoxGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  Group,
  Object3D,
  Shape,
  Vector2,
} from 'three';
import type { BufferGeometry } from 'three';
import { FIN, RADIAL_SEGMENTS, STABILIZER, TAIL_BOOM } from '../constants';
import { partMesh } from './context';
import type { PartContext } from './context';

export interface TailBoomPart {
  object: Group;
  labelAnchor: Object3D;
}

type Outline = readonly (readonly [number, number])[];

const LABEL_SHARE = 0.55;

function boomGeometry(): BufferGeometry {
  const length = TAIL_BOOM.start - TAIL_BOOM.end;
  const geometry = new CylinderGeometry(
    TAIL_BOOM.tipRadius,
    TAIL_BOOM.rootRadius,
    length,
    RADIAL_SEGMENTS,
  );
  geometry.rotateZ(Math.PI / 2);
  geometry.translate((TAIL_BOOM.start + TAIL_BOOM.end) / 2, TAIL_BOOM.axisHeight, 0);
  return geometry;
}

function finGeometry(outline: Outline): BufferGeometry {
  const shape = new Shape(outline.map(([x, y]) => new Vector2(x, y)));
  const geometry = new ExtrudeGeometry(shape, { depth: FIN.thickness, bevelEnabled: false });
  geometry.translate(0, 0, -FIN.thickness / 2);
  return geometry;
}

function stabilizerGeometry(): BufferGeometry {
  const geometry = new BoxGeometry(STABILIZER.chord, STABILIZER.thickness, STABILIZER.span);
  geometry.translate(STABILIZER.centerX, TAIL_BOOM.axisHeight, 0);
  return geometry;
}

export function createTailBoom(context: PartContext): TailBoomPart {
  const object = new Group();
  object.add(
    partMesh(context, boomGeometry(), 'tailBoom', 'body'),
    partMesh(context, finGeometry(FIN.upper), 'tailBoom', 'body'),
    partMesh(context, finGeometry(FIN.lower), 'tailBoom', 'body'),
    partMesh(context, stabilizerGeometry(), 'tailBoom', 'body'),
  );
  const labelAnchor = new Object3D();
  const x = TAIL_BOOM.start + (TAIL_BOOM.end - TAIL_BOOM.start) * LABEL_SHARE;
  labelAnchor.position.set(x, TAIL_BOOM.axisHeight, 0);
  object.add(labelAnchor);
  return { object, labelAnchor };
}
