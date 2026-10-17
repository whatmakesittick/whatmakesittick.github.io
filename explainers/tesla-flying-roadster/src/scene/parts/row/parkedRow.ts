import { Group, Matrix4 } from 'three';
import type { BufferGeometry, Mesh, Object3D } from 'three';
import { anchorAt } from '@core/scene/parts';
import type { PartId } from '../../../ids';
import { PARKED_ROW } from '../../../model/layout';
import type { ParkedKind, ParkedVehicle } from '../../../model/layout';
import { duskEnvironment } from '../../environment';
import { createPalette } from '../../geometry/body/palette';
import { HALF_TURN } from '../../geometry/turns';
import { CAR_MODEL } from '../../geometry/row/car';
import { PICKUP_MODEL } from '../../geometry/row/pickup';
import { TRUCK_MODEL } from '../../geometry/row/truck';
import type { BodyPaint } from '../../geometry/row/swatch';
import type { VehicleModel } from '../../geometry/row/vehicle';
import { mergeParts, partMesh } from '../context';
import type { PartContext } from '../context';
import { ROW_SWATCHES, rowFinish } from './finishes';
import { contactShadows } from './shadows';
import type { ShadowedVehicle } from './shadows';

export interface ParkedRowPart {
  readonly object: Group;
  readonly label: Object3D;
}

const PART: PartId = 'parkedRow';

const MODELS: Readonly<Record<ParkedKind, VehicleModel>> = {
  car: CAR_MODEL,
  pickup: PICKUP_MODEL,
  truck: TRUCK_MODEL,
};

const ROW_PAINTS: readonly BodyPaint[] = [
  'paintSlate',
  'paintCharcoal',
  'paintMoss',
  'paintOxblood',
];
const ROW_FACING: readonly number[] = [1, -1, 1, 1, -1];
const LABEL_LIFT = 0.3;

interface Placed extends ShadowedVehicle {
  paint: BodyPaint;
}

function placed(vehicle: ParkedVehicle, index: number): Placed {
  const facing = ROW_FACING[index % ROW_FACING.length];
  const placement = new Matrix4()
    .makeTranslation(vehicle.centreX, 0, 0)
    .multiply(new Matrix4().makeRotationY(facing > 0 ? 0 : HALF_TURN));
  return {
    vehicle,
    model: MODELS[vehicle.kind],
    placement,
    paint: ROW_PAINTS[index % ROW_PAINTS.length],
  };
}

function buildKey({ vehicle, paint }: Placed): string {
  return [vehicle.kind, vehicle.length, vehicle.width, vehicle.height, paint].join(':');
}

function rowMesh(context: PartContext, vehicles: readonly Placed[]): Mesh {
  const palette = createPalette(ROW_SWATCHES);
  palette.textures.forEach((texture) => context.tracker.track(texture));
  const builds = new Map<string, BufferGeometry>();
  const parts = vehicles.map((entry) => {
    const key = buildKey(entry);
    const geometry =
      builds.get(key) ?? entry.model.geometry(entry.vehicle, entry.paint, palette.uv);
    builds.set(key, geometry);
    return geometry.clone().applyMatrix4(entry.placement);
  });
  builds.forEach((geometry) => geometry.dispose());
  const finish = rowFinish(palette, duskEnvironment(context.tracker));
  return partMesh(context, mergeParts(parts), PART, finish);
}

function tallest(row: readonly ParkedVehicle[]): ParkedVehicle {
  return row.reduce((top, vehicle) => (vehicle.height > top.height ? vehicle : top));
}

export function createParkedRow(context: PartContext): ParkedRowPart {
  const vehicles = PARKED_ROW.map(placed);
  const object = new Group();
  object.add(rowMesh(context, vehicles), ...contactShadows(context, PART, vehicles));
  const top = tallest(PARKED_ROW);
  const label = anchorAt(object, top.centreX, top.height + LABEL_LIFT, 0);
  return { object, label };
}
