export const HEIGHT_M = 1.88;

export const SEGMENT_SHARE = {
  upperArm: 0.186,
  forearm: 0.146,
  hand: 0.108,
  thigh: 0.245,
  shank: 0.246,
  foot: 0.152,
  footWidth: 0.055,
  trunk: 0.288,
  head: 0.182,
  hipWidth: 0.191,
  chestWidth: 0.174,
  shoulderSpacing: 0.21,
} as const;

export type SegmentId = keyof typeof SEGMENT_SHARE;

export const SEGMENT_M: Readonly<Record<SegmentId, number>> = Object.fromEntries(
  Object.entries(SEGMENT_SHARE).map(([id, share]) => [id, share * HEIGHT_M]),
) as Record<SegmentId, number>;

export const HAND_WIDTH_M = 0.08;
export const BODY_DEPTH_M = 0.12;
export const HEAD_UP_PITCH_DEG = 8;
export const HEAD_UP_LIFT_M = 0.03;
