import { Group } from 'three';
import type { BufferGeometry, Object3D } from 'three';
import { toRadians } from '@core/math';
import { anchorAt } from '@core/scene/parts';
import { BALANCE_CENTRE, HAIRSPRING, REGULATOR } from '../../../model/layout';
import { ANCHOR_LIFT_MM, REGULATOR_ARM, SEGMENTS } from '../../constants';
import { extrudeOutline } from '../../geometry/extrude';
import { merge } from '../../geometry/merge';
import type { Vec2 } from '../../geometry/outline';
import { hullOfCircles, polarDeg } from '../../geometry/outline';
import { disc, ring } from '../../geometry/solids';
import { partMesh } from '../context';
import type { PartContext } from '../context';

const ORIGIN: Vec2 = { x: 0, y: 0 };
const TIP_SHARE = 0.4;
const LABEL_SHARE = 0.8;

function armGeometry(deg: number, length: number, width: number): BufferGeometry {
  const { ring: collar, level } = REGULATOR_ARM;
  const start = polarDeg(ORIGIN, (collar.inner + collar.outer) / 2, deg);
  const end = polarDeg(ORIGIN, length, deg);
  const outline = hullOfCircles(
    [
      { ...start, r: width / 2 },
      { ...end, r: (width / 2) * TIP_SHARE },
    ],
    SEGMENTS.hub,
  );
  return extrudeOutline(outline, level[0], level[1]);
}

function curbPins(): BufferGeometry[] {
  const { curbPin, pinArmDeg } = REGULATOR_ARM;
  return [-1, 1].map((side) => {
    const at = polarDeg(ORIGIN, HAIRSPRING.outerRadiusMm + side * curbPin.offset, pinArmDeg);
    return disc({ ...at, r: curbPin.radius }, curbPin.span, SEGMENTS.pin);
  });
}

export class RegulatorPart {
  readonly object = new Group();
  readonly label: Object3D;

  constructor(context: PartContext, frame: Object3D) {
    const {
      ring: collar,
      level,
      pinArmDeg,
      pinArmWidth,
      pointerDeg,
      pointerLength,
      pointerWidth,
    } = REGULATOR_ARM;
    const geometry = merge([
      ring(ORIGIN, collar.inner, collar.outer, level, SEGMENTS.hub),
      armGeometry(pinArmDeg, REGULATOR.armLengthMm, pinArmWidth),
      armGeometry(pointerDeg, pointerLength, pointerWidth),
      ...curbPins(),
    ]);
    this.object.position.set(BALANCE_CENTRE.x, BALANCE_CENTRE.y, 0);
    this.object.add(partMesh(context, geometry, 'regulator', 'brightSteel'));
    frame.add(this.object);
    const tip = polarDeg(ORIGIN, pointerLength * LABEL_SHARE, pointerDeg);
    this.label = anchorAt(this.object, tip.x, tip.y, level[1] + ANCHOR_LIFT_MM);
  }

  setIndex(share: number): void {
    this.object.rotation.z = toRadians(share * REGULATOR.indexRangeDeg);
  }
}
