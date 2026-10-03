import { Group } from 'three';
import type { BufferGeometry, Object3D } from 'three';
import { box } from '@core/scene/geometry/box';
import { extrudePlan, roundedRectShape } from '@core/scene/geometry/extrude';
import { anchorAt } from '@core/scene/parts';
import { BATTERY, PLATE } from '../../constants';
import { FINISHES } from '../../finishes';
import { rod } from '../../geometry/rods';
import type { Vec3 } from '../../geometry/rods';
import { mergeParts, partMesh } from '../context';
import type { PartContext } from '../context';

type Triple = readonly [number, number, number];

const SIDES = [1, -1] as const;
const LEAD_DROOP = 0.55;

function centredBox(at: Triple, size: Triple): BufferGeometry {
  return box({
    minX: at[0] - size[0] / 2,
    maxX: at[0] + size[0] / 2,
    minY: at[1] - size[1] / 2,
    maxY: at[1] + size[1] / 2,
    minZ: at[2] - size[2] / 2,
    maxZ: at[2] + size[2] / 2,
  });
}

export interface BatteryBounds {
  x: readonly [number, number];
  y: readonly [number, number];
  z: readonly [number, number];
}

export function batteryBounds(): BatteryBounds {
  const [cx, cy, cz] = BATTERY.centre;
  const [length, height, width] = BATTERY.size;
  return {
    x: [cx - length / 2, cx + length / 2],
    y: [cy - height / 2, cy + height / 2],
    z: [cz - width / 2, cz + width / 2],
  };
}

function packGeometry(bounds: BatteryBounds): BufferGeometry {
  const shape = roundedRectShape(
    { minA: bounds.x[0], maxA: bounds.x[1], minB: bounds.z[0], maxB: bounds.z[1] },
    BATTERY.corner,
  );
  return extrudePlan(shape, bounds.y[0], bounds.y[1]);
}

function strapGeometry(bounds: BatteryBounds): BufferGeometry {
  const { strap } = BATTERY;
  const top = bounds.y[1] + strap.thickness / 2;
  const plateBottom = PLATE.gap;
  const outer = bounds.z[1] + strap.thickness / 2;
  const sideHeight = top - plateBottom;
  return mergeParts([
    centredBox(
      [strap.x, top, 0],
      [strap.width, strap.thickness, (outer + strap.thickness / 2) * 2],
    ),
    ...SIDES.map((side) =>
      centredBox(
        [strap.x, (top + plateBottom) / 2, side * outer],
        [strap.width, sideHeight, strap.thickness],
      ),
    ),
    centredBox([strap.x, top + strap.buckle[1] / 2, bounds.z[1] * 0.3], strap.buckle),
  ]);
}

function leadGeometry(bounds: BatteryBounds, offset: number, plugSide: number): BufferGeometry {
  const { lead, plug } = BATTERY;
  const start: Vec3 = [bounds.x[1], BATTERY.centre[1], offset];
  const plugEnd: Vec3 = [
    plug.at[0] - plug.size[0] / 2,
    plug.at[1] + plug.size[1] / 2,
    plug.at[2] + plugSide,
  ];
  const bend: Vec3 = [
    (start[0] + plugEnd[0]) / 2,
    start[1] - (start[1] - plugEnd[1]) * LEAD_DROOP,
    (start[2] + plugEnd[2]) / 2,
  ];
  return mergeParts([
    rod(start, bend, lead.radius, lead.segments),
    rod(bend, plugEnd, lead.radius, lead.segments),
  ]);
}

function balanceGeometry(bounds: BatteryBounds): BufferGeometry {
  const { balance, lead } = BATTERY;
  const start: Vec3 = [bounds.x[0], bounds.y[1] - 0.004, balance.at[2]];
  const end: Vec3 = [balance.at[0] - balance.size[0] / 2, balance.at[1], balance.at[2]];
  return rod(start, end, lead.radius * 0.8, lead.segments);
}

export interface BatteryPart {
  object: Group;
  label: Object3D;
}

export function buildBattery(context: PartContext): BatteryPart {
  const bounds = batteryBounds();
  const object = new Group();
  const { plug, balance, lead } = BATTERY;
  object.add(
    partMesh(context, packGeometry(bounds), 'battery', FINISHES.shrink),
    partMesh(context, strapGeometry(bounds), 'battery', FINISHES.rubber),
    partMesh(context, centredBox(plug.at, plug.size), 'battery', FINISHES.plug),
    partMesh(context, leadGeometry(bounds, lead.offsets[0], 0.003), 'battery', FINISHES.wireRed),
    partMesh(context, leadGeometry(bounds, lead.offsets[1], -0.003), 'battery', FINISHES.wireBlack),
    partMesh(context, centredBox(balance.at, balance.size), 'battery', FINISHES.balance),
    partMesh(context, balanceGeometry(bounds), 'battery', FINISHES.wireBlack),
  );
  const label = anchorAt(object, BATTERY.centre[0] + 0.03, bounds.y[1], 0);
  return { object, label };
}
