import type { BufferGeometry, Object3D } from 'three';
import { toRadians } from '@core/math';
import { anchorAt } from '@core/scene/parts';
import { BALANCE_CENTRE } from '../../../model/layout';
import { ANCHOR_LIFT_MM, BALANCE_COCK, SEGMENTS, SHOCK_SETTING } from '../../constants';
import { rubyMaterial } from '../../finishes';
import { extrudeOutline, latheZ } from '../../geometry/extrude';
import { merge } from '../../geometry/merge';
import type { Vec2 } from '../../geometry/outline';
import { offsetPolyline, polar } from '../../geometry/outline';
import { ring } from '../../geometry/solids';
import { partMesh, registeredMesh } from '../context';
import type { PartContext } from '../context';

const LYRE_SAMPLES = 40;
const DOME_SHOULDER = { radius: 0.6, height: 0.7 } as const;

function lyrePath(): Vec2[] {
  const { radius, openDeg, hook } = SHOCK_SETTING.lyre;
  const facing = toRadians(BALANCE_COCK.footDeg);
  const start = facing + toRadians(openDeg) / 2;
  const sweep = Math.PI * 2 - toRadians(openDeg);
  const arc = Array.from({ length: LYRE_SAMPLES + 1 }, (_, index) =>
    polar(BALANCE_CENTRE, radius, start + (sweep * index) / LYRE_SAMPLES),
  );
  const first = polar(BALANCE_CENTRE, radius + hook, start - toRadians(openDeg) / 4);
  const last = polar(BALANCE_CENTRE, radius + hook, start + sweep + toRadians(openDeg) / 4);
  return [first, ...arc, last];
}

function settingGeometry(): BufferGeometry {
  const { ring: collar, lyre } = SHOCK_SETTING;
  return merge([
    ring(BALANCE_CENTRE, collar.inner, collar.outer, collar.span, SEGMENTS.hub),
    extrudeOutline(offsetPolyline(lyrePath(), lyre.width / 2), lyre.span[0], lyre.span[1]),
  ]);
}

function capJewelGeometry(): BufferGeometry {
  const { radius, span, dome } = SHOCK_SETTING.jewel;
  const jewel = latheZ(
    [
      [0, span[0]],
      [radius, span[0]],
      [radius, span[1]],
      [radius * DOME_SHOULDER.radius, span[1] + dome * DOME_SHOULDER.height],
      [0, span[1] + dome],
    ],
    SEGMENTS.jewel,
  );
  jewel.translate(BALANCE_CENTRE.x, BALANCE_CENTRE.y, 0);
  return jewel;
}

export function createShockJewel(context: PartContext, frame: Object3D): Object3D {
  frame.add(
    partMesh(context, settingGeometry(), 'shockJewel', 'brightSteel'),
    registeredMesh(context, capJewelGeometry(), 'shockJewel', rubyMaterial()),
  );
  return anchorAt(
    frame,
    BALANCE_CENTRE.x,
    BALANCE_CENTRE.y,
    SHOCK_SETTING.lyre.span[1] + ANCHOR_LIFT_MM,
  );
}
