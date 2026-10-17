import { Group, Mesh } from 'three';
import type { BufferGeometry, Material, Object3D } from 'three';
import { clamp } from '@core/math';
import { anchorAt } from '@core/scene/parts';
import type { AssemblyState, PartId } from '../../../ids';
import { TANK, TANK_VALVE } from '../../../model/layout';
import {
  CORE_FRONT,
  CORE_LENGTH,
  SHELL,
  coreGeometry,
  cutEdgeGeometry,
  cutShellGeometry,
  fullShellGeometry,
  bracketGeometry,
  strapGeometry,
  strapPadGeometry,
  windingTexture,
  windowGhostGeometry,
} from '../../geometry/gear/tank';
import {
  GAUGE,
  KNOB_TOP,
  REGULATOR_X,
  bezelGeometry,
  blockGeometry,
  bonnetGeometry,
  braidTexture,
  bulkheadGeometry,
  dialGeometry,
  dialTexture,
  knobGeometry,
  lineGeometry,
  needleAngle,
  needleGeometry,
} from '../../geometry/gear/valve';
import { partMesh } from '../context';
import type { PartContext } from '../context';
import { GEAR_FINISHES, braidFinish, dialFinish, shellFinish } from './gearFinishes';

const TANK_PART = 'tank';
const VALVE_PART = 'tankValve';

export const CORE_NAME = 'tankCore';

const MIN_CORE_LENGTH = 0.002;
const GHOST_ORDER = 1;
const LABEL_LIFT = 0.04;

export interface TankUnit {
  readonly object: Group;
  readonly labels: ReadonlyMap<PartId, Object3D>;
  setState(state: AssemblyState): void;
}

interface ShellViews {
  full: Mesh;
  cut: Group;
  core: Group;
  coreMesh: Mesh;
  pressure: Material;
  empty: Material;
}

function mesh(context: PartContext, geometry: BufferGeometry, material: Material): Mesh {
  return new Mesh(context.tracker.track(geometry), material);
}

function buildShell(context: PartContext, tank: Group): ShellViews {
  const { materials, tracker } = context;
  const shellLook = materials.get(TANK_PART, shellFinish(tracker.track(windingTexture())));
  const fullGeometry = tracker.track(fullShellGeometry());
  const full = new Mesh(fullGeometry, shellLook);
  const liner = new Mesh(fullGeometry, materials.get(TANK_PART, GEAR_FINISHES.liner));
  liner.scale.setScalar(SHELL.linerScale);
  const ghost = partMesh(context, windowGhostGeometry(), TANK_PART, GEAR_FINISHES.tankGhost);
  ghost.renderOrder = GHOST_ORDER;
  const cut = new Group();
  cut.add(
    mesh(context, cutShellGeometry(), shellLook),
    partMesh(context, cutEdgeGeometry(), TANK_PART, GEAR_FINISHES.cutEdge),
    liner,
    ghost,
  );
  const pressure = materials.get(TANK_PART, GEAR_FINISHES.corePressure);
  const empty = materials.get(TANK_PART, GEAR_FINISHES.coreEmpty);
  const coreMesh = mesh(context, coreGeometry(), pressure);
  coreMesh.name = CORE_NAME;
  const core = new Group();
  core.position.x = CORE_FRONT;
  core.add(coreMesh);
  cut.visible = false;
  core.visible = false;
  tank.add(
    full,
    cut,
    core,
    partMesh(context, strapGeometry(), TANK_PART, GEAR_FINISHES.strap),
    partMesh(context, bracketGeometry(), TANK_PART, GEAR_FINISHES.bracket),
    partMesh(context, strapPadGeometry(), TANK_PART, GEAR_FINISHES.strapPad),
  );
  return { full, cut, core, coreMesh, pressure, empty };
}

function buildGauge(context: PartContext): { gauge: Group; needle: Mesh } {
  const gauge = new Group();
  gauge.position.set(...GAUGE.centre);
  gauge.rotation.x = GAUGE.tilt;
  const dialLook = dialFinish(context.tracker.track(dialTexture()));
  const needle = partMesh(context, needleGeometry(), VALVE_PART, GEAR_FINISHES.needle);
  needle.position.z = GAUGE.needleLift;
  gauge.add(
    partMesh(context, bezelGeometry(), VALVE_PART, GEAR_FINISHES.aluminium),
    partMesh(context, dialGeometry(), VALVE_PART, dialLook),
    needle,
  );
  return { gauge, needle };
}

function buildValve(context: PartContext, valve: Group): Mesh {
  const braidLook = braidFinish(context.tracker.track(braidTexture()));
  const { gauge, needle } = buildGauge(context);
  valve.add(
    partMesh(context, blockGeometry(), VALVE_PART, GEAR_FINISHES.aluminium),
    partMesh(context, bonnetGeometry(), VALVE_PART, GEAR_FINISHES.bonnet),
    partMesh(context, knobGeometry(), VALVE_PART, GEAR_FINISHES.knob),
    partMesh(context, lineGeometry(), VALVE_PART, braidLook),
    partMesh(context, bulkheadGeometry(), VALVE_PART, GEAR_FINISHES.brass),
    gauge,
  );
  return needle;
}

export function coreLength(massShare: number): number {
  return clamp(massShare, 0, 1) * CORE_LENGTH;
}

export function createTank(context: PartContext): TankUnit {
  const object = new Group();
  const tank = new Group();
  tank.position.set(...TANK.centre);
  const valve = new Group();
  valve.position.set(...TANK_VALVE);
  object.add(tank, valve);
  const shell = buildShell(context, tank);
  const needle = buildValve(context, valve);
  const labels = new Map<PartId, Object3D>([
    [TANK_PART, anchorAt(tank, 0, SHELL.radius + LABEL_LIFT, 0)],
    [VALVE_PART, anchorAt(valve, REGULATOR_X, KNOB_TOP + LABEL_LIFT, 0)],
  ]);
  return {
    object,
    labels,
    setState(state) {
      const cutaway = state.view.tank;
      const length = coreLength(state.tank.massShare);
      shell.full.visible = !cutaway;
      shell.cut.visible = cutaway;
      shell.core.visible = cutaway && length > MIN_CORE_LENGTH;
      shell.core.scale.x = Math.max(length, MIN_CORE_LENGTH);
      shell.coreMesh.material = state.tank.empty ? shell.empty : shell.pressure;
      needle.rotation.z = needleAngle(clamp(state.tank.massShare, 0, 1));
    },
  };
}
