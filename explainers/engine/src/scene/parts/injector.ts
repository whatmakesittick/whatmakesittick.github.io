import { Group, LatheGeometry, Object3D, Vector2, Vector3 } from 'three';
import { INJECTOR, RADIAL_SEGMENTS } from '../constants';
import { withCreasedNormals } from '../geometry/prism';
import { verticalCylinder } from '../geometry/primitives';
import { sharedMesh } from './context';
import type { PartContext } from './context';

export interface InjectorPart {
  object: Group;
  labelAnchor: Object3D;
  nozzle: Vector3;
}

const HEX_SIDES = 6;
const NOZZLE_TAPER_HEIGHT = 6;
const NOZZLE_TIP_RATIO = 0.6;

function bodyProfile(): Vector2[] {
  const { tipDrop, nozzleRadius, bodyRadius, bodyTop } = INJECTOR;
  return [
    new Vector2(0, -tipDrop),
    new Vector2(nozzleRadius * NOZZLE_TIP_RATIO, -tipDrop),
    new Vector2(nozzleRadius, 0),
    new Vector2(nozzleRadius, NOZZLE_TAPER_HEIGHT),
    new Vector2(bodyRadius, NOZZLE_TAPER_HEIGHT * 2),
    new Vector2(bodyRadius, bodyTop),
    new Vector2(0, bodyTop),
  ];
}

export function injectorFactory(context: PartContext): (z: number) => InjectorPart {
  const { tracker } = context;
  const body = tracker.track(
    withCreasedNormals(new LatheGeometry(bodyProfile(), RADIAL_SEGMENTS / 2)),
  );
  const collar = tracker.track(
    verticalCylinder(
      INJECTOR.collarRadius,
      INJECTOR.collarBottom,
      INJECTOR.collarBottom + INJECTOR.collarHeight,
      HEX_SIDES,
    ),
  );
  const cap = tracker.track(
    verticalCylinder(INJECTOR.capRadius, INJECTOR.bodyTop, INJECTOR.capTop, RADIAL_SEGMENTS / 4),
  );
  return (z) => {
    const object = new Group();
    object.position.z = z;
    object.add(
      sharedMesh(context, body, 'injector', 'darkSteel'),
      sharedMesh(context, collar, 'injector', 'polished'),
      sharedMesh(context, cap, 'injector', 'forged'),
    );
    const labelAnchor = new Object3D();
    labelAnchor.position.set(INJECTOR.bodyRadius, INJECTOR.collarBottom, 0);
    object.add(labelAnchor);
    return { object, labelAnchor, nozzle: new Vector3(0, -INJECTOR.tipDrop, 0) };
  };
}
