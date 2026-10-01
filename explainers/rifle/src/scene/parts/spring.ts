import { Group, InstancedMesh, Matrix4, Quaternion, TorusGeometry, Vector3 } from 'three';
import { RETURN_SPRING } from '../../model/layout';
import { CARRIER_SHAPE, SEGMENTS, SPRING_SHAPE } from '../constants';
import { solid } from '../geometry/pieces';
import { turnStrands } from '../geometry/turned';
import { addPiece, markDynamic } from './context';
import type { PartContext } from './context';

const QUARTER_TURN = Math.PI / 2;
const FULL_TURN = Math.PI * 2;
const Z_AXIS = new Vector3(0, 0, 1);
const UNIT = new Vector3(1, 1, 1);

export function springFront(carrier: number): number {
  return CARRIER_SHAPE.springBore.end - carrier;
}

export class SpringPart {
  readonly object = new Group();
  private readonly coils: InstancedMesh;
  private readonly matrix = new Matrix4();
  private readonly position = new Vector3();
  private readonly turn = new Quaternion();

  constructor(context: PartContext) {
    const { coils, coilRadius, wire, tubular, radial, guide, guideRadius } = SPRING_SHAPE;
    const look = context.looks.steel;
    const ring = new TorusGeometry(coilRadius, wire, radial, tubular).rotateY(QUARTER_TURN);
    this.coils = new InstancedMesh(
      context.tracker.track(ring),
      context.materials.get('returnSpring', look.surface),
      coils,
    );
    this.coils.frustumCulled = false;
    const rod = turnStrands(
      [
        [
          [guide[0], guideRadius],
          [guide[1], guideRadius],
        ],
        [
          [guide[1], guideRadius],
          [guide[1], 0],
        ],
      ],
      SEGMENTS.rod,
    ).translate(0, RETURN_SPRING.axisY, 0);
    addPiece(context, this.object, solid(rod), 'returnSpring', look);
    this.object.add(this.coils);
    markDynamic(this.object);
  }

  set(carrier: number): void {
    const { coils, seat, coilRadius } = SPRING_SHAPE;
    const spacing = (springFront(carrier) - seat) / (coils - 1);
    this.turn.setFromAxisAngle(Z_AXIS, Math.atan2(spacing, FULL_TURN * coilRadius));
    for (let index = 0; index < coils; index += 1) {
      this.position.set(seat + index * spacing, RETURN_SPRING.axisY, 0);
      this.coils.setMatrixAt(index, this.matrix.compose(this.position, this.turn, UNIT));
    }
    this.coils.instanceMatrix.needsUpdate = true;
  }
}
