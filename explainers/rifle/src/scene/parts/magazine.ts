import { Shape, Vector2 } from 'three';
import type { Object3D } from 'three';
import { MAGAZINE_ARC, MAGAZINE_SHAPE, SHEET, magazinePoint } from '../constants';
import { boxPiece, sidePiece } from '../geometry/pieces';
import { addPiece } from './context';
import type { PartContext } from './context';

const FLOOR_PLATE_BEVEL = 0.6;

function arc(radius: number, from: number, to: number): Vector2[] {
  const steps = MAGAZINE_SHAPE.arcSteps;
  return Array.from({ length: steps + 1 }, (_, index) => {
    const [x, y] = magazinePoint(radius, from + ((to - from) * index) / steps);
    return new Vector2(x, y);
  });
}

function outlineShape(): Shape {
  const { front, rear, sweep } = MAGAZINE_ARC;
  return new Shape([...arc(front, 0, sweep), ...arc(rear, sweep, 0)]);
}

function bandShape(): Shape {
  const { front, rear, sweep, radius } = MAGAZINE_ARC;
  const innerSweep = sweep - MAGAZINE_SHAPE.floor / radius;
  return new Shape([
    ...arc(front, 0, sweep),
    ...arc(rear, sweep, 0),
    ...arc(rear - SHEET, 0, innerSweep),
    ...arc(front + SHEET, innerSweep, 0),
  ]);
}

function floorPlateShape(): Shape {
  const { front, rear, sweep, radius } = MAGAZINE_ARC;
  const { overhang, thickness } = MAGAZINE_SHAPE.floorPlate;
  const from = sweep - (thickness - overhang) / radius;
  const to = sweep + overhang / radius;
  return new Shape([...arc(front - overhang, from, to), ...arc(rear + overhang, to, from)]);
}

export function addMagazine(context: PartContext, parent: Object3D): void {
  const look = context.looks.blued;
  const { halfWidth, top, lips, frontLug, floorPlate } = MAGAZINE_SHAPE;
  const inner = halfWidth - SHEET;
  addPiece(context, parent, sidePiece(outlineShape(), [-halfWidth, -inner]), 'magazine', look);
  addPiece(context, parent, sidePiece(outlineShape(), [inner, halfWidth]), 'magazine', look);
  addPiece(context, parent, sidePiece(bandShape(), [-inner, inner]), 'magazine', look);
  addPiece(
    context,
    parent,
    sidePiece(floorPlateShape(), [-floorPlate.halfWidth, floorPlate.halfWidth], FLOOR_PLATE_BEVEL),
    'magazine',
    look,
  );
  const lipY = [top - lips.depth, top] as const;
  addPiece(
    context,
    parent,
    boxPiece({ x: lips.x, y: lipY, z: [-inner, -lips.inner] }),
    'magazine',
    look,
  );
  addPiece(
    context,
    parent,
    boxPiece({ x: lips.x, y: lipY, z: [lips.inner, inner] }),
    'magazine',
    look,
  );
  addPiece(
    context,
    parent,
    boxPiece({ x: frontLug.x, y: frontLug.y, z: [-frontLug.halfWidth, frontLug.halfWidth] }),
    'magazine',
    look,
  );
}
