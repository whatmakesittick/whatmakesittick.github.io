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

function arrowEnd(pointing: 1 | -1): BufferGeometry {
  const tick = segment([-HALF_TICK, 0], [HALF_TICK, 0], STROKE.bracket);
  const head = triangle(
    [0, 0],
    [STROKE.arrowWidth / 2, -pointing * STROKE.arrowLength],
    [-STROKE.arrowWidth / 2, -pointing * STROKE.arrowLength],
  );
  return merged([tick, head]);
}

export class GapGauge {
  readonly group = new Group();
  private readonly line: Mesh;
  private readonly lowerEnd: Mesh;
  private readonly plate: TextPlate;

  constructor(context: PartContext) {
    const look = { colour: INK.bracket };
    const upperEnd = insetMesh(context, arrowEnd(1), look, LAYER.bracket);
    upperEnd.position.set(BRACKET_X, STATOR_DRAWING.bottom, upperEnd.position.z);
    this.lowerEnd = insetMesh(context, arrowEnd(-1), look, LAYER.bracket);
    this.lowerEnd.position.x = BRACKET_X;
    this.line = insetMesh(
      context,
      rect(-STROKE.bracket / 2, -1, STROKE.bracket / 2, 0),
      look,
      LAYER.bracket,
    );
    this.line.position.set(BRACKET_X, STATOR_DRAWING.bottom, this.line.position.z);
    this.plate = new TextPlate(context, INSET_GROUP, GAP_PLATE, LAYER.text);
    this.plate.mesh.position.set(PLATE_X, 0, (LAYER.text - LAYER.ground) * LAYER_DEPTH);
    this.group.add(...toleranceBand(context), upperEnd, this.lowerEnd, this.line, this.plate.mesh);
  }

  show(gapMm: number): void {
    const gap = drawnGap(gapMm);
    this.line.scale.y = Math.max(gap, Number.EPSILON);
    this.lowerEnd.position.y = magnetTop(gapMm);
    this.plate.mesh.position.y = STATOR_DRAWING.bottom - gap / 2;
    this.plate.show(gapText(gapMm));
  }
}
