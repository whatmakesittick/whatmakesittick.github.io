import { Group, MeshStandardMaterial } from 'three';
import type { Object3D } from 'three';
import {
  LOOP_GEOMETRY,
  LOOP_POINT_COUNT,
  NEEDLE,
  PLATE_BOTTOM,
  STITCH_LENGTH,
  THREAD_RADIUS,
  createLoopPoints,
  hookPlanPoint,
  lerp,
  stitchProfile,
  tightenShare,
  writeLoopPoints,
} from '../../model';
import type { StitchProfile, Tension } from '../../model';
import {
  BOBBIN_SHAPE,
  BOBBIN_THREAD,
  GROOVE_Z,
  NEEDLE_BAR_SHAPE,
  NEEDLE_SHAPE,
  ROW_END,
  SPOOL,
  SPOOL_TOP,
  TAKE_UP,
  TENSION,
  TENSION_GAP_Z,
  THREAD_GUIDES,
  THREAD_SHAPE,
} from '../constants';
import { PathBuffer } from '../geometry/pathBuffer';
import { ThreadTube } from '../geometry/threadTube';
import { FINISHES } from '../finishes';
import type { LeverEye } from './takeUpLever';
import { anchorAt } from './context';
import type { PartContext } from './context';

export interface ThreadFrame {
  angle: number;
  hideBelowPlate: boolean;
  tipHeight: number;
  leverEye: LeverEye;
  stitchLength: number;
  travel: number;
  tension: Tension;
}

export interface ThreadsPart {
  object: Group;
  bobbinAnchor: Object3D;
  setCutaway(cutaway: boolean): void;
  update(frame: ThreadFrame): void;
  dispose(): void;
}

const UPPER_POINTS = 8;
const PLATE_CROSSING_POINTS = 16;
const NEEDLE_POINTS = 4;
const SOURCE_POINTS = 6;
const CURRENT_POINTS = 3;
const POINTS_PER_HOLE = 3;
const ROW_HOLES = Math.ceil(-ROW_END / STITCH_LENGTH.min) + 1;
const ROW_POINTS = ROW_HOLES * POINTS_PER_HOLE + 1;
const TOP_CAPACITY =
  UPPER_POINTS + NEEDLE_POINTS + LOOP_POINT_COUNT + ROW_POINTS + PLATE_CROSSING_POINTS;
const BOBBIN_CAPACITY = SOURCE_POINTS + CURRENT_POINTS + ROW_POINTS + PLATE_CROSSING_POINTS;

const UPPER = THREAD_SHAPE.upperRadius;
const LOWER = THREAD_RADIUS;
const SPOOL_LEAVE = { windShare: 0.92, sideShare: 0.35, below: 2 } as const;
const SPOOL_RIM = { share: 0.9, above: 0.8 } as const;
const DISC_REACH = 6;
const DISC_SLANT = 1.5;
const EYE_CLEARANCE = TAKE_UP.eyeRadius - TAKE_UP.eyeTube - UPPER;
const BOBBIN_LABEL = { x: 3, y: -4.5, z: 1.4 } as const;

function threadMaterial(
  context: PartContext,
  finish: 'topThread' | 'bobbinThread',
): MeshStandardMaterial {
  return context.tracker.track(new MeshStandardMaterial(FINISHES[finish]));
}

function visibleFloor(frame: ThreadFrame): number | null {
  return frame.hideBelowPlate ? PLATE_BOTTOM : null;
}

function forEachHole(stitchLength: number, travel: number, visit: (z: number) => void): void {
  for (let z = -travel; z > ROW_END; z -= stitchLength) visit(z);
}

class TopThread {
  readonly tube: ThreadTube;
  private readonly path = new PathBuffer(TOP_CAPACITY);
  private readonly loop = createLoopPoints();

  constructor(context: PartContext) {
    this.tube = new ThreadTube(
      TOP_CAPACITY,
      THREAD_SHAPE.sides,
      threadMaterial(context, 'topThread'),
    );
  }

  update(frame: ThreadFrame): void {
    this.path.reset(visibleFloor(frame));
    this.pushUpper(frame.leverEye);
    this.pushNeedle(frame.tipHeight);
    writeLoopPoints(frame.angle, frame.tension, this.loop);
    this.loop.forEach((point) => this.path.pushPoint(point, LOWER));
    this.pushRow(frame, stitchProfile(frame.tension));
    this.tube.update(this.path);
  }

