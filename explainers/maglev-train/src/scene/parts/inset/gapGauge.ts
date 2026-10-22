import { Group } from 'three';
import type { Mesh } from 'three';
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
import { dimensionGeometry, redrawDimension } from './dimension';
import { dashed, merged, rect } from './strokes';
import type { Point2 } from './strokes';
import { TextPlate } from './textPlate';

const PLATE_X = BRACKET_X + PLATE_GAP + GAP_PLATE.width / 2;
const BRACKET_STYLE = {
  line: STROKE.bracket,
  tick: STROKE.tick,
  arrowLength: STROKE.arrowLength,
  arrowWidth: STROKE.arrowWidth,
} as const;

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

function bracketEnds(gapMm: number): readonly [Point2, Point2] {
  return [
    [BRACKET_X, STATOR_DRAWING.bottom],
    [BRACKET_X, magnetTop(gapMm)],
  ];
}

export class GapGauge {
  readonly group = new Group();
  private readonly bracket: Mesh;
  private readonly plate: TextPlate;

  constructor(context: PartContext) {
    const geometry = dimensionGeometry(...bracketEnds(GAP_MM), BRACKET_STYLE);
    this.bracket = insetMesh(context, geometry, { colour: INK.bracket }, LAYER.bracket);
    this.bracket.frustumCulled = false;
    this.plate = new TextPlate(context, INSET_GROUP, GAP_PLATE, LAYER.text);
    this.plate.mesh.position.set(PLATE_X, 0, (LAYER.text - LAYER.ground) * LAYER_DEPTH);
    this.group.add(...toleranceBand(context), this.bracket, this.plate.mesh);
  }

  show(gapMm: number): void {
    redrawDimension(this.bracket, ...bracketEnds(gapMm), BRACKET_STYLE);
    this.plate.mesh.position.y = STATOR_DRAWING.bottom - drawnGap(gapMm) / 2;
    this.plate.show(gapText(gapMm));
  }
}
