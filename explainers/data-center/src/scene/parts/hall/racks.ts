import { Color, Matrix4, MeshBasicMaterial, MeshStandardMaterial } from 'three';
import type { Group, InstancedMesh } from 'three';
import type { CoolingId, Point } from '../../../ids';
import {
  HALL_RACKS,
  RACK,
  RACK_STACK,
  ROW_PIPE,
  SUBJECT_ROW_INDEX,
  SUBJECT_SLOT,
  UPPER_COMPUTE_TRAYS,
  LOWER_COMPUTE_TRAYS,
  COMPUTE_TRAY_PITCH,
} from '../../../model';
import type { RackSpec } from '../../../model';
import { FINISHES } from '../../finishes';
import { label, namedGroup, registeredMaterial } from '../context';
import type { PartContext } from '../context';
import { cabinetBackZ, cabinetGeometry, cabinetMaterials, panelTopOf } from './cabinet';
import type { CabinetSize } from './cabinet';
import { instances } from './instances';
import {
  boxAt,
  frontPlane,
  facingPlacement,
  hashed,
  merged,
  rodGeometryBetween,
  tubeThrough,
} from './shapes';
import { perforatedTexture, rackFrontTexture } from './textures';

export const RACK_CABINET: CabinetSize = { ...RACK, recess: 0.13 };
export const MANIFOLD_LOCAL = { x: 0.22, z: 0.486 } as const;
export const SUPPLY_PIPE_OFFSET = 0.15;

const SWAP_SECONDS = 0.9;
const NEAR_M = 80;
const MANIFOLD_R = 0.022;
const STUB_R = 0.008;
const HOSE_R = 0.016;
const LIGHT_SIZE: Point = [0.012, 0.007, 1];
const LIGHT_X = -0.236;
const SECOND_LIGHT_X = -0.214;
const AMBER_SHARE = 0.04;
const DARK_SHARE = 0.06;
const SECOND_SHARE = 0.3;
const DOOR_M = 0.01;
const DOOR_GAP_M = 0.002;
const SWITCH_TRAYS = 9;
const LIGHT_TINTS = {
  green: new Color('#6dff9e'),
  amber: new Color('#ffb547'),
  blue: new Color('#7cc4ff'),
} as const;

interface Ease {
  hoses: Group;
  doors: Group;
  lights: Record<CoolingId, InstancedMesh>;
}

export interface Racks {
  group: Group;
  setCooling(cooling: CoolingId): void;
  step(delta: number, cameraDistance: number): boolean;
}

function otherRacks(): readonly RackSpec[] {
  return HALL_RACKS.filter(({ row, slot }) => row !== SUBJECT_ROW_INDEX || slot !== SUBJECT_SLOT);
}

function unitCentres(): number[] {
  const shelves = (from: number) => [0, 1, 2].map((index) => from + (index + 0.5) * 0.08);
  const trays = (from: number, count: number) =>
    Array.from({ length: count }, (_, index) => from + (index + 0.5) * COMPUTE_TRAY_PITCH);
  const [switchFrom, switchTo] = RACK_STACK.switchTrays;
  const switchPitch = (switchTo - switchFrom) / SWITCH_TRAYS;
  return [
    ...shelves(RACK_STACK.lowerShelves[0]),
    ...trays(RACK_STACK.lowerCompute[0], LOWER_COMPUTE_TRAYS),
    ...Array.from({ length: SWITCH_TRAYS }, (_, index) => switchFrom + (index + 0.5) * switchPitch),
    ...trays(RACK_STACK.upperCompute[0], UPPER_COMPUTE_TRAYS),
    ...shelves(RACK_STACK.upperShelves[0]),
  ];
}

function computeTrayCentres(): number[] {
  return unitCentres().filter(
    (y) =>
      (y > RACK_STACK.lowerCompute[0] && y < RACK_STACK.lowerCompute[1]) ||
      (y > RACK_STACK.upperCompute[0] && y < RACK_STACK.upperCompute[1]),
  );
}

function tint(index: number): Color | undefined {
  const roll = hashed(index, 3);
  if (roll < DARK_SHARE) return undefined;
  if (roll < DARK_SHARE + AMBER_SHARE) return LIGHT_TINTS.amber;
  return roll > 0.97 ? LIGHT_TINTS.blue : LIGHT_TINTS.green;
}

function lightMesh(context: PartContext, racks: readonly RackSpec[], frontZ: number) {
  const matrices: Matrix4[] = [];
  const colours: Color[] = [];
  const unit = new Matrix4().makeScale(...LIGHT_SIZE);
  const centres = unitCentres();
  racks.forEach((rack, rackIndex) => {
    const place = facingPlacement(rack.base, rack.facing);
    centres.forEach((y, unitIndex) => {
      const index = rackIndex * centres.length + unitIndex;
      const xs = hashed(index, 7) < SECOND_SHARE ? [LIGHT_X, SECOND_LIGHT_X] : [LIGHT_X];
      xs.forEach((x, light) => {
        const colour = light === 0 ? tint(index) : LIGHT_TINTS.green;
        if (!colour) return;
        const offset = new Matrix4().makeTranslation(x, y, frontZ);
        matrices.push(place.clone().multiply(offset).multiply(unit));
        colours.push(colour);
      });
    });
  });
  const material = registeredMaterial(
    context,
    'racks',
    new MeshBasicMaterial({ color: '#ffffff' }),
  );
  return instances(context, frontPlane(), material, matrices, colours);
}

