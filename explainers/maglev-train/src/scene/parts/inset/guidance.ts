import { Group, ShapeGeometry } from 'three';
import type { BufferGeometry, Mesh } from 'three';
import { roundedRectHole, roundedRectShape } from '@core/scene/geometry/extrude';
import type { Rect } from '@core/scene/geometry/extrude';
import type { PartContext } from '../context';
import { GUIDE_PLATE, INK, INSET_GROUP, LAYER, LAYER_DEPTH, STROKE } from './constants';
import { dimensionGeometry, redrawDimension } from './dimension';
import { insetMesh } from './insetMesh';
import { drawnGuidanceGap, gapText, leftGuidanceGapMm } from './layout';
import { rect } from './strokes';
import type { Point2 } from './strokes';
import { TextPlate } from './textPlate';

const CARD = { x: 1.2, y: -0.57, width: 0.78, height: 0.26, corner: 0.04, rim: 0.006 } as const;
const BAR = { width: 0.08, bottom: -0.09, top: 0.05 } as const;
const GIRDER_WIDTH = 0.05;
const RAIL_FACE = -0.25;
const BRACKET_Y = 0.085;
const PLATE_CENTRE: Point2 = [0.25, -0.02];
const BRACKET_STYLE = {
  line: STROKE.edge,
  tick: STROKE.tick / 2,
  arrowLength: STROKE.arrowLength,
  arrowWidth: STROKE.arrowWidth,
} as const;

export const GUIDANCE_MAGNET_NAME = 'gapInsetGuidanceMagnet';

function cardRect(inset: number): Rect {
  const halfWidth = CARD.width / 2 - inset;
  const halfHeight = CARD.height / 2 - inset;
  return { minA: -halfWidth, minB: -halfHeight, maxA: halfWidth, maxB: halfHeight };
}

function cardMeshes(context: PartContext): Mesh[] {
  const rim = roundedRectShape(cardRect(0), CARD.corner);
  rim.holes.push(roundedRectHole(cardRect(CARD.rim), CARD.corner - CARD.rim));
  const ground = new ShapeGeometry(roundedRectShape(cardRect(0), CARD.corner));
  return [
    insetMesh(context, ground, { colour: INK.card }, LAYER.card),
    insetMesh(context, new ShapeGeometry(rim), { colour: INK.frame }, LAYER.cardInk),
  ];
}

function railMeshes(context: PartContext): Mesh[] {
  const railBack = RAIL_FACE - BAR.width;
  const reach = CARD.height / 2 - CARD.corner;
  const girder = rect(railBack - GIRDER_WIDTH, -reach, railBack, reach);
  const rail = rect(railBack, BAR.bottom, RAIL_FACE, BAR.top);
  return [
    insetMesh(context, girder, { colour: INK.girder }, LAYER.cardInk),
    insetMesh(context, rail, { colour: INK.rail }, LAYER.cardInk),
  ];
}

function bracketEnds(gap: number): readonly [Point2, Point2] {
  return [
    [RAIL_FACE, BRACKET_Y],
    [RAIL_FACE + gap, BRACKET_Y],
  ];
}

function bracketGeometry(gap: number): BufferGeometry {
  return dimensionGeometry(...bracketEnds(gap), BRACKET_STYLE);
}

export class GuidanceDetail {
  readonly group = new Group();
  private readonly magnet: Mesh;
  private readonly bracket: Mesh;
  private readonly plate: TextPlate;

  constructor(context: PartContext) {
    const magnet = rect(RAIL_FACE, BAR.bottom, RAIL_FACE + BAR.width, BAR.top);
    this.magnet = insetMesh(context, magnet, { colour: INK.guidanceMagnet }, LAYER.cardInk);
    this.magnet.name = GUIDANCE_MAGNET_NAME;
    this.bracket = insetMesh(
      context,
      bracketGeometry(drawnGuidanceGap(0)),
      { colour: INK.bracket },
      LAYER.cardInk,
    );
    this.bracket.frustumCulled = false;
    this.plate = new TextPlate(context, INSET_GROUP, GUIDE_PLATE, LAYER.text);
    this.plate.mesh.position.set(...PLATE_CENTRE, (LAYER.text - LAYER.ground) * LAYER_DEPTH);
    this.group.position.set(CARD.x, CARD.y, 0);
    this.group.add(
      ...cardMeshes(context),
      ...railMeshes(context),
      this.magnet,
      this.bracket,
      this.plate.mesh,
    );
  }

  show(lateralMm: number): void {
    const gap = drawnGuidanceGap(lateralMm);
    this.magnet.position.x = gap;
    redrawDimension(this.bracket, ...bracketEnds(gap), BRACKET_STYLE);
    this.plate.show(gapText(leftGuidanceGapMm(lateralMm)));
  }
}
