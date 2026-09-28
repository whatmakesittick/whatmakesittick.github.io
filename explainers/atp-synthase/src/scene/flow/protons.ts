import { smoothstep } from '@core/math';
import {
  CHANNEL_TRAVEL_DEG,
  PICKUP_AZIMUTH_DEG,
  RELEASE_AZIMUTH_DEG,
  bladeAzimuth,
  enteringProgress,
  isCarrying,
  leavingProgress,
  wrapDegrees,
} from '../../model/rotor';
import { GATE } from '../../model/scale';
import { CHANNEL_FORM, PROTON_FORM, PUMPED_FLOW } from '../constants';
import type { PumpLane } from '../constants';
import type { RingLayout } from '../geometry/ringLayout';
import { hide, point, polarPoint, setLerp, setPolar } from './points';
import type { BeadPose, Point3 } from './points';

export interface ChannelSpots {
  readonly inletMouth: Point3;
  readonly inletBase: Point3;
  readonly outletBase: Point3;
  readonly outletMouth: Point3;
  readonly driftEnd: Point3;
}

const RIDER = point();

export function channelSpots(layout: RingLayout): ChannelSpots {
  const radius = layout.outerRadius + CHANNEL_FORM.ringGap;
  const mouth = GATE.span[1] + CHANNEL_FORM.reach;
  return {
    inletMouth: polarPoint(PICKUP_AZIMUTH_DEG, radius, -mouth),
    inletBase: polarPoint(PICKUP_AZIMUTH_DEG, radius, 0),
    outletBase: polarPoint(RELEASE_AZIMUTH_DEG, radius, 0),
    outletMouth: polarPoint(RELEASE_AZIMUTH_DEG, radius, mouth),
    driftEnd: polarPoint(
      RELEASE_AZIMUTH_DEG - PROTON_FORM.driftTurnDeg,
      radius + PROTON_FORM.driftOutward,
      mouth + PROTON_FORM.driftRise,
    ),
  };
}

function riderSpot(azimuthDeg: number, layout: RingLayout): Point3 {
  return setPolar(RIDER, azimuthDeg, layout.outerRadius + PROTON_FORM.lift, 0);
}

function between(progress: number, start: number, end: number): number {
  return (progress - start) / (end - start);
}

export function poseRider(
  blade: number,
  rotorDeg: number,
  layout: RingLayout,
  out: BeadPose,
): BeadPose {
  const azimuth = bladeAzimuth(blade, rotorDeg, layout.bladeCount);
  if (!isCarrying(azimuth)) return hide(out);
  setPolar(out.position, azimuth, layout.outerRadius + PROTON_FORM.lift, 0);
  out.scale = 1;
  return out;
}

export function poseEntering(
  blade: number,
  rotorDeg: number,
  layout: RingLayout,
  spots: ChannelSpots,
  out: BeadPose,
): BeadPose {
  const azimuth = bladeAzimuth(blade, rotorDeg, layout.bladeCount);
  const progress = enteringProgress(azimuth);
  if (progress === null) return hide(out);
  const { riseShare, appearShare } = PROTON_FORM;
  if (progress < riseShare) {
    setLerp(out.position, spots.inletMouth, spots.inletBase, progress / riseShare);
  } else {
    const step = between(progress, riseShare, 1);
    setLerp(out.position, spots.inletBase, riderSpot(azimuth, layout), step);
  }
  out.scale = smoothstep(progress, 0, appearShare);
  return out;
}

export function poseLeaving(
  blade: number,
  rotorDeg: number,
  layout: RingLayout,
  spots: ChannelSpots,
  out: BeadPose,
): BeadPose {
  const azimuth = bladeAzimuth(blade, rotorDeg, layout.bladeCount);
  const progress = leavingProgress(azimuth);
  if (progress !== null) return climbOutlet(progress, azimuth, layout, spots, out);
  const drifted = wrapDegrees(azimuth - RELEASE_AZIMUTH_DEG) - CHANNEL_TRAVEL_DEG;
  if (drifted < 0 || drifted >= PROTON_FORM.driftDeg) return hide(out);
  const share = drifted / PROTON_FORM.driftDeg;
  setLerp(out.position, spots.outletMouth, spots.driftEnd, share);
  out.scale = 1 - smoothstep(share, PROTON_FORM.fadeFrom, 1);
  return out;
}

function climbOutlet(
  progress: number,
  azimuth: number,
  layout: RingLayout,
  spots: ChannelSpots,
  out: BeadPose,
): BeadPose {
  const { dropShare } = PROTON_FORM;
  if (progress < dropShare) {
    setLerp(out.position, riderSpot(azimuth, layout), spots.outletBase, progress / dropShare);
  } else {
    setLerp(out.position, spots.outletBase, spots.outletMouth, between(progress, dropShare, 1));
  }
  out.scale = 1;
  return out;
}

export function posePumped(lane: PumpLane, progress: number, out: BeadPose): BeadPose {
  const { descendShare, appearShare, fadeFrom } = PUMPED_FLOW;
  if (progress < descendShare) {
    setLerp(out.position, lane.top, lane.bottom, progress / descendShare);
  } else {
    setLerp(out.position, lane.bottom, lane.out, between(progress, descendShare, 1));
  }
  out.scale = smoothstep(progress, 0, appearShare) * (1 - smoothstep(progress, fadeFrom, 1));
  return out;
}
