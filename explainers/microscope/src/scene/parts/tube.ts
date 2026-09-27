import type { Group, Object3D } from 'three';
import { anchorAt } from '@core/scene/parts';
import { SEGMENTS, TUBE } from '../constants';
import { FINISHES } from '../finishes';
import { cutSection, innerWall, ringSection } from '../geometry/lathe';
import { cutShell } from './context';
import type { PartContext } from './context';

export interface TubePart {
  object: Group;
  anchor: Object3D;
  setCutaway(cutaway: boolean): void;
}

const LABEL_SHARE = 0.55;

export function createTube(context: PartContext): TubePart {
  const shell = cutShell(
    context,
    cutSection(ringSection(TUBE.inner, TUBE.outer, TUBE.bottom, TUBE.top), SEGMENTS.round, {
      lining: innerWall(TUBE.inner, TUBE.bottom, TUBE.top),
    }),
    'tube',
    FINISHES.enamel,
  );
  const labelHeight = TUBE.bottom + (TUBE.top - TUBE.bottom) * LABEL_SHARE;
  return {
    object: shell.object,
    anchor: anchorAt(shell.object, 0, labelHeight, TUBE.outer),
    setCutaway: (cutaway) => shell.setCut(cutaway),
  };
}
