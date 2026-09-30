import { BufferGeometry, Line, LineDashedMaterial } from 'three';
import { STRUCTURE_GROUP } from '@core/scene/materials';
import { HORIZON_RADIUS, RELEASE_RADIUS } from '../../model';
import { THEME } from '../../theme';
import { FALL_LINE } from '../constants';
import { probePosition } from '../layout';
import { registered } from './context';
import type { PartContext } from './context';

export class FallLinePart {
  readonly object: Line;

  constructor(context: PartContext) {
    const material = registered(
      context,
      STRUCTURE_GROUP,
      new LineDashedMaterial({
        color: THEME.fallLine,
        dashSize: FALL_LINE.dash,
        gapSize: FALL_LINE.gap,
        transparent: true,
        opacity: FALL_LINE.opacity,
        depthWrite: false,
      }),
    );
    const geometry = context.tracker.track(
      new BufferGeometry().setFromPoints([
        probePosition(RELEASE_RADIUS),
        probePosition(HORIZON_RADIUS),
      ]),
    );
    this.object = new Line(geometry, material);
    this.object.computeLineDistances();
  }
}
