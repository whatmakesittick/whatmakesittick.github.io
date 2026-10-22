import { Group } from 'three';
import type { Mesh } from 'three';
import type { PartContext } from '../context';
import {
  BRACKET_X,
  GAP_PLATE,
  INK,
  INSET_GROUP,
  LAYER,
  OPACITY,
  PLATE_GAP,
  STROKE,
} from './constants';
import { insetMesh, layerDepth } from './insetMesh';
import type { InsetPart } from './insetMesh';
import { GAP_MM } from '../../../model';
import { CONTENT, STATOR_DRAWING, TOLERANCE_DRAWING, drawnGap, gapText, magnetTop } from './layout';
import { dimensionMesh, redrawDimension } from './dimension';
import { dashed, merged, rect } from './strokes';
import type { Point2 } from './strokes';
import { TextPlate } from './textPlate';

const PLATE_X = BRACKET_X + PLATE_GAP + GAP_PLATE.width / 2;
const BRACKET_STYLE = { line: STROKE.bracket, tick: STROKE.tick } as const;

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

export function gapGauge(context: PartContext): InsetPart<[gapMm: number]> {
  const bracket = dimensionMesh(context, bracketEnds(GAP_MM), BRACKET_STYLE, LAYER.bracket);
  const plate = new TextPlate(context, INSET_GROUP, GAP_PLATE, LAYER.text);
  plate.mesh.position.set(PLATE_X, 0, layerDepth(LAYER.text));
  const group = new Group();
  group.add(...toleranceBand(context), bracket, plate.mesh);
  return {
    group,
    draw(gapMm) {
      redrawDimension(bracket, bracketEnds(gapMm), BRACKET_STYLE);
      plate.mesh.position.y = STATOR_DRAWING.bottom - drawnGap(gapMm) / 2;
      plate.show(gapText(gapMm));
    },
  };
}
