import { Group } from 'three';
import type { BufferGeometry, Object3D } from 'three';
import { toRadians } from '@core/math';
import { anchorAt } from '@core/scene/parts';
import { BALANCE, BALANCE_CENTRE } from '../../../model/layout';
import { LEVELS } from '../../../model/scale';
import {
  ANCHOR_LIFT_MM,
  BALANCE_WHEEL,
  HAIRSPRING_RIBBON,
  IMPULSE_JEWEL,
  ROLLER,
  SEGMENTS,
} from '../../constants';
import { FINISHES, rubyMaterial } from '../../finishes';
import { extrudeOutline, latheZ } from '../../geometry/extrude';
import type { LathePoint } from '../../geometry/extrude';
import { merge } from '../../geometry/merge';
import { circlePoints, polarDeg, subtractCircle } from '../../geometry/outline';
import { block, disc, ring } from '../../geometry/solids';
import { finishMesh, partMesh, registeredMesh } from '../context';
import type { PartContext } from '../context';

const ORIGIN = { x: 0, y: 0 };
const RIM_BEVEL = { size: 0.05, segments: 2 };
const JEWEL_LABEL_LIFT = 0.1;
const LABEL_RIM_DEG = 160;
const CRESCENT_OFFSET = 0.04;

function rimGeometry(): BufferGeometry {
  const outer = circlePoints({ ...ORIGIN, r: BALANCE.radiusMm }, SEGMENTS.plate);
  const inner = circlePoints(
    { ...ORIGIN, r: BALANCE.radiusMm - BALANCE.rimWidthMm },
    SEGMENTS.plate,
  );
  return extrudeOutline(outer, BALANCE_WHEEL.rim[0], BALANCE_WHEEL.rim[1], [inner], RIM_BEVEL);
}

function armsGeometry(): BufferGeometry {
  const [bottom, top] = BALANCE_WHEEL.arms;
  const length = (BALANCE.radiusMm - BALANCE.rimWidthMm / 2) * 2;
  return merge([
    block(
      [0, 0, (bottom + top) / 2],
      [length, BALANCE_WHEEL.armWidth, top - bottom],
      toRadians(BALANCE_WHEEL.armsDeg),
    ),
    disc({ ...ORIGIN, r: BALANCE_WHEEL.hub.radius }, BALANCE_WHEEL.hub.span, SEGMENTS.hub),
  ]);
}

function staffGeometry(): BufferGeometry {
  const profile: LathePoint[] = BALANCE_WHEEL.staff.map(([radius, z]) => [radius, z]);
  const [firstRadius, firstZ] = profile[0];
  const [lastRadius, lastZ] = profile[profile.length - 1];
  return latheZ(
    [[0, firstZ], [firstRadius, firstZ], ...profile.slice(1, -1), [lastRadius, lastZ], [0, lastZ]],
    SEGMENTS.arbor,
  );
}

function rollerGeometry(): BufferGeometry {
  const { impulse, safety, collar } = ROLLER;
  const notch = {
    ...polarDeg(ORIGIN, safety.radius + CRESCENT_OFFSET, IMPULSE_JEWEL.restDeg),
    r: safety.crescentDepth + CRESCENT_OFFSET,
  };
  const safetyOutline = subtractCircle(
    circlePoints({ ...ORIGIN, r: safety.radius }, SEGMENTS.hub * 2),
    notch,
    SEGMENTS.hub * 2,
  );
  return merge([
    disc({ ...ORIGIN, r: impulse.radius }, impulse.level, SEGMENTS.disc),
    extrudeOutline(safetyOutline, safety.level[0], safety.level[1]),
    disc({ ...ORIGIN, r: collar.radius }, collar.level, SEGMENTS.hub),
  ]);
}

function jewelGeometry(): BufferGeometry {
  const at = polarDeg(ORIGIN, BALANCE.impulseJewelRadiusMm, IMPULSE_JEWEL.restDeg);
  return disc({ ...at, r: IMPULSE_JEWEL.radius }, IMPULSE_JEWEL.level, SEGMENTS.jewel);
}

function colletGeometry(): BufferGeometry {
  return ring(
    ORIGIN,
    HAIRSPRING_RIBBON.colletHole,
    HAIRSPRING_RIBBON.colletRadius,
    LEVELS.hairspring,
    SEGMENTS.hub,
  );
}

export class BalancePart {
  readonly object = new Group();
  readonly anchor: Object3D;
  readonly labels: Readonly<Record<'balanceWheel' | 'roller' | 'impulseJewel', Object3D>>;

  constructor(context: PartContext, frame: Object3D) {
    this.object.position.set(BALANCE_CENTRE.x, BALANCE_CENTRE.y, 0);
    const glucydur = context.surfaces.grained(BALANCE.radiusMm, FINISHES.glucydur);
    this.object.add(
      finishMesh(context, merge([rimGeometry(), armsGeometry()]), 'balanceWheel', glucydur),
      partMesh(context, staffGeometry(), 'balanceWheel', 'brightSteel'),
      partMesh(context, rollerGeometry(), 'roller', 'brightSteel'),
      partMesh(context, colletGeometry(), 'hairspring', 'brightSteel'),
      registeredMesh(context, jewelGeometry(), 'impulseJewel', rubyMaterial()),
    );
    frame.add(this.object);
    this.anchor = anchorAt(
      frame,
      BALANCE_CENTRE.x,
      BALANCE_CENTRE.y,
      BALANCE_WHEEL.rim[1] + ANCHOR_LIFT_MM,
    );
    const rim = polarDeg(BALANCE_CENTRE, BALANCE.radiusMm - BALANCE.rimWidthMm / 2, LABEL_RIM_DEG);
    const jewel = polarDeg(ORIGIN, BALANCE.impulseJewelRadiusMm, IMPULSE_JEWEL.restDeg);
    const rollerEdge = polarDeg(ORIGIN, ROLLER.impulse.radius, IMPULSE_JEWEL.restDeg + 90);
    this.labels = {
      balanceWheel: anchorAt(frame, rim.x, rim.y, BALANCE_WHEEL.rim[1] + ANCHOR_LIFT_MM),
      roller: anchorAt(
        this.object,
        rollerEdge.x,
        rollerEdge.y,
        ROLLER.impulse.level[1] + ANCHOR_LIFT_MM,
      ),
      impulseJewel: anchorAt(
        this.object,
        jewel.x,
        jewel.y,
        IMPULSE_JEWEL.level[0] - JEWEL_LABEL_LIFT,
      ),
    };
  }

  setAngle(degrees: number): void {
    this.object.rotation.z = toRadians(degrees);
  }
}
