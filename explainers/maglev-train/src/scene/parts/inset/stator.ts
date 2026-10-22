import { CircleGeometry, Shape, ShapeGeometry, Vector2 } from 'three';
import type { BufferGeometry, Object3D } from 'three';
import type { PartContext } from '../context';
import { INK, LAYER, STROKE } from './constants';
import { insetMesh } from './insetMesh';
import { CONTENT, STATOR_DRAWING, slotCentres } from './layout';
import { disc, merged, polyline, positionsOnly, ring } from './strokes';
import type { Point2 } from './strokes';
import { hatchTexture } from './textures';

type Span = readonly [from: number, to: number];

const ARC_STEPS = 10;
const HATCH_PERIOD = 0.06;
const INSULATION_INNER = 0.6;
const INSULATION_OUTER = 0.84;
const BOLT_RADIUS = 0.022;
const BOLT_SIDES = 6;
const BOLT_SPACING = 0.774;

const { top, bottom, packHalf, jointHalf, slotWidth, slotDepth, cableRadius } = STATOR_DRAWING;
const slotRadius = slotWidth / 2;
const archY = bottom + slotDepth - slotRadius;

const PIECES: readonly Span[] = [
  [CONTENT.left, -packHalf - jointHalf],
  [-packHalf + jointHalf, packHalf - jointHalf],
  [packHalf + jointHalf, CONTENT.right],
];

function slotOutline(centre: number): Point2[] {
  const arch = Array.from({ length: ARC_STEPS + 1 }, (_, step): Point2 => {
    const angle = Math.PI * (1 - step / ARC_STEPS);
    return [centre + slotRadius * Math.cos(angle), archY + slotRadius * Math.sin(angle)];
  });
  return [[centre - slotRadius, bottom], ...arch, [centre + slotRadius, bottom]];
}

export function packOutline([from, to]: Span): Point2[] {
  return [
    [from, top],
    [from, bottom],
    ...slotCentres(from, to).flatMap(slotOutline),
    [to, bottom],
    [to, top],
  ];
}

function filledShape(points: readonly Point2[]): BufferGeometry {
  return new ShapeGeometry(new Shape(points.map(([x, y]) => new Vector2(x, y))));
}

function hatchedMesh(
  context: PartContext,
  geometry: BufferGeometry,
  colour: string,
  order: number,
): Object3D {
  const map = context.tracker.track(hatchTexture());
  map.repeat.set(1 / HATCH_PERIOD, 1 / HATCH_PERIOD);
  return insetMesh(context, geometry, { colour, map }, order);
}

function cableLayer(
  centres: readonly number[],
  shape: (centre: Point2) => BufferGeometry,
): BufferGeometry {
  return merged(centres.map((x) => shape([x, archY])));
}

function cables(context: PartContext): Object3D[] {
  const centres = PIECES.flatMap(([from, to]) => slotCentres(from, to));
  const layers: readonly [string, (centre: Point2) => BufferGeometry][] = [
    [INK.sheath, (centre) => disc(centre, cableRadius)],
    [
      INK.insulation,
      (centre) => ring(centre, cableRadius * INSULATION_INNER, cableRadius * INSULATION_OUTER),
    ],
    [INK.conductor, (centre) => disc(centre, cableRadius * INSULATION_INNER)],
  ];
  return layers.map(([colour, shape]) =>
    insetMesh(context, cableLayer(centres, shape), { colour }, LAYER.cables),
  );
}

function bolt(x: number): BufferGeometry {
  const geometry = new CircleGeometry(BOLT_RADIUS, BOLT_SIDES);
  geometry.translate(x, (top + CONTENT.top) / 2, 0);
  return positionsOnly(geometry);
}

function bolts(): BufferGeometry {
  const count = Math.floor(CONTENT.right / BOLT_SPACING);
  const xs = Array.from({ length: count * 2 + 1 }, (_, index) => (index - count) * BOLT_SPACING);
  return merged(xs.map(bolt));
}

function cantilever(context: PartContext): Object3D {
  const strip: Point2[] = [
    [CONTENT.left, top],
    [CONTENT.right, top],
    [CONTENT.right, CONTENT.top],
    [CONTENT.left, CONTENT.top],
  ];
  return hatchedMesh(context, filledShape(strip), INK.cantilever, LAYER.cantilever);
}

function outlines(context: PartContext): Object3D {
  const edges = merged([
    ...PIECES.map((piece) => polyline(packOutline(piece), STROKE.edge)),
    bolts(),
  ]);
  return insetMesh(context, edges, { colour: INK.statorEdge }, LAYER.outline);
}

export function buildStator(context: PartContext, parent: Object3D): void {
  const fill = hatchedMesh(
    context,
    merged(PIECES.map((piece) => filledShape(packOutline(piece)))),
    INK.stator,
    LAYER.stator,
  );
  parent.add(cantilever(context), fill, ...cables(context), outlines(context));
}
