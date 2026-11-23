import { CylinderGeometry, Group, SphereGeometry, Vector3 } from 'three';
import type { BufferGeometry, Matrix4 } from 'three';
import type { Figure } from '@core/figure';
import type { PartBuilder } from '../build';
import { outermostHit } from '@core/figure/body/faceProbe';
import { attachToJoint } from '@core/figure/body/restFrame';
import type { RestFrame } from '@core/figure/body/restFrame';

const HEAD_JOINT = 'c_head';
const EYE_JOINTS = { right: 'r_eye', left: 'l_eye' } as const;
const FORWARD = new Vector3(0, 0, 1);
const UP = new Vector3(0, 1, 0);

export const GOGGLES = {
  frame: { width: 0.024, height: 0.019, depth: 0.011 },
  lens: { width: 0.02, height: 0.015, depth: 0.008 },
  frameLift: 0.002,
  lensAhead: 0.003,
  tiltRad: 0.26,
  bridgeRadius: 0.0022,
  bridgeLift: 0.004,
  segments: [20, 12],
} as const;

interface Size {
  width: number;
  height: number;
  depth: number;
}

export interface GoggleSide {
  readonly centre: Vector3;
  readonly normal: Vector3;
}

export function gogglePlacement(figure: Figure, frame: RestFrame): GoggleSide[] {
  return ([-1, 1] as const).map((side) => {
    const eye = frame.joint(side < 0 ? EYE_JOINTS.right : EYE_JOINTS.left);
    const hit = outermostHit(figure, eye, FORWARD) as Vector3;
    const normal = FORWARD.clone().applyAxisAngle(UP, side * GOGGLES.tiltRad);
    return { centre: hit.addScaledVector(normal, GOGGLES.frameLift), normal };
  });
}

function ellipsoid(size: Size, side: GoggleSide, ahead: number): BufferGeometry {
  const [widthSegments, heightSegments] = GOGGLES.segments;
  const centre = side.centre.clone().addScaledVector(side.normal, ahead);
  const turn = Math.atan2(side.normal.x, side.normal.z);
  const geometry = new SphereGeometry(1, widthSegments, heightSegments);
  geometry.scale(size.width, size.height, size.depth);
  geometry.rotateY(turn);
  return geometry.translate(centre.x, centre.y, centre.z);
}

function bridge(figure: Figure, frame: RestFrame, sides: readonly GoggleSide[]): BufferGeometry {
  const [right, left] = sides;
  const middle = right.centre.clone().add(left.centre).multiplyScalar(0.5);
  const nose = outermostHit(figure, new Vector3(0, middle.y, frame.joint(HEAD_JOINT).z), FORWARD);
  const gap = right.centre.distanceTo(left.centre) - 2 * GOGGLES.frame.width;
  const geometry = new CylinderGeometry(GOGGLES.bridgeRadius, GOGGLES.bridgeRadius, gap, 6);
  geometry.rotateZ(Math.PI / 2);
  const z = Math.max(middle.z, (nose?.z ?? middle.z) + GOGGLES.bridgeLift);
  return geometry.translate(middle.x, middle.y, z);
}

export class Goggles {
  readonly group = new Group();
  private readonly follow: () => void;

  constructor(builder: PartBuilder, figure: Figure, frame: RestFrame, toRig: Matrix4) {
    this.group.name = 'goggles';
    const sides = gogglePlacement(figure, frame);
    sides.forEach((side) => {
      builder.mesh(ellipsoid(GOGGLES.frame, side, 0), 'head', 'goggleBand', this.group);
      builder.mesh(
        ellipsoid(GOGGLES.lens, side, GOGGLES.lensAhead),
        'head',
        'goggleLens',
        this.group,
      );
    });
    builder.mesh(bridge(figure, frame, sides), 'head', 'goggleBand', this.group);
    this.follow = attachToJoint(figure, frame, HEAD_JOINT, this.group, toRig);
  }

  update(): void {
    this.follow();
  }
}
