import type { Box3 } from 'three';
import { Vector3 } from 'three';
import { frameBox } from '@core/scene/frameBox';
import type { CameraPose } from '@core/scene/frameBox';
import type { FramingSlopes } from '@core/scene/lens';
import { SUN_DISC_RADIUS_CM } from '../../model';
import { SKY_VIEW } from '../constants';
import { arcPoints } from './sunArc';

export function skyViewBox(array: Box3): Box3 {
  const box = array.clone();
  arcPoints(SKY_VIEW.stepMinutes).forEach((point) => box.expandByPoint(point));
  return box.expandByScalar(SUN_DISC_RADIUS_CM);
}

export function skyViewPose(array: Box3, slopes: FramingSlopes): CameraPose {
  const direction = new Vector3(...SKY_VIEW.direction).normalize();
  return frameBox(skyViewBox(array), direction, slopes, SKY_VIEW.margin);
}
