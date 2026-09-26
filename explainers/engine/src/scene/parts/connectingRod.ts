import { CylinderGeometry, Group, Object3D, Shape, Vector2 } from 'three';
import type { BufferGeometry } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { CRANK, PISTON, ROD } from '../constants';
import { extrudeBetween } from '../geometry/prism';
import { arcPoints, circlePath } from '../geometry/profiles';
import { PLANE_FRAME } from '../layout';
import { sharedMesh } from './context';
import type { PartContext } from './context';

export interface RodPart {
  object: Group;
  labelAnchor: Object3D;
  update(pinHeight: number, tilt: number): void;
}

const BOLT_SEGMENTS = 12;
const LABEL_HEIGHT_FRACTION = 0.55;

function outline(length: number): Vector2[] {
  const top = ROD.shankHalfWidthTop;
  const bottom = ROD.shankHalfWidthBottom;
  const smallAngle = Math.asin(-Math.sqrt(ROD.smallEndRadius ** 2 - top ** 2) / ROD.smallEndRadius);
  const bigAngle = Math.acos(bottom / ROD.bigEndRadius);
  const smallEnd = arcPoints(
    new Vector2(0, 0),
    ROD.smallEndRadius,
    smallAngle,
    Math.PI - smallAngle,
  );
  const bigEnd = arcPoints(
    new Vector2(0, -length),
    ROD.bigEndRadius,
    Math.PI - bigAngle,
    2 * Math.PI + bigAngle,
  );
  return [...smallEnd, ...bigEnd];
}

function pocket(length: number): Vector2[] {
  const margin = ROD.pocketMargin;
  const inset = ROD.flangeWidth;
  const top = -ROD.smallEndRadius - margin;
  const bottom = -length + ROD.bigEndRadius + margin;
  const widthAt = (y: number) => {
    const t = -y / length;
    return ROD.shankHalfWidthTop + (ROD.shankHalfWidthBottom - ROD.shankHalfWidthTop) * t - inset;
  };
  return [
    new Vector2(widthAt(top), top),
    new Vector2(-widthAt(top), top),
    new Vector2(-widthAt(bottom), bottom),
    new Vector2(widthAt(bottom), bottom),
  ];
}

function rodGeometry(length: number): BufferGeometry {
  const halfWidth = ROD.width / 2;
  const halfWeb = ROD.webThickness / 2;
  const frame = new Shape(outline(length));
  frame.holes = [
    circlePath(new Vector2(0, 0), PISTON.pinRadius),
    circlePath(new Vector2(0, -length), CRANK.pinRadius),
    new Shape(pocket(length)),
  ];
  const web = new Shape(pocket(length));
  const parts = [
    extrudeBetween(frame, PLANE_FRAME, -halfWidth, halfWidth, { bevel: ROD.bevel }),
    extrudeBetween(web, PLANE_FRAME, -halfWeb, halfWeb),
  ];
  const merged = mergeGeometries(parts);
  parts.forEach((part) => part.dispose());
  return merged;
}

function boltGeometry(): BufferGeometry {
  return new CylinderGeometry(ROD.boltRadius, ROD.boltRadius, ROD.boltLength, BOLT_SEGMENTS);
}

export function rodFactory(context: PartContext): (z: number) => RodPart {
  const length = context.dims.geometry.rodLength;
  const body = context.tracker.track(rodGeometry(length));
  const bolt = context.tracker.track(boltGeometry());
  return (z) => {
    const object = new Group();
    object.position.z = z;
    object.add(sharedMesh(context, body, 'connectingRod', 'forged'));
    [-1, 1].forEach((side) => {
      const mesh = sharedMesh(context, bolt, 'connectingRod', 'polished');
      mesh.position.set(side * ROD.boltOffset, -length, 0);
      object.add(mesh);
    });
    const labelAnchor = new Object3D();
    labelAnchor.position.set(ROD.shankHalfWidthBottom, -length * LABEL_HEIGHT_FRACTION, 0);
    object.add(labelAnchor);
    return {
      object,
      labelAnchor,
      update: (pinHeight, tilt) => {
        object.position.y = pinHeight;
        object.rotation.z = tilt;
      },
    };
  };
}
