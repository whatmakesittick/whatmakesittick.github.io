import { Shape, Vector2 } from 'three';
import type { Object3D } from 'three';
import { BEVELS, MAGAZINE_ARC, MAGAZINE_SHAPE, SHEET, magazinePoint } from '../constants';
import { boxPiece, sidePiece } from '../geometry/pieces';
import type { CutPiece } from '../geometry/pieces';
import { addPiece } from './context';
import type { PartContext } from './context';

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

function ribShape(offset: number): Shape {
  const { radius, sweep } = MAGAZINE_ARC;
  const { width, start, end } = MAGAZINE_SHAPE.ribs;
  const middle = radius + offset;
  return new Shape([
    ...arc(middle - width / 2, start, sweep - end),
    ...arc(middle + width / 2, sweep - end, start),
  ]);
}

function addRibs(context: PartContext, parent: Object3D): void {
  const { halfWidth, ribs } = MAGAZINE_SHAPE;
  for (const offset of ribs.offsets) {
    for (const side of [-1, 1]) {
      const z =
        side > 0
          ? ([halfWidth, halfWidth + ribs.height] as const)
          : ([-halfWidth - ribs.height, -halfWidth] as const);
      addPiece(
        context,
        parent,
        sidePiece(ribShape(offset), z, BEVELS.fine / 2),
        'magazine',
        context.looks.blued,
      );
    }
  }
}

export function addMagazine(context: PartContext, parent: Object3D): void {
  const look = context.looks.blued;
  const { halfWidth, top, lips, frontLug, floorPlate } = MAGAZINE_SHAPE;
  const inner = halfWidth - SHEET;
  const add = (piece: CutPiece) => addPiece(context, parent, piece, 'magazine', look);
  add(sidePiece(outlineShape(), [-halfWidth, -inner]));
  add(sidePiece(outlineShape(), [inner, halfWidth]));
  add(sidePiece(bandShape(), [-inner, inner]));
  add(
    sidePiece(floorPlateShape(), [-floorPlate.halfWidth, floorPlate.halfWidth], floorPlate.bevel),
  );
  const lipY = [top - lips.depth, top] as const;
  for (const z of [[-inner, -lips.inner] as const, [lips.inner, inner] as const]) {
    add(boxPiece({ x: lips.x, y: lipY, z }, BEVELS.round));
  }
  add(
    boxPiece(
      { x: frontLug.x, y: frontLug.y, z: [-frontLug.halfWidth, frontLug.halfWidth] },
      BEVELS.round,
    ),
  );
  addRibs(context, parent);
}
