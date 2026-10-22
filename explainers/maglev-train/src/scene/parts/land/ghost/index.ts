import { namedGroup } from '../../context';
import type { PartContext, Section } from '../../context';
import { buildGhostTrain } from './ghostTrain';

export function buildGhost(context: PartContext): Section {
  const root = namedGroup('ghost');
  const train = buildGhostTrain(context);
  root.add(train.root);
  return { root, setState: (state) => train.setState(state) };
}
