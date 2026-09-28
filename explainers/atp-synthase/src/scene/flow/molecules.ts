import { smoothstep } from '@core/math';
import { BETA_INDICES } from '../../ids';
import type { BetaIndex } from '../../ids';
import {
  BETA_AZIMUTH_DEG,
  MOLECULE_TIMING,
  betaInState,
  siteState,
  stepProgress,
} from '../../model/rotor';
import { SITE } from '../../model/scale';
import { MOLECULE_PATH } from '../constants';
import { beadPose, copyPoint, hide, polarPoint, setLerp } from './points';
import type { BeadPose, Point3 } from './points';

export interface GlyphPose extends BeadPose {
  turn: number;
}

export interface SeatMolecules {
  readonly adp: GlyphPose;
  readonly phosphate: GlyphPose;
  readonly atp: GlyphPose;
  flash: number;
}

interface SeatSpots {
  readonly seat: Point3;
  readonly adpEntry: Point3;
  readonly phosphateEntry: Point3;
  readonly phosphateDock: Point3;
  readonly atpExit: Point3;
}

interface Spot {
  readonly azimuthOffsetDeg: number;
  readonly radius: number;
  readonly y: number;
}

function spotOf(beta: BetaIndex, spot: Spot): Point3 {
  return polarPoint(BETA_AZIMUTH_DEG[beta] + spot.azimuthOffsetDeg, spot.radius, spot.y);
}

function seatSpots(beta: BetaIndex): SeatSpots {
  return {
    seat: polarPoint(BETA_AZIMUTH_DEG[beta], SITE.radius, SITE.y),
    adpEntry: spotOf(beta, MOLECULE_PATH.adpEntry),
    phosphateEntry: spotOf(beta, MOLECULE_PATH.phosphateEntry),
    phosphateDock: spotOf(beta, MOLECULE_PATH.phosphateDock),
    atpExit: spotOf(beta, MOLECULE_PATH.atpExit),
  };
}

const SPOTS = BETA_INDICES.map(seatSpots);

export function seatPoint(beta: BetaIndex): Readonly<Point3> {
  return SPOTS[beta].seat;
}

function glyphPose(): GlyphPose {
  return { ...beadPose(), turn: 0 };
}

export function seatMolecules(): SeatMolecules {
  return { adp: glyphPose(), phosphate: glyphPose(), atp: glyphPose(), flash: 0 };
}

function place(pose: GlyphPose, from: Point3, to: Point3, share: number, scale: number): void {
  setLerp(pose.position, from, to, share);
  pose.scale = scale;
  pose.turn = 0;
}

function seated(pose: GlyphPose, seat: Point3): void {
  copyPoint(pose.position, seat);
  pose.scale = 1;
  pose.turn = 0;
}

function binding(spots: SeatSpots, progress: number, out: SeatMolecules): void {
  const { appearShare, phosphateDelay, tumble } = MOLECULE_PATH;
  const adpTravel = smoothstep(progress, 0, MOLECULE_TIMING.bindEnd);
  place(out.adp, spots.adpEntry, spots.seat, adpTravel, smoothstep(progress, 0, appearShare));
  out.adp.turn = (1 - adpTravel) * tumble;
  const phosphateTravel = smoothstep(progress, phosphateDelay, MOLECULE_TIMING.bindEnd);
  const phosphateScale = smoothstep(progress, phosphateDelay, phosphateDelay + appearShare);
  place(out.phosphate, spots.phosphateEntry, spots.phosphateDock, phosphateTravel, phosphateScale);
}

function fusing(spots: SeatSpots, progress: number, out: SeatMolecules): void {
  const { fuseStart, fuseEnd } = MOLECULE_TIMING;
  out.flash = Math.max(0, 1 - Math.abs(progress - fuseEnd) / MOLECULE_PATH.flashWidth);
  if (progress >= fuseEnd) {
    seated(out.atp, spots.seat);
    return;
  }
  seated(out.adp, spots.seat);
  const merge = smoothstep(progress, fuseStart, fuseEnd);
  place(
    out.phosphate,
    spots.phosphateDock,
    spots.seat,
    merge,
    1 - merge * MOLECULE_PATH.mergeShrink,
  );
}

function releasing(spots: SeatSpots, progress: number, out: SeatMolecules): void {
  const { releaseStart, releaseEnd } = MOLECULE_TIMING;
  if (progress >= releaseEnd) return;
  const travel = smoothstep(progress, releaseStart, releaseEnd);
  const fade = smoothstep(progress, releaseEnd - MOLECULE_PATH.fadeShare, releaseEnd);
  place(out.atp, spots.seat, spots.atpExit, travel, 1 - fade);
  out.atp.turn = travel * MOLECULE_PATH.tumble;
}

export function poseSeatMolecules(
  beta: BetaIndex,
  rotorDeg: number,
  out: SeatMolecules,
): SeatMolecules {
  hide(out.adp);
  hide(out.phosphate);
  hide(out.atp);
  out.flash = 0;
  const from = siteState(beta, rotorDeg);
  const progress = stepProgress(rotorDeg);
  const spots = SPOTS[beta];
  if (from === 'open') binding(spots, progress, out);
  else if (from === 'loose') fusing(spots, progress, out);
  else releasing(spots, progress, out);
  return out;
}

export function atpLabelBeta(rotorDeg: number): BetaIndex {
  const leaving = stepProgress(rotorDeg) < MOLECULE_TIMING.releaseEnd;
  return betaInState(leaving ? 'tight' : 'loose', rotorDeg);
}

export function adpLabelBeta(rotorDeg: number): BetaIndex {
  const holding = stepProgress(rotorDeg) < MOLECULE_TIMING.fuseEnd;
  return betaInState(holding ? 'loose' : 'open', rotorDeg);
}
