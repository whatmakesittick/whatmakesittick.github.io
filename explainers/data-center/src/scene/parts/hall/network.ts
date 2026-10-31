import { BoxGeometry, Color, Matrix4, MeshBasicMaterial, MeshStandardMaterial } from 'three';
import type { Group } from 'three';
import type { MaterialFinish } from '@core/scene/materials';
import { STRUCTURE_GROUP } from '@core/scene/materials';
import type { Extent } from '@core/scene/regions';
import type { PartId, Point } from '../../../ids';
import {
  CABLE_TRAY_Y,
  FIBRE_ENTRY,
  LEAF_RACKS,
  NETWORK_RACK,
  ROWS,
  ROW_LENGTH_M,
  ROW_Z,
  SPINE_RACKS,
  WALL_THICKNESS,
  boxTop,
} from '../../../model';
import type { BoxSpec, Facing } from '../../../model';
import { FINISHES } from '../../finishes';
import { label, namedGroup, registeredMaterial } from '../context';
import type { PartContext } from '../context';
import { CHANNEL_Y } from './ceiling';
import type { CeilingGrid } from './ceiling';
import { cabinetGeometry, cabinetMaterials, frontPoint, panelTopOf } from './cabinet';
import type { CabinetSize } from './cabinet';
import { instances } from './instances';
import {
  along,
  facingPlacement,
  frontPlane,
  hashed,
  openBox,
  rodBetween,
  rodGeometry,
  runMatrix,
} from './shapes';
import { networkFrontTexture } from './textures';

const NETWORK_CABINET: CabinetSize = { ...NETWORK_RACK, recess: 0.08 };
const NETWORK_FRAME: MaterialFinish = { color: '#15181b', roughness: 0.6, metalness: 0.3 };
const RACEWAY: MaterialFinish = { color: '#d9ad2f', roughness: 0.6, metalness: 0.05 };
const UNITS = 22;
const LINK_XS = [-0.22, -0.13, -0.04, 0.05, 0.14, 0.23] as const;
const LINK_SIZE: Point = [0.01, 0.006, 1];
const LINK_TINTS = [new Color('#6dff9e'), new Color('#b8ffcf'), new Color('#ffb547')] as const;
const TRAY = { wide: 0.3, rail: 0.08, railM: 0.012, rung: 0.015, pitch: 0.3 } as const;
const TRAY_INSET_M = 0.38;
const TRUNK_GAP_M = 0.35;
const HANGER_PITCH_M = 2.4;
const HANGER_SIDES = 3;
const DUCT = { wide: 0.14, tall: 0.08, entry: 0.3 } as const;
const STRIP = { wide: 0.12, tall: 0.05, glow: 0.08 } as const;
const COLD_AISLE_Z = [-8.6, -4.236, 0, 4.236, 8.6] as const;
const STRIP_REACH_M = 1;
const FIBRE_LINES = [10.8, 13.0] as const;
const RACEWAY_LIFT_M = 0.01;
const SPINE_DROP_SHARE = 0.6;

interface Tray {
  axis: 'x' | 'z';
  from: number;
  to: number;
  at: number;
}

function networkFacing(box: BoxSpec): Facing {
  return box.base[2] < 0 ? 1 : -1;
}

function linkLights(cabinets: readonly { box: BoxSpec; facing: Facing }[], salt: number) {
  const unit = panelTopOf(NETWORK_CABINET) / UNITS;
  const matrices: Matrix4[] = [];
  const colours: Color[] = [];
  const scale = new Matrix4().makeScale(...LINK_SIZE);
  cabinets.forEach(({ box, facing }, rackIndex) => {
    const place = facingPlacement(box.base, facing);
    for (let index = 1; index < UNITS - 1; index += 1) {
      if (index % 5 === 0) continue;
      const y = panelTopOf(NETWORK_CABINET) - index * unit - 0.012;
      LINK_XS.forEach((x, light) => {
        const roll = hashed(rackIndex * 200 + index * 8 + light, salt);
        if (roll < 0.12) return;
        const tint = roll > 0.985 ? LINK_TINTS[2] : LINK_TINTS[roll > 0.8 ? 1 : 0];
        const offset = new Matrix4().makeTranslation(...frontPoint(NETWORK_CABINET, x, y, 0.004));
        matrices.push(place.clone().multiply(offset).multiply(scale));
        colours.push(tint);
      });
    }
  });
  return { matrices, colours };
}

