import { lerp, smoothstep, toRadians } from '@core/math';
import type { Point } from '../ids';
import { BITE_SPOT, SPOON_STOPS, THROAT_EXIT, TONGUE_LIFT_CM } from '../model/layout';
import type { SpoonStopId } from '../model/layout';
import { MOMENTS, secondsAt } from '../model/timeMap';

export type Vector = [x: number, y: number, z: number];

export interface SpoonPose {
  position: Vector;
  tilt: number;
  visible: boolean;
}

export interface BitePose {
  position: Vector;
  scale: number;
  visible: boolean;
}

interface SpoonKey {
  seconds: number;
  stop: SpoonStopId;
  tiltDeg: number;
}

const OUT_TILT_DEG = 15;
const AWAY_TILT_DEG = 30;

export const SPOON_KEYS: readonly SpoonKey[] = [
  { seconds: -2, stop: 'sniff', tiltDeg: 0 },
  { seconds: -1.2, stop: 'sniff', tiltDeg: 0 },
  { seconds: -0.4, stop: 'lips', tiltDeg: 0 },
  { seconds: 0, stop: 'inMouth', tiltDeg: 0 },
  { seconds: 0.6, stop: 'lips', tiltDeg: OUT_TILT_DEG },
  { seconds: 1.4, stop: 'away', tiltDeg: AWAY_TILT_DEG },
];

export const IN_MOUTH_S = secondsAt(MOMENTS.inMouth);
export const SWALLOW_S = secondsAt(MOMENTS.swallow);
export const SPOON_GONE_S = SPOON_KEYS[SPOON_KEYS.length - 1].seconds;
export const BITE_DROP_S = 0.4;
export const SWALLOW_SLIDE_S = 0.8;
export const BITE_GONE_S = SWALLOW_S + SWALLOW_SLIDE_S;
export const BITE_MELT_SHRINK = 0.5;
export const BITE_ON_BOWL_LIFT_CM = 0.6;

export const LIFT_TIMES_S = { up: 0.4, holdEnd: 0.6, down: 1.2 } as const;

const LIFT_RISE = { start: SWALLOW_S, end: SWALLOW_S + LIFT_TIMES_S.up } as const;
const LIFT_FALL = {
  start: SWALLOW_S + LIFT_TIMES_S.holdEnd,
  end: SWALLOW_S + LIFT_TIMES_S.down,
} as const;

function lerpPoint(from: Point, to: Point, share: number, out: Vector): Vector {
  out[0] = lerp(from[0], to[0], share);
  out[1] = lerp(from[1], to[1], share);
  out[2] = lerp(from[2], to[2], share);
  return out;
}

function segmentAt(seconds: number): number {
  const next = SPOON_KEYS.findIndex((key) => seconds < key.seconds);
  if (next === -1) return SPOON_KEYS.length - 2;
  return Math.max(0, next - 1);
}

export function spoonPose(
  seconds: number,
  out: SpoonPose = { position: [0, 0, 0], tilt: 0, visible: true },
): SpoonPose {
  const index = segmentAt(seconds);
  const from = SPOON_KEYS[index];
  const to = SPOON_KEYS[index + 1];
  const share = smoothstep(seconds, from.seconds, to.seconds);
  lerpPoint(SPOON_STOPS[from.stop], SPOON_STOPS[to.stop], share, out.position);
  out.tilt = toRadians(lerp(from.tiltDeg, to.tiltDeg, share));
  out.visible = seconds <= SPOON_GONE_S;
  return out;
}

export function tongueLift(seconds: number): number {
  return (
    smoothstep(seconds, LIFT_RISE.start, LIFT_RISE.end) *
    (1 - smoothstep(seconds, LIFT_FALL.start, LIFT_FALL.end))
  );
}

export function tongueLiftCm(seconds: number): number {
  return tongueLift(seconds) * TONGUE_LIFT_CM;
}

const ON_BOWL: Vector = [0, 0, 0];

function bowlPoint(seconds: number, out: Vector): Vector {
  const spoon = spoonPose(Math.min(seconds, IN_MOUTH_S));
  out[0] = spoon.position[0];
  out[1] = spoon.position[1] + BITE_ON_BOWL_LIFT_CM;
  out[2] = spoon.position[2];
  return out;
}

export function bitePose(
  seconds: number,
  melt: number,
  out: BitePose = { position: [0, 0, 0], scale: 1, visible: true },
): BitePose {
  if (seconds < IN_MOUTH_S) {
    bowlPoint(seconds, out.position);
  } else if (seconds < SWALLOW_S) {
    const drop = smoothstep(seconds, IN_MOUTH_S, IN_MOUTH_S + BITE_DROP_S);
    lerpPoint(bowlPoint(IN_MOUTH_S, ON_BOWL), BITE_SPOT, drop, out.position);
  } else {
    const slide = smoothstep(seconds, SWALLOW_S, BITE_GONE_S);
    lerpPoint(BITE_SPOT, THROAT_EXIT, slide, out.position);
    out.position[1] += tongueLiftCm(seconds);
  }
  out.scale = 1 - BITE_MELT_SHRINK * melt;
  out.visible = seconds < BITE_GONE_S;
  return out;
}
