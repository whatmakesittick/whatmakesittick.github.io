import { CylinderGeometry, Matrix4 } from 'three';
import type { BufferGeometry, Group, InstancedMesh, Shape } from 'three';
import { extrudePlan, planHole, planShape } from '@core/scene/geometry/extrude';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { Ring } from '../../geometry/section';
import { FINISHES } from '../../finishes';
import { namedGroup, partInstances, partMesh } from '../context';
import type { PartContext } from '../context';
import { HITCH_PIN, PLATE_LEVELS } from './constants';
import { PIANO_STRINGS } from './layout';
import { BAND_TOP_RING, BAND_WALL_RING, FLOOR_RINGS, STRUT_RINGS, WEB_RINGS } from './platePlan';

export interface PlateSlab {
  readonly rings: readonly Ring[];
  readonly bottom: number;
  readonly top: number;
}

export const PLATE_SLABS: readonly PlateSlab[] = [
  { rings: FLOOR_RINGS, bottom: PLATE_LEVELS.floorBottom, top: PLATE_LEVELS.floorTop },
  { rings: WEB_RINGS, bottom: PLATE_LEVELS.webBottom, top: PLATE_LEVELS.top },
  { rings: [BAND_TOP_RING], bottom: PLATE_LEVELS.webBottom, top: PLATE_LEVELS.top },
  { rings: [BAND_WALL_RING], bottom: PLATE_LEVELS.floorBottom, top: PLATE_LEVELS.webBottom },
  ...STRUT_RINGS.map((ring) => ({
    rings: [ring],
    bottom: PLATE_LEVELS.strutBottom,
    top: PLATE_LEVELS.top,
  })),
];

function shapeOf(rings: readonly Ring[]): Shape {
  const shape = planShape(rings[0]);
  shape.holes = rings.slice(1).map(planHole);
  return shape;
}

function plateGeometry(): BufferGeometry {
  return mergeGeometries(
    PLATE_SLABS.map(({ rings, bottom, top }) => extrudePlan(shapeOf(rings), bottom, top)),
  );
}

const HITCH_PIN_SIDES = 6;

function hitchPinMesh(context: PartContext): InstancedMesh {
  const geometry = new CylinderGeometry(HITCH_PIN.radius, HITCH_PIN.radius, 1, HITCH_PIN_SIDES);
  geometry.translate(0, 1 / 2, 0);
  const mesh = partInstances(context, geometry, 'plate', FINISHES.pinSteel, PIANO_STRINGS.length);
  const matrix = new Matrix4();
  const bottom = PLATE_LEVELS.floorTop - HITCH_PIN.rise;
  PIANO_STRINGS.forEach(({ hitch, y }, index) => {
    matrix.makeScale(1, y + HITCH_PIN.rise - bottom, 1).setPosition(hitch[0], bottom, hitch[2]);
    mesh.setMatrixAt(index, matrix);
  });
  mesh.computeBoundingSphere();
  mesh.name = 'hitchPins';
  return mesh;
}

export function createPlate(context: PartContext): Group {
  const group = namedGroup('plate');
  const plate = partMesh(context, plateGeometry(), 'plate', FINISHES.plateGold);
  group.add(plate, hitchPinMesh(context));
  return group;
}