  private pushUpper(eye: LeverEye): void {
    const { x, z, windRadius, flangeRadius, flangeThickness } = SPOOL;
    const { top, check, face } = THREAD_GUIDES;
    const path = this.path;
    path.push(
      x - windRadius * SPOOL_LEAVE.windShare,
      SPOOL_TOP - flangeThickness - SPOOL_LEAVE.below,
      z + windRadius * SPOOL_LEAVE.sideShare,
      UPPER,
    );
    path.push(
      x - flangeRadius * SPOOL_RIM.share,
      SPOOL_TOP + SPOOL_RIM.above,
      z + flangeRadius * SPOOL_LEAVE.sideShare,
      UPPER,
    );
    path.push(top.x, top.y, top.z, UPPER);
    path.push(TENSION.x + DISC_SLANT, TENSION.y + DISC_REACH, TENSION_GAP_Z, UPPER);
    path.push(TENSION.x - DISC_SLANT, TENSION.y - DISC_REACH, TENSION_GAP_Z, UPPER);
    path.push(check.x, check.y - THREAD_GUIDES.postRadius - UPPER, check.z, UPPER);
    path.push(eye.x, eye.y + EYE_CLEARANCE, eye.z, UPPER);
    path.push(face.x, face.y, face.z, UPPER);
  }

  private pushNeedle(tip: number): void {
    const { clampBottom, guideAbove, guideZ } = NEEDLE_BAR_SHAPE;
    const eye = tip + NEEDLE.eyeAboveTip;
    this.path.push(0, tip + clampBottom + guideAbove, guideZ, UPPER);
    this.path.push(0, tip + NEEDLE_SHAPE.grooveTop, GROOVE_Z, LOWER);
    this.path.push(0, eye, GROOVE_Z, LOWER);
    this.path.push(0, eye, 0, LOWER);
  }

  private pushRow(frame: ThreadFrame, profile: StitchProfile): void {
    const spread = LOOP_GEOMETRY.rowSpread;
    forEachHole(frame.stitchLength, frame.travel, (z) => {
      this.path.push(spread, profile.topLevel, z, LOWER);
      this.path.push(0, profile.topDip, z, LOWER);
      this.path.push(-spread, profile.topLevel, z, LOWER);
    });
    this.path.push(0, profile.topLevel, ROW_END, LOWER);
  }
}

class BobbinThread {
  readonly tube: ThreadTube;
  private readonly path = new PathBuffer(BOBBIN_CAPACITY);

  constructor(context: PartContext) {
    this.tube = new ThreadTube(
      BOBBIN_CAPACITY,
      THREAD_SHAPE.sides,
      threadMaterial(context, 'bobbinThread'),
    );
  }

  update(frame: ThreadFrame): void {
    const profile = stitchProfile(frame.tension);
    this.path.reset(visibleFloor(frame));
    this.pushSource();
    this.pushCurrent(tightenShare(frame.angle), profile);
    this.pushRow(frame, profile);
    this.tube.update(this.path);
  }

  private pushAroundHook(angle: number, radius: number, height: number): void {
    const plan = hookPlanPoint(angle, radius);
    this.path.push(plan.x, height, plan.z, LOWER);
  }

  private pushSource(): void {
    const { leave, slot, springStart, springEnd, plateBelow, plateTop } = BOBBIN_THREAD;
    this.pushAroundHook(leave.angle, BOBBIN_SHAPE.windRadius, leave.height);
    this.pushAroundHook(slot.angle, slot.radius, slot.height);
    this.pushAroundHook(springStart.angle, springStart.radius, springStart.height);
    this.pushAroundHook(springEnd.angle, springEnd.radius, springEnd.height);
    this.path.push(plateBelow.x, plateBelow.y, plateBelow.z, LOWER);
    this.path.push(plateTop.x, plateTop.y, plateTop.z, LOWER);
  }

  private pushCurrent(share: number, profile: StitchProfile): void {
    const { plateTop } = BOBBIN_THREAD;
    const spread = LOOP_GEOMETRY.rowSpread;
    const push = (x: number, y: number) =>
      this.path.push(
        lerp(plateTop.x, x, share),
        lerp(plateTop.y, y, share),
        lerp(plateTop.z, 0, share),
        LOWER,
      );
    push(-spread, profile.bottomLevel);
    push(0, profile.bobbinRise);
    push(spread, profile.bottomLevel);
  }

  private pushRow(frame: ThreadFrame, profile: StitchProfile): void {
    const spread = LOOP_GEOMETRY.rowSpread;
    forEachHole(frame.stitchLength, frame.travel, (z) => {
      this.path.push(-spread, profile.bottomLevel, z, LOWER);
      this.path.push(0, profile.bobbinRise, z, LOWER);
      this.path.push(spread, profile.bottomLevel, z, LOWER);
    });
    this.path.push(0, profile.bottomLevel, ROW_END, LOWER);
  }
}

export function createThreads(context: PartContext): ThreadsPart {
  const object = new Group();
  const top = new TopThread(context);
  const bobbin = new BobbinThread(context);
  const belowPlate = new Group();
  object.add(top.tube.mesh, bobbin.tube.mesh, belowPlate);
  return {
    object,
    bobbinAnchor: anchorAt(belowPlate, BOBBIN_LABEL.x, BOBBIN_LABEL.y, BOBBIN_LABEL.z),
    setCutaway: (cutaway) => {
      belowPlate.visible = cutaway;
    },
    update: (frame) => {
      top.update(frame);
      bobbin.update(frame);
    },
    dispose: () => {
      top.tube.dispose();
      bobbin.tube.dispose();
    },
  };
}