function switchRacks(
  context: PartContext,
  parent: Group,
  id: PartId,
  boxes: readonly BoxSpec[],
  facings: readonly Facing[],
  labelAt: Point,
): Group {
  const group = namedGroup(id, parent);
  const cabinets = boxes.map((box, index) => ({ box, facing: facings[index] }));
  const front = context.tracker.track(networkFrontTexture());
  const materials = cabinetMaterials(context, id, front, context.materials.get(id, NETWORK_FRAME));
  group.add(
    instances(
      context,
      cabinetGeometry(NETWORK_CABINET),
      materials,
      cabinets.map(({ box, facing }) => facingPlacement(box.base, facing)),
    ),
  );
  const { matrices, colours } = linkLights(cabinets, id === 'spineSwitches' ? 1 : 2);
  const light = registeredMaterial(context, id, new MeshBasicMaterial({ color: '#ffffff' }));
  group.add(instances(context, frontPlane(), light, matrices, colours));
  label(context, id, group, labelAt);
  return group;
}

function trays(): Tray[] {
  const rows = ROWS.map((row) => ({
    axis: 'x' as const,
    from: row.startX - TRAY.wide,
    to: row.startX + ROW_LENGTH_M + TRUNK_GAP_M,
    at: row.z + row.facing * TRAY_INSET_M,
  }));
  const trunkX = [0, 1].map((block) => {
    const row = ROWS.find((spec) => spec.block === block) ?? ROWS[0];
    return row.startX + ROW_LENGTH_M + TRUNK_GAP_M;
  });
  const north = ROW_Z[0] - TRAY_INSET_M - TRAY.wide;
  const south = ROW_Z[ROW_Z.length - 1] + TRAY_INSET_M + TRAY.wide;
  return [
    ...rows,
    ...trunkX.map((at) => ({ axis: 'z' as const, from: north, to: south, at })),
    { axis: 'x', from: trunkX[0], to: ROWS[ROWS.length - 1].startX - TRAY.wide, at: 0 },
  ];
}

export function networkLines(): { fixed: number[]; lamps: number[] } {
  const edges = trays()
    .filter((tray) => tray.axis === 'x')
    .flatMap((tray) => [tray.at - TRAY.wide / 2, tray.at + TRAY.wide / 2]);
  return { fixed: [...edges, ...FIBRE_LINES], lamps: COLD_AISLE_Z.filter((z) => z !== 0) };
}

function trayParts(tray: Tray, grid: CeilingGrid) {
  const box = (lengthwise: Extent, y: Extent, across: Extent) =>
    tray.axis === 'x' ? runMatrix(lengthwise, y, across) : runMatrix(across, y, lengthwise);
  const half = TRAY.wide / 2;
  const railY: Extent = [CABLE_TRAY_Y, CABLE_TRAY_Y + TRAY.rail];
  const length: Extent = [tray.from, tray.to];
  const rails = [-half, half - TRAY.railM].map((edge) =>
    box(length, railY, [tray.at + edge, tray.at + edge + TRAY.railM]),
  );
  const count = Math.floor((tray.to - tray.from) / TRAY.pitch);
  const rungs = Array.from({ length: count }, (_, index) =>
    box(
      along(tray.from + (index + 0.5) * TRAY.pitch, TRAY.rung * 2),
      [CABLE_TRAY_Y, CABLE_TRAY_Y + TRAY.rung],
      [tray.at - half, tray.at + half],
    ),
  );
  const stations =
    tray.axis === 'x'
      ? Array.from(
          { length: Math.max(1, Math.floor((tray.to - tray.from) / HANGER_PITCH_M)) },
          (_, index) => tray.from + (index + 0.5) * HANGER_PITCH_M,
        )
      : grid.hangers(tray.from, tray.to);
  const hangers = stations.flatMap((along) =>
    [-half, half].map((edge) => {
      const point = (y: number): Point =>
        tray.axis === 'x' ? [along, y, tray.at + edge] : [tray.at + edge, y, along];
      return rodBetween(point(CABLE_TRAY_Y), point(CHANNEL_Y), 0.007);
    }),
  );
  return { rails, rungs, axis: tray.axis, hangers };
}

function buildTrays(context: PartContext, parent: Group, grid: CeilingGrid): void {
  const group = namedGroup('cableTrays', parent);
  const parts = trays().map((tray) => trayParts(tray, grid));
  const material = (finish: MaterialFinish) => context.materials.get(STRUCTURE_GROUP, finish);
  const steel = material(FINISHES.traySteel);
  const rungs = (axis: Tray['axis']) =>
    parts.filter((part) => part.axis === axis).flatMap((part) => part.rungs);
  group.add(
    instances(
      context,
      new BoxGeometry(),
      steel,
      parts.flatMap((part) => part.rails),
    ),
    instances(context, openBox(['pz', 'nz']), steel, rungs('x')),
    instances(context, openBox(['px', 'nx']), steel, rungs('z')),
    instances(
      context,
      rodGeometry(HANGER_SIDES, true),
      material(FINISHES.steel),
      parts.flatMap((part) => part.hangers),
    ),
  );
}

