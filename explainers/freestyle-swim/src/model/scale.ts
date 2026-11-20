export const HEIGHT_M = 1.88;

export const SEGMENT_SHARE = {
  upperArm: 0.14881,
  forearm: 0.15645,
  hand: 0.10159,
  thigh: 0.24324,
  shank: 0.24371,
  foot: 0.11486,
  footWidth: 0.055,
  trunk: 0.29774,
  head: 0.182,
  hipWidth: 0.191,
  chestWidth: 0.174,
  shoulderSpacing: 0.21539,
  hipSpacing: 0.09509,
} as const;

export type SegmentId = keyof typeof SEGMENT_SHARE;

export const SEGMENT_M: Readonly<Record<SegmentId, number>> = Object.fromEntries(
  Object.entries(SEGMENT_SHARE).map(([id, share]) => [id, share * HEIGHT_M]),
) as Record<SegmentId, number>;

export const HAND_WIDTH_M = 0.08;
export const BODY_DEPTH_M = 0.075;
export const HEAD_UP_PITCH_DEG = 8;
export const HEAD_UP_LIFT_M = 0.03;
