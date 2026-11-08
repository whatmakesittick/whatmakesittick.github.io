import { CylinderGeometry, Matrix4 } from 'three';
import type { Group, InstancedMesh, Mesh } from 'three';
import { box } from '@core/scene/geometry/box';
import { FINISHES } from '../../finishes';
import { namedGroup, partInstances, partMesh } from '../context';
import type { PartContext } from '../context';
import { PINBLOCK, TUNING_PIN } from './constants';
import { PIANO_STRINGS } from './layout';
import { betweenRims } from './boardPlan';

const TUNING_PIN_SIDES = 8;

export const PINBLOCK_BOUNDS = betweenRims(PINBLOCK.backZ, PINBLOCK.frontZ);

function tuningPinMesh(context: PartContext): InstancedMesh {
  const height = TUNING_PIN.top - TUNING_PIN.bottom;
  const geometry = new CylinderGeometry(
    TUNING_PIN.radius,
    TUNING_PIN.radius,
    height,
    TUNING_PIN_SIDES,
  );
  geometry.translate(0, height / 2, 0);
  const mesh = partInstances(
    context,
    geometry,
    'tuningPins',
    FINISHES.pinSteel,
    PIANO_STRINGS.length,
  );
  const matrix = new Matrix4();
  PIANO_STRINGS.forEach(({ pin }, index) => {
    mesh.setMatrixAt(index, matrix.makeTranslation(pin[0], TUNING_PIN.bottom, pin[2]));
  });
  mesh.computeBoundingSphere();
  return mesh;
}

export function createTuningPins(context: PartContext): Group {
  const group = namedGroup('tuningPins');
  group.add(tuningPinMesh(context));
  return group;
}

export function pinblockMesh(context: PartContext): Mesh {
  const { minX, maxX, minZ, maxZ } = PINBLOCK_BOUNDS;
  const geometry = box({ minX, maxX, minY: PINBLOCK.bottom, maxY: PINBLOCK.top, minZ, maxZ });
  const mesh = partMesh(context, geometry, 'structure', FINISHES.darkWood);
  mesh.name = 'pinblock';
  return mesh;
}