function buildLightStrips(context: PartContext, parent: Group): void {
  const strips = [0, 1].flatMap((block) => {
    const row = ROWS.find((spec) => spec.block === block) ?? ROWS[0];
    const x: Extent = [row.startX - STRIP_REACH_M, row.startX + ROW_LENGTH_M + STRIP_REACH_M];
    return COLD_AISLE_Z.map((z) => ({ x, z }));
  });
  const housing = strips.map(({ x, z }) =>
    runMatrix(x, [CHANNEL_Y - STRIP.tall, CHANNEL_Y], along(z, STRIP.wide)),
  );
  const glow = strips.map(({ x, z }) =>
    runMatrix(x, along(CHANNEL_Y - STRIP.tall, 0.004), along(z, STRIP.glow)),
  );
  const lamp = registeredMaterial(
    context,
    STRUCTURE_GROUP,
    new MeshStandardMaterial({ color: '#f4f1e8', emissive: '#fff4dc', emissiveIntensity: 0.55 }),
  );
  parent.add(
    instances(
      context,
      new BoxGeometry(),
      context.materials.get(STRUCTURE_GROUP, FINISHES.steelDark),
      housing,
    ),
    instances(context, new BoxGeometry(), lamp, glow),
  );
}

function buildFibre(context: PartContext, parent: Group, grid: CeilingGrid): void {
  const group = namedGroup('fibreEntry', parent);
  const [x, y, wallZ] = FIBRE_ENTRY;
  const riseZ = wallZ - WALL_THICKNESS - DUCT.entry;
  const trayY = CABLE_TRAY_Y + TRAY.rail + RACEWAY_LIFT_M + DUCT.tall / 2;
  const spineX = SPINE_RACKS[0].base[0];
  const duct = (from: Point, to: Point, size: number) =>
    runMatrix(
      along((from[0] + to[0]) / 2, Math.abs(to[0] - from[0]) + size),
      along((from[1] + to[1]) / 2, Math.abs(to[1] - from[1]) + size),
      along((from[2] + to[2]) / 2, Math.abs(to[2] - from[2]) + size),
    );
  const spineTop = NETWORK_RACK.height;
  const legs = [
    runMatrix(along(x, DUCT.entry), [0, y + DUCT.entry / 2], [riseZ - DUCT.wide / 2, wallZ]),
    duct([x, y, riseZ], [x, trayY, riseZ], DUCT.wide),
    duct([x, trayY, riseZ], [x, trayY, 0], DUCT.wide),
    duct([x, trayY, 0], [spineX, trayY, 0], DUCT.wide),
    ...SPINE_RACKS.flatMap((box) => {
      const z = box.base[2] * SPINE_DROP_SHARE;
      return [
        duct([spineX, trayY, 0], [spineX, trayY, z], DUCT.wide),
        duct([spineX, trayY, z], [spineX, spineTop + DUCT.wide / 2, z], DUCT.wide),
      ];
    }),
  ];
  const hangers = grid
    .hangers(DUCT.wide, riseZ)
    .map((z) => rodBetween([x, trayY + DUCT.tall / 2, z], [x, CHANNEL_Y, z], 0.007));
  group.add(
    instances(
      context,
      rodGeometry(4),
      context.materials.get('fibreEntry', FINISHES.steel),
      hangers,
    ),
  );
  group.add(
    instances(context, new BoxGeometry(), context.materials.get('fibreEntry', RACEWAY), legs),
  );
  label(context, 'fibreEntry', group, [x, y + DUCT.entry, riseZ]);
}

export function buildNetwork(context: PartContext, parent: Group, grid: CeilingGrid): void {
  switchRacks(
    context,
    parent,
    'spineSwitches',
    SPINE_RACKS,
    SPINE_RACKS.map(networkFacing),
    boxTop(SPINE_RACKS[1]),
  );
  switchRacks(
    context,
    parent,
    'leafSwitches',
    LEAF_RACKS,
    ROWS.map((row) => row.facing),
    boxTop(LEAF_RACKS[3]),
  );
  buildFibre(context, parent, grid);
  buildTrays(context, parent, grid);
  buildLightStrips(context, parent);
}
