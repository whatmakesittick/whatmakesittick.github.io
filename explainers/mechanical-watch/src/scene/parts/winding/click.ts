import { Group } from 'three';
import type { Object3D } from 'three';
import { toRadians } from '@core/math';
import { anchorAt } from '@core/scene/parts';
import { CLICK_CENTRE, WHEEL_CENTRES } from '../../../model/layout';
import type { Point } from '../../../model/layout';
import { WINDING } from '../../../model/train';
import { ANCHOR_LIFT_MM, CLICK, SEGMENTS, WINDING_SAW } from '../../constants';
import { extrudeOutline } from '../../geometry/extrude';
import { toothPitch } from '../../geometry/gear';
import type { Vec2 } from '../../geometry/outline';
import {
  angleOf,
  arcPoints,
  distance,
  offsetPolyline,
  polar,
  polarDeg,
  roundCorners,
} from '../../geometry/outline';
import { partMesh } from '../context';
import type { PartContext } from '../context';

const BARREL = WHEEL_CENTRES.barrel;
const TIP = polarDeg(BARREL, CLICK.tipRadius, CLICK.tipDeg);
export const CLICK_PIVOT: Point = { x: 2 * CLICK_CENTRE.x - TIP.x, y: 2 * CLICK_CENTRE.y - TIP.y };
const HUB_ARC_SEGMENTS = 12;
const TIP_TAPER = 0.4;
const CORNER_RADIUS = 0.06;
const CORNER_TURN_DEG = 35;
const SPRING_SAMPLES = 12;
const SPRING_CONTACT_SHARE = 0.62;
const RATCHET_TIP = WINDING.ratchetRadiusMm + WINDING_SAW.depth / 2;
const RATCHET_ROOT = WINDING.ratchetRadiusMm - WINDING_SAW.depth / 2;

function clickOutline(): Vec2[] {
  const heading = angleOf(CLICK_PIVOT, TIP);
  const length = distance(CLICK_PIVOT, TIP);
  const half = CLICK.armWidth / 2;
  const local = (u: number, v: number) =>
    polar(polar(CLICK_PIVOT, u, heading), v, heading + Math.PI / 2);
  const hub = arcPoints(
    CLICK_PIVOT,
    CLICK.hubRadius,
    heading + Math.PI / 2,
    heading + (Math.PI * 3) / 2,
    HUB_ARC_SEGMENTS,
  );
  return roundCorners(
    [
      ...hub,
      local(length * (1 - TIP_TAPER), -half),
      local(length, 0),
      local(length * (1 - TIP_TAPER / 2), half),
      local(CLICK.hubRadius, half),
    ],
    CORNER_RADIUS,
    CORNER_TURN_DEG,
    SEGMENTS.fillet,
  );
}

function springOutline(): Vec2[] {
  const { anchor, bow, width } = CLICK.spring;
  const contact = polar(
    CLICK_PIVOT,
    distance(CLICK_PIVOT, TIP) * SPRING_CONTACT_SHARE,
    angleOf(CLICK_PIVOT, TIP),
  );
  const heading = angleOf(anchor, contact);
  const span = distance(anchor, contact);
  const path = Array.from({ length: SPRING_SAMPLES + 1 }, (_, index) => {
    const t = index / SPRING_SAMPLES;
    const along = polar(anchor, span * t, heading);
    return polar(along, bow * Math.sin(Math.PI * t), heading + Math.PI / 2);
  });
  return offsetPolyline(path, width / 2);
}

function tipLiftSlope(): number {
  const lever = { x: TIP.x - CLICK_PIVOT.x, y: TIP.y - CLICK_PIVOT.y };
  const radial = {
    x: (TIP.x - BARREL.x) / CLICK.tipRadius,
    y: (TIP.y - BARREL.y) / CLICK.tipRadius,
  };
  return radial.x * -lever.y + radial.y * lever.x;
}

export function ratchetRadiusUnderClick(ratchetDeg: number, phase: number): number {
  const pitch = toothPitch(WINDING.ratchetTeeth);
  const land = pitch * (1 - WINDING_SAW.land);
  const local = toRadians(CLICK.tipDeg - ratchetDeg) - phase;
  const within = ((local % pitch) + pitch) % pitch;
  if (within >= land) return RATCHET_ROOT;
  return RATCHET_TIP - ((RATCHET_TIP - RATCHET_ROOT) * within) / land;
}

export class ClickPart {
  readonly object = new Group();
  readonly label: Object3D;
  private readonly pawl = new Group();
  private readonly slope = tipLiftSlope();
  private readonly phase: number;

  constructor(context: PartContext, frame: Object3D, ratchetPhase: number) {
    this.phase = ratchetPhase;
    const [bottom, top] = CLICK.level;
    const body = extrudeOutline(clickOutline(), bottom, top);
    body.translate(-CLICK_PIVOT.x, -CLICK_PIVOT.y, 0);
    this.pawl.position.set(CLICK_PIVOT.x, CLICK_PIVOT.y, 0);
    this.pawl.add(partMesh(context, body, 'click', 'steel'));
    const spring = extrudeOutline(springOutline(), CLICK.spring.level[0], CLICK.spring.level[1]);
    this.object.add(this.pawl, partMesh(context, spring, 'click', 'brightSteel'));
    frame.add(this.object);
    this.label = anchorAt(frame, CLICK_CENTRE.x, CLICK_CENTRE.y, top + ANCHOR_LIFT_MM);
  }

  setRatchetAngle(degrees: number): void {
    const lift = ratchetRadiusUnderClick(degrees, this.phase) - CLICK.tipRadius;
    this.pawl.rotation.z = Math.max(0, lift) / this.slope;
  }
}
