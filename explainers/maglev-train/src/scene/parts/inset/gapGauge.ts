import { Group } from 'three';
import type { BufferGeometry, Mesh } from 'three';
import type { PartContext } from '../context';
import {
  BRACKET_X,
  GAP_PLATE,
  INK,
  INSET_GROUP,
  LAYER,
  LAYER_DEPTH,
  OPACITY,
  PLATE_GAP,
  STROKE,
} from './constants';
import { insetMesh } from './insetMesh';
import { GAP_MM } from '../../../model';
import { CONTENT, STATOR_DRAWING, TOLERANCE_DRAWING, drawnGap, gapText, magnetTop } from './layout';
import { dashed, merged, rect, segment, triangle } from './strokes';
import { TextPlate } from './textPlate';

const HALF_TICK = STROKE.tick / 2;
const PLATE_X = BRACKET_X + PLATE_GAP + GAP_PLATE.width / 2;

function toleranceBand(context: PartContext): Mesh[] {
  const { top, bottom } = TOLERANCE_DRAWING;
  const fill = rect(CONTENT.left, bottom, CONTENT.right, top);
  const edges = merged(
    [top, bottom].map((y) =>
      dashed([CONTENT.left, y], [CONTENT.right, y], STROKE.tolerance, STROKE.dash, STROKE.dashGap),
    ),
  );
  return [
    insetMesh(
      context,
      fill,
      { colour: INK.tolerance, opacity: OPACITY.toleranceFill },
      LAYER.tolerance,
    ),
    insetMesh(
      context,
      edges,
      { colour: INK.tolerance, opacity: OPACITY.toleranceEdge },
      LAYER.tolerance,
    ),
  ];
}

function arrowEnd(y: number, pointing: 1 | -1): BufferGeometry[] {
  const tick = segment([BRACKET_X - HALF_TICK, y], [BRACKET_X + HALF_TICK, y], STROKE.bracket);
  const base = y - pointing * STROKE.arrowLength;
  const head = triangle(
    [BRACKET_X, y],
    [BRACKET_X + STROKE.arrowWidth / 2, base],
    [BRACKET_X - STROKE.arrowWidth / 2, base],
  );
  return [tick, head];
}

export function bracketGeometry(gapMm: number): BufferGeometry {
  const top = STATOR_DRAWING.bottom;
  const bottom = magnetTop(gapMm);
  const halfLine = STROKE.bracket / 2;
  return merged([
    ...arrowEnd(top, 1),
    ...arrowEnd(bottom, -1),
    rect(BRACKET_X - halfLine, bottom, BRACKET_X + halfLine, top),
  ]);
}

export class GapGauge {
  readonly group = new Group();
  private readonly bracket: Mesh;
  private readonly plate: TextPlate;

  constructor(context: PartContext) {
    this.bracket = insetMesh(
      context,
      bracketGeometry(GAP_MM),
      { colour: INK.bracket },
      LAYER.bracket,
    );
    this.bracket.frustumCulled = false;
    this.plate = new TextPlate(context, INSET_GROUP, GAP_PLATE, LAYER.text);
    this.plate.mesh.position.set(PLATE_X, 0, (LAYER.text - LAYER.ground) * LAYER_DEPTH);
    this.group.add(...toleranceBand(context), this.bracket, this.plate.mesh);
  }

  show(gapMm: number): void {
    const fresh = bracketGeometry(gapMm);
    const positions = this.bracket.geometry.getAttribute('position');
    positions.array.set(fresh.getAttribute('position').array);
    positions.needsUpdate = true;
    fresh.dispose();
    this.plate.mesh.position.y = STATOR_DRAWING.bottom - drawnGap(gapMm) / 2;
    this.plate.show(gapText(gapMm));
  }
}
