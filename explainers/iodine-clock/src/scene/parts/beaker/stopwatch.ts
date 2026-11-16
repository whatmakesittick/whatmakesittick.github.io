import {
  CircleGeometry,
  CylinderGeometry,
  LatheGeometry,
  Shape,
  ShapeGeometry,
  SphereGeometry,
  TorusGeometry,
  Vector2,
} from 'three';
import type { Object3D } from 'three';
import { toRadians } from '@core/math';
import { box } from '@core/scene/geometry/box';
import type { AssemblyState } from '../../../ids';
import { STOPWATCH } from '../../../model';
import { ACCENT, DETAIL, STOPWATCH_LOOK } from '../../constants';
import { mergeParts } from '../../geometry/merge';
import { canvasTexture, font } from '../canvas';
import { addMesh, label, namedGroup } from '../context';
import type { PartContext, Section } from '../context';
import { patchGlass } from '../patches';
import { contactShadow } from './bench';
import { RENDER_ORDER } from './glassware';

const QUARTER_TURN = Math.PI / 2;
const FULL_TURN = Math.PI * 2;
const HALF = 0.5;
const SECONDS_PER_TURN = 60;
const SUBDIAL_MINUTES = 30;
const SECONDS_PER_MINUTE = 60;
const DIAL_INSET = 0.22;
const DIAL_Z = 0.52;
const CRYSTAL_RADIUS = 8;
const HAND_Z = 0.62;
const SUBHAND_Z = 0.58;
const FOOT = { width: 1.1, overlap: 0.4, depth: 1.6, spread: 1.25 };
const PUSHER_ANGLE = toRadians(40);
const PUSHER = { radius: 0.22, length: 0.45 };
const LOOP = { radius: 0.55, tube: 0.09 };
const SHADOW = [8, 4.5] as const;
const SHADOW_OPACITY = 0.65;
const TICKS = 300;
const TICKS_PER_SECOND = 5;
const LABEL_EVERY_S = 5;

function caseProfile(): Vector2[] {
  const { caseRadius, caseDepth, bezel } = STOPWATCH_LOOK;
  const back = -caseDepth * HALF;
  const front = caseDepth * HALF;
  const lip = caseRadius - DIAL_INSET;
  const steps = DETAIL.profile;
  const curve = Array.from({ length: steps + 1 }, (_, step) => {
    const angle = -QUARTER_TURN + (Math.PI * step) / steps;
    return new Vector2(
      caseRadius + bezel * HALF * Math.cos(angle),
      front * 0.2 + bezel * Math.sin(angle) * 1.6,
    );
  });
  return [
    new Vector2(0, back),
    new Vector2(caseRadius - bezel, back),
    new Vector2(caseRadius, back + bezel),
    ...curve,
    new Vector2(lip + bezel * HALF, front),
    new Vector2(lip, front - bezel * HALF),
    new Vector2(lip, DIAL_Z - 0.02),
  ];
}

function dialPainter(paint: CanvasRenderingContext2D, size: number): void {
  const centre = size * HALF;
  const radius = size * HALF;
  paint.fillStyle = '#f4f2ea';
  paint.fillRect(0, 0, size, size);
  paint.strokeStyle = '#17191d';
  paint.fillStyle = '#17191d';
  for (let tick = 0; tick < TICKS; tick += 1) {
    const angle = (tick / TICKS) * FULL_TURN - QUARTER_TURN;
    const second = tick % TICKS_PER_SECOND === 0;
    const five = tick % (TICKS_PER_SECOND * LABEL_EVERY_S) === 0;
    const inner = radius * (five ? 0.8 : second ? 0.85 : 0.89);
    paint.lineWidth = five ? 4 : second ? 2.5 : 1.2;
    paint.beginPath();
    paint.moveTo(centre + Math.cos(angle) * inner, centre + Math.sin(angle) * inner);
    paint.lineTo(
      centre + Math.cos(angle) * radius * 0.94,
      centre + Math.sin(angle) * radius * 0.94,
    );
    paint.stroke();
  }
  paint.font = font(size * 0.075);
  paint.textAlign = 'center';
  paint.textBaseline = 'middle';
  for (let second = LABEL_EVERY_S; second <= SECONDS_PER_TURN; second += LABEL_EVERY_S) {
    const angle = (second / SECONDS_PER_TURN) * FULL_TURN - QUARTER_TURN;
    const at = radius * 0.68;
    paint.fillStyle = second === SECONDS_PER_TURN ? ACCENT.hand : '#17191d';
    paint.fillText(String(second), centre + Math.cos(angle) * at, centre + Math.sin(angle) * at);
  }
  const subY =
    centre - (STOPWATCH_LOOK.subdialOffset / (STOPWATCH_LOOK.caseRadius - DIAL_INSET)) * radius;
  const subRadius = radius * 0.2;
  paint.strokeStyle = '#17191d';
  paint.lineWidth = 2;
  paint.beginPath();
  paint.arc(centre, subY, subRadius, 0, FULL_TURN);
  paint.stroke();
  for (let minute = 0; minute < SUBDIAL_MINUTES; minute += 1) {
    const angle = (minute / SUBDIAL_MINUTES) * FULL_TURN - QUARTER_TURN;
    const inner = subRadius * (minute % LABEL_EVERY_S === 0 ? 0.7 : 0.82);
    paint.beginPath();
    paint.moveTo(centre + Math.cos(angle) * inner, subY + Math.sin(angle) * inner);
    paint.lineTo(centre + Math.cos(angle) * subRadius, subY + Math.sin(angle) * subRadius);
    paint.stroke();
  }
}