function hoseGeometry(side: -1 | 1) {
  const x = side * MANIFOLD_LOCAL.x;
  const z = MANIFOLD_LOCAL.z;
  const back = cabinetBackZ(RACK_CABINET);
  const top = panelTopOf(RACK_CABINET) - 0.06;
  const supplyZ = z + SUPPLY_PIPE_OFFSET;
  const pipeY = ROW_PIPE.y;
  const riser =
    side < 0
      ? tubeThrough(
          [
            [x, top - 0.04, z],
            [x, top + 0.24, z],
            [x, pipeY - 0.12, z + 0.08],
            [x, pipeY, supplyZ],
          ],
          HOSE_R,
        )
      : rodGeometryBetween([x, top - 0.04, z], [x, pipeY, z], HOSE_R, 8);
  return merged([
    rodGeometryBetween([x, 0.3, z], [x, top, z], MANIFOLD_R, 8),
    riser,
    ...computeTrayCentres().map((y) =>
      rodGeometryBetween([x * 0.55, y, back], [x, y, z], STUB_R, 4),
    ),
  ]);
}

function doorGeometry() {
  const inner = RACK.width / 2 - DOOR_GAP_M;
  const half = RACK.depth / 2;
  const y: [number, number] = [0.02, panelTopOf(RACK_CABINET)];
  return merged([
    boxAt([-inner, inner], y, [-half - DOOR_GAP_M - DOOR_M, -half - DOOR_GAP_M]),
    boxAt([-inner, inner], y, [half + DOOR_GAP_M, half + DOOR_GAP_M + DOOR_M]),
  ]);
}

function pivot(parent: Group, name: string, y: number): Group {
  const group = namedGroup(name, parent);
  group.position.y = y;
  return group;
}

function hung(group: Group, mesh: InstancedMesh): void {
  mesh.position.y = -group.position.y;
  group.add(mesh);
}

function approach(value: number, target: number, step: number): number {
  return value < target ? Math.min(target, value + step) : Math.max(target, value - step);
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function buildRacks(context: PartContext, parent: Group): Racks {
  const group = namedGroup('racks', parent);
  const racks = otherRacks();
  const placements = racks.map((rack) => facingPlacement(rack.base, rack.facing));
  const front = context.tracker.track(rackFrontTexture());
  group.add(
    instances(
      context,
      cabinetGeometry(RACK_CABINET),
      cabinetMaterials(context, 'racks', front),
      placements,
    ),
  );
  const ease: Ease = {
    hoses: pivot(group, 'rackHoses', ROW_PIPE.y),
    doors: pivot(group, 'rackDoors', panelTopOf(RACK_CABINET)),
    lights: {
      liquid: lightMesh(context, racks, -RACK.depth / 2 + 0.008),
      air: lightMesh(context, racks, -RACK.depth / 2 - DOOR_M - 0.006),
    },
  };
  const finish = (name: 'pipeSupply' | 'pipeReturn') =>
    context.materials.get('racks', FINISHES[name]);
  hung(ease.hoses, instances(context, hoseGeometry(-1), finish('pipeSupply'), placements));
  hung(ease.hoses, instances(context, hoseGeometry(1), finish('pipeReturn'), placements));
  const door = registeredMaterial(
    context,
    'racks',
    new MeshStandardMaterial({
      map: context.tracker.track(perforatedTexture()),
      roughness: 0.55,
      metalness: 0.4,
    }),
  );
  hung(ease.doors, instances(context, doorGeometry(), door, placements));
  group.add(ease.lights.liquid, ease.lights.air);
  const anchorRack = HALL_RACKS.find((rack) => rack.row === 3 && rack.slot === 6) ?? racks[0];
  label(context, 'racks', group, [anchorRack.base[0], RACK.height, anchorRack.base[2]]);

  let mix = -1;
  let target = 0;
  let near = true;
  const apply = () => {
    const hoses = clamp01(1 - 2 * mix);
    const doors = clamp01(2 * mix - 1);
    ease.hoses.scale.y = Math.max(hoses, 1e-3);
    ease.hoses.visible = near && hoses > 0;
    ease.doors.scale.y = Math.max(doors, 1e-3);
    ease.doors.visible = doors > 0;
    ease.lights.liquid.visible = near && mix < 0.5;
    ease.lights.air.visible = near && mix >= 0.5;
  };
  return {
    group,
    setCooling(cooling) {
      target = cooling === 'air' ? 1 : 0;
      if (mix < 0) {
        mix = target;
        apply();
      }
    },
    step(delta, cameraDistance) {
      const nearNow = cameraDistance < NEAR_M;
      const moving = mix !== target;
      if (!moving && nearNow === near) return false;
      near = nearNow;
      mix = approach(mix, target, delta / SWAP_SECONDS);
      apply();
      return mix !== target;
    },
  };
}
