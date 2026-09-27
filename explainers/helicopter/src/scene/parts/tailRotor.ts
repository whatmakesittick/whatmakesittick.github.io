import { Group, Object3D } from 'three';
import type { BufferGeometry } from 'three';
import { toRadians } from '@core/math';
import { bladeGeometry } from '@core/scene/geometry/airfoil';
import { FIN, TAIL_ROTOR } from '../constants';
import { lateralCylinder } from '../geometry/primitives';
import { partMesh } from './context';
import type { PartContext } from './context';

export interface TailRotorPart {
  object: Group;
  labelAnchor: Object3D;
  setAngle(degrees: number): void;
}

const BLADE_SPACING = (Math.PI * 2) / TAIL_ROTOR.bladeCount;
const LABEL_OFFSET = 0.1;

function tailBladeGeometry(): BufferGeometry {
  const section = { chord: TAIL_ROTOR.chord, thickness: TAIL_ROTOR.thickness };
  const geometry = bladeGeometry(section, TAIL_ROTOR.root, TAIL_ROTOR.radius);
  geometry.rotateX(Math.PI / 2);
  return geometry;
}

function gearboxGeometry(): BufferGeometry {
  const reach = TAIL_ROTOR.sideOffset - FIN.thickness / 2;
  const geometry = lateralCylinder(TAIL_ROTOR.gearboxRadius, reach);
  geometry.translate(0, 0, reach / 2);
  return geometry;
}

function createBlades(context: PartContext, spin: Group): void {
  const blade = tailBladeGeometry();
  for (let index = 0; index < TAIL_ROTOR.bladeCount; index++) {
    const arm = new Group();
    arm.rotation.z = index * BLADE_SPACING;
    const pitch = new Group();
    pitch.rotation.x = toRadians(TAIL_ROTOR.fixedPitchDegrees);
    pitch.add(partMesh(context, blade, 'tailRotor', 'blade'));
    arm.add(pitch);
    spin.add(arm);
  }
}

export function createTailRotor(context: PartContext): TailRotorPart {
  const object = new Group();
  object.position.set(TAIL_ROTOR.centerX, TAIL_ROTOR.centerY, -TAIL_ROTOR.sideOffset);
  const spin = new Group();
  spin.add(
    partMesh(
      context,
      lateralCylinder(TAIL_ROTOR.hubRadius, TAIL_ROTOR.hubLength),
      'tailRotor',
      'polished',
    ),
  );
  createBlades(context, spin);
  object.add(partMesh(context, gearboxGeometry(), 'tailRotor', 'forged'), spin);
  const labelAnchor = new Object3D();
  labelAnchor.position.z = -LABEL_OFFSET;
  object.add(labelAnchor);
  return {
    object,
    labelAnchor,
    setAngle: (degrees) => {
      spin.rotation.z = toRadians(degrees);
    },
  };
}
