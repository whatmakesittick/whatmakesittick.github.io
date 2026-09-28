import { CylinderGeometry, Group, Quaternion, Vector3 } from 'three';
import type { Mesh } from 'three';
import { strutEnds, STRUT } from '../../geometry/tiltFrame';
import { partMesh } from '../context';
import type { EmphasisGroup, PartContext } from '../context';

const COLLAR = { radius: 2.2, height: 3 } as const;
const UP = new Vector3(0, 1, 0);

function unitTube(radius: number): CylinderGeometry {
  const geometry = new CylinderGeometry(radius, radius, 1, STRUT.segments);
  geometry.translate(0, 1 / 2, 0);
  return geometry;
}

export class StrutPart {
  readonly object = new Group();
  private readonly x: number;
  private readonly outer: Mesh;
  private readonly inner: Mesh;
  private readonly collar: Mesh;
  private readonly direction = new Vector3();
  private readonly turn = new Quaternion();

  constructor(context: PartContext, group: EmphasisGroup, x: number) {
    this.x = x;
    this.outer = partMesh(context, unitTube(STRUT.outerRadius), group, 'rail');
    this.inner = partMesh(context, unitTube(STRUT.innerRadius), group, 'rail');
    const collar = new CylinderGeometry(
      COLLAR.radius,
      COLLAR.radius,
      COLLAR.height,
      STRUT.segments,
    );
    this.collar = partMesh(context, collar, group, 'darkSteel');
    this.object.add(this.outer, this.inner, this.collar);
  }

  setTilt(tiltDeg: number): void {
    const { foot, top } = strutEnds(tiltDeg);
    this.object.position.set(this.x, foot.y, foot.z);
    this.direction.set(0, top.y - foot.y, top.z - foot.z);
    const length = this.direction.length();
    this.object.quaternion.copy(this.turn.setFromUnitVectors(UP, this.direction.normalize()));
    const outerLength = length * STRUT.outerShare;
    const innerLength = length * STRUT.innerShare;
    this.outer.scale.set(1, outerLength, 1);
    this.inner.position.y = length - innerLength;
    this.inner.scale.set(1, innerLength, 1);
    this.collar.position.y = outerLength;
  }
}
