import { CylinderGeometry, Group, Shape } from 'three';
import { HAMMER_SHAPE, SEGMENTS } from '../constants';
import { solid, solidSide } from '../geometry/pieces';
import { addPiece, markDynamic } from './context';
import type { PartContext } from './context';

const QUARTER_TURN = Math.PI / 2;
const BEVEL = 0.6;
const HUB_GAP = 0.22;

function hammerShape(): Shape {
  const { length, face, hub } = HAMMER_SHAPE;
  const shape = new Shape();
  shape.moveTo(hub, -1);
  shape.lineTo(face + 0.8, 4);
  shape.lineTo(face - 0.6, length - 5);
  shape.lineTo(face, length - 3.5);
  shape.lineTo(face, length + 2.5);
  shape.lineTo(face - 2.5, length + 4.2);
  shape.lineTo(-4.5, length + 3);
  shape.lineTo(-5.5, length - 3);
  shape.lineTo(-4.2, 6);
  shape.lineTo(-6.5, 3.5);
  shape.lineTo(-8.2, 0.5);
  shape.lineTo(-7, -2.5);
  shape.lineTo(-hub, -1);
  shape.absarc(0, 0, hub, Math.PI + HUB_GAP, 2 * Math.PI - HUB_GAP, false);
  shape.closePath();
  return shape;
}

export class HammerPart {
  readonly object = new Group();

  constructor(context: PartContext) {
    const { halfWidth, pin, pivot } = HAMMER_SHAPE;
    const look = context.looks.steel;
    addPiece(
      context,
      this.object,
      solidSide(hammerShape(), [-halfWidth, halfWidth], BEVEL),
      'hammer',
      look,
    );
    const axle = new CylinderGeometry(pin, pin, 2 * halfWidth + 2, SEGMENTS.rod, 1);
    axle.rotateX(QUARTER_TURN);
    addPiece(context, this.object, solid(axle), 'hammer', look);
    this.object.position.set(pivot[0], pivot[1], 0);
    markDynamic(this.object);
  }

  set(angle: number): void {
    this.object.rotation.z = angle;
  }
}
