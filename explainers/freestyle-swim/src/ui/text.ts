import { t } from '@core/i18n';
import type { ArmReading, PaceId, StrokeReading } from '../ids';
import { armGapText } from '../state';
import { phaseKey } from '../timeline';
import { formatDegrees, formatMeters } from './format';

export type RollSide = 'right' | 'left';

const NO_ELBOW_KEY = 'chapters.catch.noElbow';
const IN_AIR_KEY = 'chapters.catch.inAir';
const DRAG_UP_KEY = 'chapters.drag.dragUp';
const SIDE_KEYS: Record<RollSide, string> = {
  right: 'chapters.roll.sideRight',
  left: 'chapters.roll.sideLeft',
};
const LEG_KEYS: Record<RollSide, string> = {
  right: 'chapters.kick.right',
  left: 'chapters.kick.left',
};
const DOWNBEAT_SHARE = 0.5;

let lastSide: RollSide = 'right';

export function elbowText(arm: ArmReading): string {
  return arm.elbowDeg === null ? t(NO_ELBOW_KEY) : formatDegrees(arm.elbowDeg);
}

export function depthText(arm: ArmReading): string {
  return arm.handDepthM === null ? t(IN_AIR_KEY) : formatMeters(arm.handDepthM);
}

export function phaseText(arm: ArmReading): string {
  return t(phaseKey(arm.phase));
}

export function dragUpText(): string {
  return t(DRAG_UP_KEY);
}

export function gapText(pace: PaceId): string {
  const { key, params } = armGapText(pace);
  return t(key, params);
}

export function pullingArm(reading: StrokeReading): ArmReading {
  return reading[reading.pullingHand];
}

export function rollSide(reading: Pick<StrokeReading, 'shoulderRollDeg'>): RollSide {
  const roll = Math.round(reading.shoulderRollDeg);
  if (roll > 0) lastSide = 'right';
  if (roll < 0) lastSide = 'left';
  return lastSide;
}

export function sideText(reading: Pick<StrokeReading, 'shoulderRollDeg'>): string {
  return t(SIDE_KEYS[rollSide(reading)]);
}

export function downbeatLeg(reading: StrokeReading): RollSide {
  return reading.legs.left.phase < DOWNBEAT_SHARE ? 'left' : 'right';
}

export function legText(reading: StrokeReading): string {
  return t('chapters.kick.legDown', { leg: t(LEG_KEYS[downbeatLeg(reading)]) });
}
