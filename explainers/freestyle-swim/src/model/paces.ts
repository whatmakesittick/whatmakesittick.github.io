import type { KickId, PaceId } from '../ids';

export interface PaceBundle {
  strokeRate: number;
  strokeLengthM: number;
  idcPercent: number;
  hipRollDeg: number;
  shoulderRollDeg: number;
  pullKeyDepthM: number;
  defaultKick: KickId;
}

export const DEFAULT_PACE: PaceId = 'middle';

export const PACES: Readonly<Record<PaceId, PaceBundle>> = {
  easy: {
    strokeRate: 36,
    strokeLengthM: 2.4,
    idcPercent: -7.6,
    hipRollDeg: 25,
    shoulderRollDeg: 50,
    pullKeyDepthM: 0.44,
    defaultKick: 'two',
  },
  middle: {
    strokeRate: 42,
    strokeLengthM: 2.4,
    idcPercent: -3.2,
    hipRollDeg: 25,
    shoulderRollDeg: 50,
    pullKeyDepthM: 0.46,
    defaultKick: 'six',
  },
  sprint: {
    strokeRate: 60,
    strokeLengthM: 2.1,
    idcPercent: 3.8,
    hipRollDeg: 18,
    shoulderRollDeg: 50,
    pullKeyDepthM: 0.64,
    defaultKick: 'six',
  },
};

const SECONDS_PER_MINUTE = 60;
const PERCENT = 100;

export function paceSpeed(pace: PaceId): number {
  const { strokeRate, strokeLengthM } = PACES[pace];
  return (strokeRate / SECONDS_PER_MINUTE) * strokeLengthM;
}

export function cycleSeconds(pace: PaceId): number {
  return SECONDS_PER_MINUTE / PACES[pace].strokeRate;
}

export type ArmGapKind = 'gap' | 'overlap';

export interface ArmGap {
  idcPercent: number;
  seconds: number;
  kind: ArmGapKind;
}

export function armGap(pace: PaceId): ArmGap {
  const { idcPercent } = PACES[pace];
  return {
    idcPercent,
    seconds: (Math.abs(idcPercent) / PERCENT) * cycleSeconds(pace),
    kind: idcPercent < 0 ? 'gap' : 'overlap',
  };
}
