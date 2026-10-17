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
  cutShellGeometry,
  fullShellGeometry,
  linerGeometry,
  mountGeometry,
  windingTexture,
  windowGhostGeometry,
} from '../../geometry/gear/tank';
import {
  GAUGE,
  KNOB_TOP,
  REGULATOR_X,
  braidTexture,
  dialGeometry,
  dialTexture,
  gaugePose,
  lineGeometry,
  needleAngle,
  needleGeometry,
  valveMetalGeometry,
} from '../../geometry/gear/valve';
import { partMesh } from '../context';
import type { PartContext } from '../context';
import { duskEnvironment } from '../../environment';
import {
  GEAR_FINISHES,
  GEAR_PAINT,
  braidFinish,
  dialFinish,
  reflectiveFinishes,
  shellFinish,
} from './gearFinishes';

const TANK_PART = 'tank';
const VALVE_PART = 'tankValve';

export const CORE_NAME = 'tankCore';
const FULL_SHELL_NAME = 'tankShell';
const CUT_SHELL_NAME = 'tankCutaway';

const MIN_CORE_LENGTH = 0.002;
const GHOST_ORDER = 1;
const LABEL_LIFT = 0.04;

const MOUNT_TONES = { strap: GEAR_PAINT.strap, bracket: GEAR_PAINT.bracket, pad: GEAR_PAINT.pad };
const VALVE_TONES = {
  aluminium: GEAR_PAINT.aluminium,
  bonnet: GEAR_PAINT.bonnet,
  knob: GEAR_PAINT.knob,
  brass: GEAR_PAINT.brass,
};

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

function buildCutaway(context: PartContext, shellLook: Material): Group {
  const { tankGhost } = reflectiveFinishes(duskEnvironment(context.tracker));
  const ghost = partMesh(context, windowGhostGeometry(), TANK_PART, tankGhost);
  ghost.renderOrder = GHOST_ORDER;
  const cut = new Group();
  cut.name = CUT_SHELL_NAME;
  cut.add(
    mesh(context, cutShellGeometry(), shellLook),
    partMesh(context, linerGeometry(), TANK_PART, GEAR_FINISHES.liner),
    ghost,
  );
  cut.visible = false;
  return cut;
}

function buildShell(context: PartContext, tank: Group): ShellViews {
  const { materials, tracker } = context;
  const env = duskEnvironment(tracker);
  const shellLook = materials.get(TANK_PART, shellFinish(tracker.track(windingTexture()), env));
  const full = mesh(context, fullShellGeometry(), shellLook);
  full.name = FULL_SHELL_NAME;
  const cut = buildCutaway(context, shellLook);
  const pressure = materials.get(TANK_PART, GEAR_FINISHES.corePressure);
  const empty = materials.get(TANK_PART, GEAR_FINISHES.coreEmpty);
  const coreMesh = mesh(context, coreGeometry(), pressure);
  coreMesh.name = CORE_NAME;
  const core = new Group();
  core.position.x = CORE_FRONT;
  core.visible = false;
  core.add(coreMesh);
  const { tankMounts } = reflectiveFinishes(env);
  const mounts = partMesh(context, mountGeometry(MOUNT_TONES), TANK_PART, tankMounts);
  tank.add(full, cut, core, mounts);
  return { full, cut, core, coreMesh, pressure, empty };
}

function buildValve(context: PartContext, valve: Group): Mesh {
  const { tracker } = context;
  const gauge = new Group();
  gauge.applyMatrix4(gaugePose());
  const needle = partMesh(context, needleGeometry(), VALVE_PART, GEAR_FINISHES.needle);
  needle.position.z = GAUGE.needleLift;
  const env = duskEnvironment(tracker);
  const dialLook = dialFinish(tracker.track(dialTexture()), env);
  gauge.add(partMesh(context, dialGeometry(), VALVE_PART, dialLook), needle);
  valve.add(
    partMesh(
      context,
      valveMetalGeometry(VALVE_TONES),
      VALVE_PART,
      reflectiveFinishes(env).valveMetal,
    ),
    partMesh(context, lineGeometry(), VALVE_PART, braidFinish(tracker.track(braidTexture()), env)),
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
