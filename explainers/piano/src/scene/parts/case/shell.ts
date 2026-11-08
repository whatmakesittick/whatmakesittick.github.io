import { Group, LineBasicMaterial, LineSegments, Mesh, Shape, Vector2 } from 'three';
import type { BufferGeometry } from 'three';
import { box } from '@core/scene/geometry/box';
import { extrudePlan, extrudeProfileAlongX, planShape } from '@core/scene/geometry/extrude';
import type { PlanPoint } from '@core/scene/geometry/extrude';
import { CASE, KEY, SOUNDBOARD } from '../../../model';
import { THEME } from '../../../theme';
import { FINISHES } from '../../finishes';
import { edgeGeometry } from '../../geometry/edges';
import { CASE_OUTLINE, insetOutline } from '../../geometry/outline';
import { cutPartMaterial, registeredMaterial } from '../context';
import type { PartContext } from '../context';
import { applyCut } from '../cut';
import { clipBehind, mergeParts } from './geometry';
import { GLOSS } from './gloss';

export const CHEEK = { depth: 0.17, top: 0.778, innerX: 0.615, round: 0.022 } as const;

const RIM_START = 2;
const MOULDING = { plinthTop: 0.656, capBottom: 0.986, plinthOut: 0.006, capOut: 0.009 } as const;
const BOTTOM_BOARD = 0.016;
const SCROLL = { run: 0.11, rise: 0.07 } as const;
const KEYSLIP = { bottom: 0.645, belowKeyTop: 0.012, front: 0.002, depth: 0.02 } as const;
const FALLBOARD = { bottom: 0.732, top: 0.842, frontZ: -0.128, lean: 0.026, thickness: 0.018 };
const EDGE_ANGLE_DEG = 25;
const EDGE_OPACITY = 0.6;

export const RIM_OUTLINE: readonly PlanPoint[] = [
  CASE_OUTLINE[0],
  CASE_OUTLINE[1],
  { x: CASE.rightX, z: -CHEEK.depth },
  ...CASE_OUTLINE.slice(RIM_START),
  { x: CASE.leftX, z: -CHEEK.depth },
];

function rimBand(outward: number, inward: number, bottom: number, top: number): BufferGeometry {
  const outer = insetOutline(RIM_OUTLINE, -outward).slice(RIM_START);
  const inner = insetOutline(RIM_OUTLINE, CASE.rimThickness + inward).slice(RIM_START);
  return extrudePlan(planShape([...outer, ...inner.reverse()]), bottom, top);
}

function rim(): BufferGeometry[] {
  return [
    rimBand(MOULDING.plinthOut, MOULDING.plinthOut, CASE.rimBottom, MOULDING.plinthTop),
    rimBand(0, 0, MOULDING.plinthTop, MOULDING.capBottom),
    rimBand(MOULDING.capOut, MOULDING.capOut, MOULDING.capBottom, CASE.rimTop),
  ];
}

function bottomBoard(): BufferGeometry {
  const inner = insetOutline(RIM_OUTLINE, CASE.rimThickness);
  const board = clipBehind(inner, SOUNDBOARD.bellyRailZ);
  return extrudePlan(planShape(board), CASE.rimBottom, CASE.rimBottom + BOTTOM_BOARD);
}

function cheekProfile(): Shape {
  const back = -CHEEK.depth;
  return new Shape()
    .moveTo(CASE.frontZ, CASE.rimBottom)
    .lineTo(CASE.frontZ, CHEEK.top - CHEEK.round)
    .quadraticCurveTo(CASE.frontZ, CHEEK.top, -CHEEK.round, CHEEK.top)
    .lineTo(back + SCROLL.run, CHEEK.top)
    .bezierCurveTo(back, CHEEK.top, back, CHEEK.top + SCROLL.rise, back, CASE.rimTop)
    .lineTo(back, CASE.rimBottom)
    .closePath();
}

function cheeks(): BufferGeometry[] {
  const profile = cheekProfile();
  return [
    extrudeProfileAlongX(profile, CASE.leftX, -CHEEK.innerX),
    extrudeProfileAlongX(profile, CHEEK.innerX, CASE.rightX),
  ];
}

function keyslip(): BufferGeometry {
  return box({
    minX: -CHEEK.innerX,
    maxX: CHEEK.innerX,
    minY: KEYSLIP.bottom,
    maxY: KEY.top - KEYSLIP.belowKeyTop,
    minZ: CASE.frontZ + KEYSLIP.front,
    maxZ: CASE.frontZ + KEYSLIP.front + KEYSLIP.depth,
  });
}

function fallboard(): BufferGeometry {
  const { bottom, top, frontZ, lean, thickness } = FALLBOARD;
  const profile = new Shape([
    new Vector2(frontZ, bottom),
    new Vector2(frontZ - lean, top),
    new Vector2(frontZ - lean - thickness, top),
    new Vector2(frontZ - thickness, bottom),
  ]);
  return extrudeProfileAlongX(profile, -CHEEK.innerX, CHEEK.innerX);
}

function glassEdges(context: PartContext, geometry: BufferGeometry): LineSegments {
  const material = registeredMaterial(
    context,
    'case',
    new LineBasicMaterial({ color: THEME.glass, transparent: true, opacity: EDGE_OPACITY }),
    false,
  );
  const edges = context.tracker.track(edgeGeometry(geometry, EDGE_ANGLE_DEG));
  return new LineSegments(edges, applyCut(material, context.cut, 'keep'));
}

export function buildShell(context: PartContext): Group {
  const geometry = context.tracker.track(
    mergeParts([...rim(), bottomBoard(), ...cheeks(), keyslip(), fallboard()]),
  );
  const shell = new Group();
  shell.name = 'shell';
  shell.add(
    new Mesh(geometry, cutPartMaterial(context, 'case', GLOSS.rim, 'remove')),
    new Mesh(geometry, cutPartMaterial(context, 'case', FINISHES.glass, 'keep')),
    glassEdges(context, geometry),
  );
  return shell;
}
