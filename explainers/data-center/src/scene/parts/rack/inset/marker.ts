import type { Group } from 'three';
import { clamp, lerp } from '@core/math';
import type { AssemblyState } from '../../../../ids';
import { MOMENTS } from '../../../../model';
import { namedGroup } from '../../context';
import type { PartContext } from '../../context';
import { LAYER, flatMesh } from './flat';
import type { Ink } from './flat';
import { CURRENT_AT, HEAT_PATH, MARKER } from './layout';
import type { Point2 } from './layout';
import { INK } from './ink';
import { discs } from './strokes';

export const HEAT_MARKER_NAME = 'chipInsetHeat';
export const CURRENT_MARKER_NAME = 'chipInsetCurrent';

const ORIGIN: Point2 = [0, 0];
const STEP_UNITS = MOMENTS.inCoolant - MOMENTS.becomesHeat;

export interface ChipMarkers {
  readonly group: Group;
  setState(state: AssemblyState): void;
}

function glowDot(context: PartContext, name: string, core: Ink, halo: Ink): Group {
  const group = namedGroup(name);
  group.add(
    flatMesh(context, discs([ORIGIN], MARKER.halo), halo, LAYER.halo),
    flatMesh(context, discs([ORIGIN], MARKER.core), core, LAYER.core),
  );
  return group;
}

export function pointAlong(path: readonly Point2[], share: number): Point2 {
  const legs = path.slice(1).map((end, index) => [path[index], end] as const);
  const lengths = legs.map(([[ax, ay], [bx, by]]) => Math.hypot(bx - ax, by - ay));
  let left = clamp(share, 0, 1) * lengths.reduce((sum, value) => sum + value, 0);
  for (const [index, [[ax, ay], [bx, by]]] of legs.entries()) {
    const along = lengths[index] > 0 ? Math.min(left / lengths[index], 1) : 1;
    if (along < 1 || index === legs.length - 1) return [lerp(ax, bx, along), lerp(ay, by, along)];
    left -= lengths[index];
  }
  return path[0];
}

export function chipMarkers(context: PartContext): ChipMarkers {
  const group = namedGroup('chipInsetMarkers');
  const heat = glowDot(context, HEAT_MARKER_NAME, INK.heat, INK.heatHalo);
  const current = glowDot(context, CURRENT_MARKER_NAME, INK.current, INK.currentHalo);
  current.position.set(...CURRENT_AT, 0);
  group.add(heat, current);
  return {
    group,
    setState(state) {
      const { carrier, form } = state.joule;
      const share = (state.phase - MOMENTS.becomesHeat) / STEP_UNITS;
      current.visible = carrier === 'chip' && form === 'current';
      heat.visible = share >= 0 && share < 1;
      heat.position.set(...pointAlong(HEAT_PATH[state.cooling], share), 0);
    },
  };
}
