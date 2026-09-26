import { Group, Shape, Vector2 } from 'three';
import type { Mesh } from 'three';
import { HEAD } from '../constants';
import type { ValveDimensions } from '../dimensions';
import { SURFACE_COLORS } from '../finishes';
import { extrudeBetween, paintSurfaces } from '../geometry/prism';
import { fromLeftHalfXY } from '../geometry/profiles';
import type { SectionProfile } from '../geometry/profiles';
import { PLANE_FRAME, PROFILE_FRAME } from '../layout';
import { castingMesh, cutNormalOf, partMesh } from './context';
import type { PartContext } from './context';
import { offsetEdge, portBend, portDepth, samplePath } from './portPath';

const EDGE_SAMPLES = 40;

function headProfile(): SectionProfile {
  const width = HEAD.halfWidth;
  const deck = HEAD.deckHeight;
  const points = [
    new Vector2(0, deck),
    new Vector2(-(width - HEAD.chamfer), deck),
    new Vector2(-width, deck - HEAD.chamfer),
    new Vector2(-width, 0),
    new Vector2(0, 0),
  ];
  return { boundary: fromLeftHalfXY(points), openings: [] };
}

interface PortEdges {
  outer: Vector2[];
  inner: Vector2[];
}

function portEdges(valve: ValveDimensions): PortEdges {
  const samples = samplePath(portBend(valve), EDGE_SAMPLES);
  return {
    outer: offsetEdge(samples, -valve.sign * valve.portRadius),
    inner: offsetEdge(samples, valve.sign * valve.portRadius),
  };
}

function portLayerShapes(intake: ValveDimensions, exhaust: ValveDimensions): Shape[] {
  const width = HEAD.halfWidth;
  const deck = HEAD.deckHeight;
  const intakeEdges = portEdges(intake);
  const exhaustEdges = portEdges(exhaust);
  const intakeIsland = new Shape([new Vector2(-width, 0), ...intakeEdges.outer]);
  const exhaustIsland = new Shape([new Vector2(width, 0), ...[...exhaustEdges.outer].reverse()]);
  const body = new Shape([
    ...exhaustEdges.inner,
    new Vector2(width, deck - HEAD.chamfer),
    new Vector2(width - HEAD.chamfer, deck),
    new Vector2(-(width - HEAD.chamfer), deck),
    new Vector2(-width, deck - HEAD.chamfer),
    ...[...intakeEdges.inner].reverse(),
  ]);
  return [intakeIsland, exhaustIsland, body];
}

function hasOpenPortLayer(context: PartContext): boolean {
  return context.cutaway && context.layout.id === 'single';
}

function portLayerMesh(context: PartContext, depth: number): Mesh {
  const { intake, exhaust } = context.dims.valves;
  const geometry = extrudeBetween(portLayerShapes(intake, exhaust), PLANE_FRAME, -depth, 0);
  paintSurfaces(geometry, SURFACE_COLORS.casting, SURFACE_COLORS.cut, cutNormalOf(context));
  return partMesh(context, geometry, 'structure', 'casting');
}

function headPieces(context: PartContext): (Mesh | null)[] {
  const length = context.layout.halfLength;
  if (!hasOpenPortLayer(context)) {
    return [castingMesh(context, headProfile(), PROFILE_FRAME, -length, length)];
  }
  const { intake, exhaust } = context.dims.valves;
  const depth = portDepth([intake, exhaust]);
  return [
    portLayerMesh(context, depth),
    castingMesh(context, headProfile(), PROFILE_FRAME, -length, -depth),
  ];
}

export function createCylinderHead(context: PartContext): Group {
  const group = new Group();
  headPieces(context).forEach((mesh) => mesh && group.add(mesh));
  return group;
}
