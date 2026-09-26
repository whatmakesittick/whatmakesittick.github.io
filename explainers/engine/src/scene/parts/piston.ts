import { Group, LatheGeometry, Object3D, Vector2 } from 'three';
import type { BufferGeometry } from 'three';
import { PISTON, RADIAL_SEGMENTS } from '../constants';
import { withCreasedNormals } from '../geometry/prism';
import { axialCylinder } from '../geometry/primitives';
import { sharedMesh } from './context';
import type { PartContext } from './context';

export interface PistonPart {
  object: Group;
  labelAnchor: Object3D;
  setPinHeight(height: number): void;
}

const LABEL_DROP = 12;

function grooveTop(depth: number): number {
  return PISTON.pinToCrown - depth;
}

function outerProfile(radius: number): Vector2[] {
  const crown = PISTON.pinToCrown;
  const points = [
    new Vector2(0, crown),
    new Vector2(radius - PISTON.crownChamfer, crown),
    new Vector2(radius, crown - PISTON.crownChamfer),
  ];
  PISTON.ringDepthsFromCrown.forEach((depth) => {
    const top = grooveTop(depth);
    const bottom = top - PISTON.grooveHeight;
    const root = radius - PISTON.grooveDepth;
    points.push(
      new Vector2(radius, top),
      new Vector2(root, top),
      new Vector2(root, bottom),
      new Vector2(radius, bottom),
    );
  });
  return points;
}

function pistonProfile(radius: number): Vector2[] {
  const skirtBottom = -PISTON.skirtBelowPin;
  const cavity = radius - PISTON.cavityWall;
  const underside = PISTON.pinToCrown - PISTON.crownThickness;
  return [
    ...outerProfile(radius),
    new Vector2(radius, skirtBottom),
    new Vector2(cavity, skirtBottom),
    new Vector2(cavity, underside),
    new Vector2(0, underside),
  ];
}

function ringProfile(radius: number, depth: number): Vector2[] {
  const top = grooveTop(depth) - PISTON.ringInset;
  const bottom = grooveTop(depth) - PISTON.grooveHeight + PISTON.ringInset;
  const inner = radius - PISTON.grooveDepth + PISTON.ringInset;
  const outer = radius - PISTON.ringInset;
  return [
    new Vector2(inner, bottom),
    new Vector2(outer, bottom),
    new Vector2(outer, top),
    new Vector2(inner, top),
    new Vector2(inner, bottom),
  ];
}

interface PistonGeometries {
  body: BufferGeometry;
  rings: BufferGeometry[];
  pin: BufferGeometry;
}

function buildGeometries(context: PartContext): PistonGeometries {
  const radius = context.dims.pistonRadius;
  const { tracker } = context;
  const body = withCreasedNormals(new LatheGeometry(pistonProfile(radius), RADIAL_SEGMENTS));
  const rings = PISTON.ringDepthsFromCrown.map((depth) =>
    withCreasedNormals(new LatheGeometry(ringProfile(radius, depth), RADIAL_SEGMENTS)),
  );
  const pinLength = 2 * (radius + PISTON.pinProtrusion);
  const pin = axialCylinder(PISTON.pinRadius, pinLength, RADIAL_SEGMENTS / 2);
  return {
    body: tracker.track(body),
    rings: rings.map((ring) => tracker.track(ring)),
    pin: tracker.track(pin),
  };
}

export function pistonFactory(context: PartContext): (z: number) => PistonPart {
  const geometries = buildGeometries(context);
  const radius = context.dims.pistonRadius;
  return (z) => {
    const object = new Group();
    object.position.z = z;
    object.add(sharedMesh(context, geometries.body, 'piston', 'alloy'));
    geometries.rings.forEach((ring) => object.add(sharedMesh(context, ring, 'piston', 'ring')));
    object.add(sharedMesh(context, geometries.pin, 'piston', 'forged'));
    const labelAnchor = new Object3D();
    labelAnchor.position.set(-radius, PISTON.pinToCrown - LABEL_DROP, 0);
    object.add(labelAnchor);
    return {
      object,
      labelAnchor,
      setPinHeight: (height) => {
        object.position.y = height;
      },
    };
  };
}
