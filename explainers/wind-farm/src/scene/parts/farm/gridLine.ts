import { InstancedMesh, Matrix4, Mesh } from 'three';
import type { Group } from 'three';
import type { AssemblyState, Point } from '../../../ids';
import { GRID_LINE_END, PYLON_SPACING_M, SUBSTATION } from '../../../model';
import { FINISHES } from '../../finishes';
import { label, namedGroup } from '../context';
import type { PartContext } from '../context';
import { conductorGeometry } from './conductors';
import type { Span } from './conductors';
import {
  CONDUCTOR,
  CONDUCTOR_FINISH,
  CONDUCTOR_GLOW_FINISH,
  PYLON,
  PYLON_GLOW_FINISH,
} from './gridConstants';
import { GlowSwitch } from './glowSwitch';
import { groundRange } from './ground';
import { EARTH_WIRE, phaseAttachments, pylonGeometry, PYLON_TOP_M } from './pylon';
import { EXIT_HALF_SPAN_M, LINE_EXIT } from './substation';

const PART = 'gridLine';
const FOOT_HALF_M = 3.6;
const EXIT_EDGE_M = 1.5;

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

function wireSpans(towers: readonly Point[]): Span[] {
  const phases = phaseAttachments();
  const starts = [...exitPoints(phases.length), LINE_EXIT];
  return [...phases, EARTH_WIRE].flatMap((attachment, wire) => {
    const hangs = towers.map(([x, y, z]): Point => [
      x + attachment[0],
      y + attachment[1],
      z + attachment[2],
    ]);
    const route = [starts[wire], ...hangs];
    return route.slice(1).map((to, span): Span => [route[span], to]);
  });
}

export class GridLine {
  readonly group: Group;
  private readonly pylons: InstancedMesh;
  private readonly steel: GlowSwitch;
  private readonly wires: Mesh;
  private readonly conductors: GlowSwitch;

  constructor(context: PartContext) {
    this.group = namedGroup(PART);
    const towers = pylonSites();
    this.steel = new GlowSwitch(
      context,
      PART,
      { plain: FINISHES.gridSteel, glowing: PYLON_GLOW_FINISH },
      PYLON,
    );
    this.pylons = context.tracker.track(
      new InstancedMesh(context.tracker.track(pylonGeometry()), this.steel.material, towers.length),
    );
    this.pylons.name = PART;
    towers.forEach((tower, index) =>
      this.pylons.setMatrixAt(index, new Matrix4().makeTranslation(...tower)),
    );
    this.pylons.computeBoundingSphere();
    this.conductors = new GlowSwitch(
      context,
      PART,
      { plain: CONDUCTOR_FINISH, glowing: CONDUCTOR_GLOW_FINISH },
      { halfWidth: CONDUCTOR.radius, perMetre: CONDUCTOR.perMetre },
    );
    const wires = context.tracker.track(conductorGeometry(wireSpans(towers)));
    this.wires = new Mesh(wires, this.conductors.material);
    this.wires.name = PART;
    this.group.add(this.pylons, this.wires);
    const middle = towers[Math.floor(towers.length / 2)];
    label(context, PART, this.group, [middle[0], middle[1] + PYLON_TOP_M, middle[2]]);
  }

  setState(state: AssemblyState): void {
    this.steel.apply(this.pylons, state.view.cables);
    this.conductors.apply(this.wires, state.view.cables);
  }

  widen(cameraDistance: number): void {
    this.steel.widen(cameraDistance);
    this.conductors.widen(cameraDistance);
  }
}
