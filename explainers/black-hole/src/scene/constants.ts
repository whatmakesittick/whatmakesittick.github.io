export const HORIZON_RADIUS = 1;
export const DISC_INNER_RADIUS = 3;
export const DISC_OUTER_RADIUS = 13;

export const SKY = {
  radius: 900,
  widthSegments: 24,
  heightSegments: 12,
  renderOrder: -10,
} as const;

export const HERO_CAMERA = { position: [0, 3.6, 34], target: [0, 0, 0] } as const;
export const SCENE_EXTENT = DISC_OUTER_RADIUS * 2;
export const NO_FLOOR = -1e6;
