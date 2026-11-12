import type { Batch } from '../fab/batch';
import { AXIS_X, rod, washer } from '../fab/shapes';
import { AXIS_Y, FOCUS_X } from './dims';

const GROUP = 'intermediateFocus';
const PLATE_T = 0.02;
const HOLE_R = 0.025;
const PLATE_R = 0.105;
const LOCK_X = FOCUS_X + 0.08;
const LOCK_T = 0.06;
const LOCK_OUTER = 0.26;
const COLLAR_T = 0.04;
const PORT_R = 0.03;
const NECK_R = 0.11;

export function buildFocus(batch: Batch): void {
  batch.add(GROUP, 'darkFrame', washer([FOCUS_X, AXIS_Y, 0], AXIS_X, HOLE_R, PLATE_R, PLATE_T));
  batch.add(
    GROUP,
    'mirror',
    washer([FOCUS_X - PLATE_T, AXIS_Y, 0], AXIS_X, HOLE_R, PLATE_R * 0.8, 0.006),
  );
  batch.add(
    GROUP,
    'flange',
    washer([LOCK_X, AXIS_Y, 0], AXIS_X, NECK_R * 0.96, LOCK_OUTER, LOCK_T),
  );
  batch.add(
    GROUP,
    'darkFrame',
    washer([LOCK_X + LOCK_T / 2 + COLLAR_T / 2, AXIS_Y, 0], AXIS_X, NECK_R * 0.96, 0.17, COLLAR_T),
  );
  batch.add(
    GROUP,
    'accent',
    washer(
      [LOCK_X - LOCK_T / 2 - 0.01, AXIS_Y, 0],
      AXIS_X,
      LOCK_OUTER - 0.05,
      LOCK_OUTER + 0.004,
      0.02,
    ),
  );
  [1, -1].forEach((sign) => {
    const face = LOCK_X + sign * (LOCK_T / 2);
    batch.boltRing(
      GROUP,
      [face, AXIS_Y, 0],
      AXIS_X.clone().multiplyScalar(sign),
      LOCK_OUTER - 0.04,
      12,
      0.017,
    );
  });
  const top = AXIS_Y + NECK_R;
  batch.add(GROUP, 'darkFrame', rod([LOCK_X, top, 0], [LOCK_X, top + 0.22, 0], PORT_R, 10));
  batch.add(
    GROUP,
    'accent',
    rod([LOCK_X - 0.05, top + 0.12, 0], [LOCK_X + 0.05, top + 0.12, 0], 0.012, 8),
  );
  batch.add(
    GROUP,
    'flange',
    rod([LOCK_X, top + 0.22, 0], [LOCK_X, top + 0.25, 0], PORT_R * 1.5, 12),
  );
}
