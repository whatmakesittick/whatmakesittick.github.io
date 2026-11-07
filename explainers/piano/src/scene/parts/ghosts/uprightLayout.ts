import type { UprightPose } from '../../../ids';
import { BLOW_MM, KEY, KEY_LEVER, UPRIGHT, mm } from '../../../model';
import { keyAngle, uprightHammerAngle } from '../../pose';
import { turnAbout } from './shapes';
import type { Planar } from './shapes';

export const KEY_BACK = UPRIGHT.offsetZ - KEY.length;
export const KEY_BOTTOM = KEY.top - KEY.thickness;
export const HEAD = { felt: 0.022, moulding: 0.012, height: 0.044, width: 0.012 } as const;
export const JACK_ESCAPE_ANGLE = 0.07;

const CROWN_AHEAD = HEAD.felt + HEAD.moulding / 2;
const HAMMER_Z = UPRIGHT.stringZ + mm(BLOW_MM) + CROWN_AHEAD;
const STRIKE_ANGLE = uprightHammerAngle(BLOW_MM);

export const HEAD_Y =
  UPRIGHT.hammerPivotY +
  (mm(BLOW_MM) + CROWN_AHEAD * (1 - Math.cos(STRIKE_ANGLE))) / -Math.sin(STRIKE_ANGLE);
const WIPPEN_PIVOT: Planar = [0.765, KEY_BACK + 0.008];
const CAPSTAN_Z = KEY_BACK + 0.065;
const DAMPER_PIVOT: Planar = [0.842, 0.15];

export const PIVOT = {
  key: [KEY_BOTTOM, UPRIGHT.offsetZ - KEY_LEVER.frontArm],
  wippen: WIPPEN_PIVOT,
  jack: [0.774, HAMMER_Z + 0.011],
  hammer: [UPRIGHT.hammerPivotY, HAMMER_Z],
  damper: DAMPER_PIVOT,
} as const satisfies Record<string, Planar>;

export const CAPSTAN = { z: CAPSTAN_Z, top: 0.755 } as const;
export const DAMPER_HEAD = { y: [0.88, 0.915], felt: 0.0095, block: 0.015 } as const;
export const STRAP = {
  catcher: [UPRIGHT.hammerPivotY + 0.004, HAMMER_Z + 0.056],
  wire: [0.838, HAMMER_Z + 0.063],
} as const satisfies Record<string, Planar>;

const CAPSTAN_KEY_ARM = PIVOT.key[1] - CAPSTAN_Z;
const CAPSTAN_WIPPEN_ARM = CAPSTAN_Z - WIPPEN_PIVOT[1];
const DAMPER_ARM = (DAMPER_HEAD.y[0] + DAMPER_HEAD.y[1]) / 2 - DAMPER_PIVOT[0];

export const CROWN_Z = HAMMER_Z - CROWN_AHEAD;

export function wippenAngle(keyMm: number): number {
  const rise = (mm(keyMm) * CAPSTAN_KEY_ARM) / KEY_LEVER.frontArm;
  return -Math.asin(rise / CAPSTAN_WIPPEN_ARM);
}

export function damperAngle(liftMm: number): number {
  return Math.asin(mm(liftMm) / DAMPER_ARM);
}

export interface UprightAngles {
  key: number;
  wippen: number;
  jack: number;
  hammer: number;
  rail: number;
  damper: number;
}

export function uprightAngles(pose: UprightPose): UprightAngles {
  return {
    key: keyAngle(pose.keyMm),
    wippen: wippenAngle(pose.keyMm),
    jack: pose.jackEscape * JACK_ESCAPE_ANGLE,
    hammer: uprightHammerAngle(pose.hammerTravelMm),
    rail: uprightHammerAngle(pose.restOffsetMm),
    damper: damperAngle(pose.damperLiftMm),
  };
}

export function strapEnds(angles: UprightAngles): [catcher: Planar, wire: Planar] {
  return [
    turnAbout(STRAP.catcher, PIVOT.hammer, angles.hammer),
    turnAbout(STRAP.wire, PIVOT.wippen, angles.wippen),
  ];
}
