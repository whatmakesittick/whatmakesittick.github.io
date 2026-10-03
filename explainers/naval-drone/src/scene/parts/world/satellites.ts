import { BoxGeometry, Group, Mesh, SphereGeometry } from 'three';
import type { BufferGeometry, Object3D } from 'three';
import type { MaterialFinish } from '@core/scene/materials';
import { toRadians } from '@core/math';
import type { PartId } from '../../../ids';
import type { Vec3 } from '../../geometry/surface';
import { mergeParts, partMesh } from '../context';
import type { PartContext } from '../context';
import { canvasTexture } from '../surfaces';

export interface SatellitePart {
  object: Group;
  anchor: Object3D;
}

interface Spec {
  body: Vec3;
  wing: Vec3;
  wings: readonly number[];
  dish?: { radius: number; at: Vec3 };
}

const WING_TILT = toRadians(55);
const STARLINK: Spec = { body: [7, 0.7, 3.4], wing: [30, 0.2, 5.5], wings: [1] };
const BACKUP: Spec = {
  body: [5, 5, 5],
  wing: [14, 0.2, 4.5],
  wings: [-1, 1],
  dish: { radius: 2.2, at: [0, -2.6, 1.5] },
};
const DISH_SEGMENTS = [20, 8] as const;
const DISH_SPAN = Math.PI / 2;
const CELLS = { size: [256, 64] as const, columns: 24, rows: 5, cell: '#1d2c4c', line: '#8b97a8' };

const FINISH = { metalness: 0.85, roughness: 0.32, envMapIntensity: 1.6, fog: false } as const;
const FOIL: MaterialFinish = { ...FINISH, color: '#c9a65a' };
const FRAME: MaterialFinish = { ...FINISH, color: '#b8bec5' };
const WHITE: MaterialFinish = { ...FINISH, color: '#e8ebee', metalness: 0.2 };

function cellTexture() {
  const { size, columns, rows, cell, line } = CELLS;
  return canvasTexture(size[0], size[1], (pen, width, height) => {
    pen.fillStyle = line;
    pen.fillRect(0, 0, width, height);
    pen.fillStyle = cell;
    const w = width / columns;
    const h = height / rows;
    for (let column = 0; column < columns; column += 1) {
      for (let row = 0; row < rows; row += 1)
        pen.fillRect(column * w + 1, row * h + 1, w - 2, h - 2);
    }
  });
}

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
  const body = partMesh(context, new BoxGeometry(...spec.body), group, spec.dish ? FOIL : WHITE);
  const wings = spec.wings.map((side) => wing(spec, side));
  object.add(body, partMesh(context, mergeParts(wings), group, panels));
  if (spec.dish) {
    const dish = new SphereGeometry(
      spec.dish.radius,
      ...DISH_SEGMENTS,
      0,
      Math.PI * 2,
      0,
      DISH_SPAN,
    );
    dish.rotateX(Math.PI);
    dish.translate(...spec.dish.at);
    object.add(new Mesh(context.tracker.track(dish), context.materials.get(group, WHITE)));
  }
  return { object, anchor: body };
}

export function createStarlinkSatellite(context: PartContext): SatellitePart {
  return build(context, 'satellite', STARLINK, panelFinish(context));
}

export function createBackupSatellite(context: PartContext): SatellitePart {
  return build(context, 'backupSatellite', BACKUP, panelFinish(context));
}

const panelFinishes = new WeakMap<PartContext, MaterialFinish>();

function panelFinish(context: PartContext): MaterialFinish {
  const known = panelFinishes.get(context);
  if (known) return known;
  const finish = { ...FRAME, color: '#ffffff', map: context.tracker.track(cellTexture()) };
  panelFinishes.set(context, finish);
  return finish;
}
