import type { Group } from 'three';
import type { AssemblyState, PartId, Point } from '../../../../ids';
import { label, namedGroup } from '../../context';
import type { Motion, PartContext } from '../../context';

export interface Interior {
  readonly root: Group;
  setState(state: AssemblyState): void;
  animate(motion: Motion): void;
}

const INTERIOR_LABELS: readonly (readonly [PartId, Point])[] = [
  ['bedplate', [-1, 103.5, 0]],
  ['mainBearing', [-3.6, 105, 0]],
  ['mainShaft', [-2.7, 105, 0]],
  ['gearbox', [0.7, 105, 0]],
  ['brakeDisc', [2.6, 105, 0]],
  ['generator', [4.4, 105, 0]],
  ['converter', [7, 105, -1.8]],
  ['yawDrives', [0, 103.3, 1.9]],
];

export function buildInterior(context: PartContext): Interior {
  const root = namedGroup('interior');
  INTERIOR_LABELS.forEach(([part, point]) => label(context, part, root, point));
  return { root, setState: () => undefined, animate: () => undefined };
}
