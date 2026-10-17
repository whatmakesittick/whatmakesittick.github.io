import { Matrix4, Mesh } from 'three';
import type { BufferGeometry } from 'three';
import type { PartId } from '../../../ids';
import type { ParkedVehicle } from '../../../model/layout';
import {
  shadowPadMaterial,
  shadowPadPlane,
  shadowPadTexture,
} from '../../geometry/effects/shadowPad';
import type { ShadowPadLayout } from '../../geometry/effects/shadowPad';
import { wheelPrints } from '../../geometry/row/vehicle';
import type { VehicleModel } from '../../geometry/row/vehicle';
import { mergeParts, registered } from '../context';
import type { PartContext } from '../context';

export interface ShadowedVehicle {
  vehicle: ParkedVehicle;
  model: VehicleModel;
  placement: Matrix4;
}

const SHADOW = {
  size: [1.2, 1.5],
  pad: [0.97, 0.9],
  padCorner: 0.35,
  padBlur: 0.5,
  padAlpha: 0.82,
  tyre: [1.4, 1.1],
  tyreAlpha: 0.92,
  lift: 0.011,
  driftPerMetre: [0.08, -0.05],
} as const;

function sizeKey({ kind, length, width, height }: ParkedVehicle): string {
  return [kind, length, width, height].join(':');
}

function shadowLayout(model: VehicleModel, vehicle: ParkedVehicle): ShadowPadLayout {
  const prints = wheelPrints(model, vehicle);
  const [first] = prints;
  return {
    size: [vehicle.length * SHADOW.size[0], vehicle.width * SHADOW.size[1]],
    pad: [vehicle.length * SHADOW.pad[0], vehicle.width * SHADOW.pad[1]],
    padCorner: SHADOW.padCorner,
    padBlur: SHADOW.padBlur,
    padAlpha: SHADOW.padAlpha,
    spots: prints.map((print) => [print.x, print.z] as const),
    spot: [first.radius * SHADOW.tyre[0], first.width * SHADOW.tyre[1]],
    spotAlpha: SHADOW.tyreAlpha,
  };
}

function shadowQuad(layout: ShadowPadLayout, entry: ShadowedVehicle): BufferGeometry {
  const { height } = entry.vehicle;
  const drift = new Matrix4().makeTranslation(
    SHADOW.driftPerMetre[0] * height,
    SHADOW.lift,
    SHADOW.driftPerMetre[1] * height,
  );
  return shadowPadPlane(layout).applyMatrix4(entry.placement).applyMatrix4(drift);
}

function shadowMesh(context: PartContext, group: PartId, entries: ShadowedVehicle[]): Mesh {
  const layout = shadowLayout(entries[0].model, entries[0].vehicle);
  const material = registered(
    context,
    group,
    shadowPadMaterial(context.tracker.track(shadowPadTexture(layout))),
  );
  const quads = entries.map((entry) => shadowQuad(layout, entry));
  return new Mesh(context.tracker.track(mergeParts(quads)), material);
}

export function contactShadows(
  context: PartContext,
  group: PartId,
  vehicles: readonly ShadowedVehicle[],
): Mesh[] {
  const bySize = new Map<string, ShadowedVehicle[]>();
  vehicles.forEach((entry) => {
    const key = sizeKey(entry.vehicle);
    bySize.set(key, [...(bySize.get(key) ?? []), entry]);
  });
  return [...bySize.values()].map((entries) => shadowMesh(context, group, entries));
}
