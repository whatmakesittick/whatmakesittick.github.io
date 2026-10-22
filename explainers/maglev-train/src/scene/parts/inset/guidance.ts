import { Group } from 'three';
import type { Mesh } from 'three';
import type { PartContext } from '../context';
import { GUIDE_PLATE, INK, INSET_GROUP, LAYER, STROKE } from './constants';
import { dimensionMesh, redrawDimension } from './dimension';
import { insetMesh, layerDepth } from './insetMesh';
import type { InsetPart } from './insetMesh';
import { drawnGuidanceGap, gapText, leftGuidanceGapMm } from './layout';
import { roundedCard } from './panel';
import { rect } from './strokes';
import type { Point2 } from './strokes';
import { TextPlate } from './textPlate';

const CARD = { x: 1.2, y: -0.57, width: 0.78, height: 0.26, corner: 0.04, rim: 0.006 } as const;
const BAR = { width: 0.08, bottom: -0.09, top: 0.05 } as const;
const GIRDER_WIDTH = 0.05;
const RAIL_FACE = -0.25;
const BRACKET_Y = 0.085;
const PLATE_CENTRE: Point2 = [0.25, -0.02];
const BRACKET_STYLE = { line: STROKE.edge, tick: STROKE.tick / 2 } as const;

export const GUIDANCE_MAGNET_NAME = 'gapInsetGuidanceMagnet';

function cardMeshes(context: PartContext): Mesh[] {
  const [ground, rim] = roundedCard(CARD.width, CARD.height, CARD.corner, CARD.rim);
  return [
    insetMesh(context, ground, { colour: INK.card }, LAYER.card),
    insetMesh(context, rim, { colour: INK.frame }, LAYER.cardInk),
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

export function guidanceDetail(context: PartContext): InsetPart<[lateralMm: number]> {
  const bar = rect(RAIL_FACE, BAR.bottom, RAIL_FACE + BAR.width, BAR.top);
  const magnet = insetMesh(context, bar, { colour: INK.guidanceMagnet }, LAYER.cardInk);
  magnet.name = GUIDANCE_MAGNET_NAME;
  const bracket = dimensionMesh(
    context,
    bracketEnds(drawnGuidanceGap(0)),
    BRACKET_STYLE,
    LAYER.cardInk,
  );
  const plate = new TextPlate(context, INSET_GROUP, GUIDE_PLATE, LAYER.text);
  plate.mesh.position.set(...PLATE_CENTRE, layerDepth(LAYER.text));
  const group = new Group();
  group.position.set(CARD.x, CARD.y, 0);
  group.add(...cardMeshes(context), ...railMeshes(context), magnet, bracket, plate.mesh);
  return {
    group,
    draw(lateralMm) {
      const gap = drawnGuidanceGap(lateralMm);
      magnet.position.x = gap;
      redrawDimension(bracket, bracketEnds(gap), BRACKET_STYLE);
      plate.show(gapText(leftGuidanceGapMm(lateralMm)));
    },
  };
}
