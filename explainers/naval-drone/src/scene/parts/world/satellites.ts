import { BoxGeometry, Group } from 'three';
import type { BufferGeometry, Object3D } from 'three';
import type { MaterialFinish } from '@core/scene/materials';
import { toRadians } from '@core/math';
import type { PartId } from '../../../ids';
import type { Vec3 } from '../../geometry/surface';
import { mergeParts, partMesh } from '../context';
import type { PartContext } from '../context';

export interface SatellitePart {
  object: Group;
  anchor: Object3D;
}

interface Spec {
  body: Vec3;
  wing: Vec3;
  wings: readonly number[];
  foil?: boolean;
}

const WING_TILT = toRadians(55);
const STARLINK: Spec = { body: [7, 0.7, 3.4], wing: [30, 0.2, 5.5], wings: [1] };
const BACKUP: Spec = { body: [5, 5, 5], wing: [14, 0.2, 4.5], wings: [-1, 1], foil: true };
const CELL_TINT = '#26385e';

const FINISH = { metalness: 0.85, roughness: 0.32, envMapIntensity: 1.6, fog: false } as const;
const FOIL: MaterialFinish = { ...FINISH, color: '#c9a65a' };
const WHITE: MaterialFinish = { ...FINISH, color: '#e8ebee', metalness: 0.2 };

function wing(spec: Spec, side: number): BufferGeometry {
  const panel = new BoxGeometry(...spec.wing);
  panel.rotateX(WING_TILT);
  panel.translate((side * (spec.body[0] + spec.wing[0])) / 2, 0, 0);
  return panel;
}

function build(
  context: PartContext,
  group: PartId,
  spec: Spec,
  panels: MaterialFinish,
): SatellitePart {
  const object = new Group();
  const body = partMesh(context, new BoxGeometry(...spec.body), group, spec.foil ? FOIL : WHITE);
  const wings = spec.wings.map((side) => wing(spec, side));
  object.add(body, partMesh(context, mergeParts(wings), group, panels));
  return { object, anchor: body };
}

export function createStarlinkSatellite(context: PartContext): SatellitePart {
  return build(context, 'satellite', STARLINK, panelFinish(context));
}

export function createBackupSatellite(context: PartContext): SatellitePart {
  return build(context, 'backupSatellite', BACKUP, panelFinish(context));
}

function panelFinish(context: PartContext): MaterialFinish {
  return { ...context.looks.panel, ...FINISH, color: CELL_TINT };
}
