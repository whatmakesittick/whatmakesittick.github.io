import { BufferAttribute, BufferGeometry, LineBasicMaterial, LineSegments, Matrix4 } from 'three';
import type { Group, InstancedMesh, MeshStandardMaterial } from 'three';
import type { AssemblyState, Point } from '../../../ids';
import { GRID_LINE_END, PYLON_SPACING_M, SUBSTATION } from '../../../model';
import { THEME } from '../../../theme';
import { FINISHES } from '../../finishes';
import { instancedMesh, label, namedGroup, registeredMaterial } from '../context';
import type { PartContext } from '../context';
import { groundRange } from './ground';
import { EARTH_WIRE, phaseAttachments, pylonGeometry, PYLON_TOP_M } from './pylon';
import { EXIT_HALF_SPAN_M, LINE_EXIT } from './substation';

const PART = 'gridLine';
const FOOT_HALF_M = 3.6;
const SAG_M = 7;
const SAG_SAMPLES = 12;
const EXIT_EDGE_M = 1.5;
const XYZ = 3;
const PYLON_GLOW = { ...FINISHES.gridSteel, emissive: THEME.cable, emissiveIntensity: 0.3 };

export function pylonSites(): Point[] {
  const length = GRID_LINE_END.x - SUBSTATION.x;
  const spans = Math.ceil(length / PYLON_SPACING_M);
  return Array.from({ length: spans }, (_, index) => {
    const x = SUBSTATION.x + ((index + 1) * length) / spans;
    return [x, groundRange([x, GRID_LINE_END.z], FOOT_HALF_M).low, GRID_LINE_END.z];
  });
}

function exitPoints(count: number): Point[] {
  const [x, y, z] = LINE_EXIT;
  const half = EXIT_HALF_SPAN_M - EXIT_EDGE_M;
  return Array.from({ length: count }, (_, index): Point => [
    x,
    y,
    z - half + (2 * half * index) / Math.max(1, count - 1),
  ]);
}

export function sagPoint(from: Point, to: Point, share: number): Point {
  const sag = 4 * SAG_M * share * (1 - share);
  return [
    from[0] + (to[0] - from[0]) * share,
    from[1] + (to[1] - from[1]) * share - sag,
    from[2] + (to[2] - from[2]) * share,
  ];
}

function spanSegments(from: Point, to: Point): number[] {
  return Array.from({ length: SAG_SAMPLES }, (_, step) => [
    ...sagPoint(from, to, step / SAG_SAMPLES),
    ...sagPoint(from, to, (step + 1) / SAG_SAMPLES),
  ]).flat();
}

function wireSegments(towers: readonly Point[]): number[] {
  const phases = phaseAttachments();
  const starts = [...exitPoints(phases.length), LINE_EXIT];
  return [...phases, EARTH_WIRE].flatMap((attachment, wire) => {
    const hangs = towers.map(([x, y, z]): Point => [
      x + attachment[0],
      y + attachment[1],
      z + attachment[2],
    ]);
    const route = [starts[wire], ...hangs];
    return route.slice(1).flatMap((to, span) => spanSegments(route[span], to));
  });
}

export class GridLine {
  readonly group: Group;
  private readonly pylons: InstancedMesh;
  private readonly steel: MeshStandardMaterial;
  private readonly glow: MeshStandardMaterial;

  constructor(context: PartContext) {
    this.group = namedGroup(PART);
    const towers = pylonSites();
    this.pylons = instancedMesh(context, pylonGeometry(), PART, 'gridSteel', towers.length);
    this.pylons.name = PART;
    towers.forEach((tower, index) =>
      this.pylons.setMatrixAt(index, new Matrix4().makeTranslation(...tower)),
    );
    this.pylons.computeBoundingSphere();
    this.steel = this.pylons.material as MeshStandardMaterial;
    this.glow = context.materials.get(PART, PYLON_GLOW);
    const wires = new BufferGeometry();
    wires.setAttribute(
      'position',
      new BufferAttribute(new Float32Array(wireSegments(towers)), XYZ),
    );
    const material = registeredMaterial(
      context,
      PART,
      new LineBasicMaterial({ color: THEME.gridLine }),
    );
    const lines = new LineSegments(context.tracker.track(wires), material);
    lines.name = PART;
    this.group.add(this.pylons, lines);
    const middle = towers[Math.floor(towers.length / 2)];
    label(context, PART, this.group, [middle[0], middle[1] + PYLON_TOP_M, middle[2]]);
  }

  setState(state: AssemblyState): void {
    this.pylons.material = state.view.cables ? this.glow : this.steel;
  }
}