function handShape(length: number, tail: number, width: number): ShapeGeometry {
  const shape = new Shape();
  shape.moveTo(-width, -tail);
  shape.lineTo(width, -tail);
  shape.lineTo(width * HALF, length);
  shape.lineTo(-width * HALF, length);
  shape.closePath();
  return new ShapeGeometry(shape);
}

function body(context: PartContext, watch: Object3D): void {
  const shell = new LatheGeometry(caseProfile(), DETAIL.lathe);
  shell.rotateX(QUARTER_TURN);
  addMesh(context, watch, shell, 'stopwatch', 'watchCase');
  const { caseRadius, stemLength, crownRadius, crownHeight } = STOPWATCH_LOOK;
  const stem = new CylinderGeometry(
    crownRadius * 0.45,
    crownRadius * 0.45,
    stemLength,
    DETAIL.bond,
  );
  stem.translate(0, caseRadius + stemLength * HALF, 0);
  const crown = new CylinderGeometry(crownRadius, crownRadius, crownHeight, DETAIL.knob);
  crown.translate(0, caseRadius + stemLength + crownHeight * HALF, 0);
  const loop = new TorusGeometry(LOOP.radius, LOOP.tube, 8, DETAIL.knob);
  loop.translate(0, caseRadius + stemLength + crownHeight + LOOP.radius * 0.8, 0);
  const pusher = new CylinderGeometry(PUSHER.radius, PUSHER.radius, PUSHER.length, DETAIL.bond);
  pusher.translate(0, caseRadius + PUSHER.length * 0.3, 0);
  pusher.rotateZ(-PUSHER_ANGLE);
  addMesh(context, watch, mergeParts([stem, crown, loop, pusher]), 'stopwatch', 'chrome');
  const feet = [-1, 1].map((side) =>
    box({
      minX: side * FOOT.spread - FOOT.width * HALF,
      maxX: side * FOOT.spread + FOOT.width * HALF,
      minY: -STOPWATCH.centre[1],
      maxY: -caseRadius + FOOT.overlap,
      minZ: -FOOT.depth * HALF,
      maxZ: FOOT.depth * HALF,
    }),
  );
  addMesh(context, watch, mergeParts(feet), 'stopwatch', 'rubber');
}

function dial(context: PartContext, watch: Object3D): void {
  const size = STOPWATCH_LOOK.dialTexture;
  const radius = STOPWATCH_LOOK.caseRadius - DIAL_INSET;
  const face = new CircleGeometry(radius, DETAIL.lathe);
  face.translate(0, 0, DIAL_Z);
  addMesh(context, watch, face, 'stopwatch', {
    color: '#ffffff',
    map: canvasTexture(context, size, size, (paint) => dialPainter(paint, size)),
    roughness: 0.55,
  });
  const arc = Math.asin(radius / CRYSTAL_RADIUS);
  const crystal = new SphereGeometry(CRYSTAL_RADIUS, DETAIL.lathe, 6, 0, FULL_TURN, 0, arc);
  crystal.rotateX(QUARTER_TURN);
  crystal.translate(0, 0, DIAL_Z + 0.05 - CRYSTAL_RADIUS * Math.cos(arc));
  const glass = addMesh(context, watch, crystal, 'stopwatch', 'glass');
  glass.renderOrder = RENDER_ORDER.outerGlass;
  patchGlass(glass.material as never);
}

export function buildStopwatch(context: PartContext, parent: Object3D): Section {
  const root = namedGroup('stopwatch', parent);
  const [x, y, z] = STOPWATCH.centre;
  const shadow = contactShadow(context, root, ...SHADOW, SHADOW_OPACITY);
  shadow.position.set(x, shadow.position.y, z);
  const watch = namedGroup('stopwatchBody', root);
  watch.position.set(x, y, z);
  body(context, watch);
  dial(context, watch);
  const hand = namedGroup('stopwatchHand', watch);
  hand.position.z = HAND_Z;
  const { handLength, handTail, handWidth, subdialOffset, subdialHand } = STOPWATCH_LOOK;
  addMesh(context, hand, handShape(handLength, handTail, handWidth), 'stopwatch', 'hand');
  const cap = new CylinderGeometry(handWidth * 2.2, handWidth * 2.2, 0.08, DETAIL.bond * 2);
  cap.rotateX(QUARTER_TURN);
  addMesh(context, watch, cap.translate(0, 0, HAND_Z + 0.04), 'stopwatch', 'pin');
  const minute = namedGroup('stopwatchMinute', watch);
  minute.position.set(0, subdialOffset, SUBHAND_Z);
  addMesh(context, minute, handShape(subdialHand, handWidth, handWidth), 'stopwatch', 'pin');
  label(context, 'stopwatch', watch, [
    -STOPWATCH_LOOK.caseRadius * 0.6,
    STOPWATCH_LOOK.caseRadius * 0.6,
    DIAL_Z,
  ]);
  return {
    root,
    setState: ({ clock }: AssemblyState) => {
      hand.rotation.z = -toRadians(clock.seconds * STOPWATCH.degPerSecond);
      minute.rotation.z = -FULL_TURN * (clock.seconds / SECONDS_PER_MINUTE / SUBDIAL_MINUTES);
    },
  };
}
