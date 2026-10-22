import type { Point } from '../../../ids';

export const LABEL_POINTS = {
  train: [37.2, 13.6, 0],
  wrapArms: [53.025, 9.55, -1.79],
  supportMagnets: [53.8, 9.49, -1.25],
  guidanceMagnets: [53.8, 9.62, -1.53],
  eddyBrakes: [-61.55, 9.62, 1.53],
  skids: [56.35, 10.25, -1.1],
} as const satisfies Record<string, Point>;
