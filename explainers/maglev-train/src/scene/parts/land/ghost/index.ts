import { namedGroup } from '../../context';
import type { PartContext, Section } from '../../context';
import { buildTrack } from './track';
import { buildGhostTrain } from './ghostTrain';

export function buildGhost(context: PartContext): Section {
  const root = namedGroup('ghost');
  const sections = [buildTrack(context), buildGhostTrain(context)];
  sections.forEach((section) => root.add(section.root));
  return { root, setState: (state) => sections.forEach((section) => section.setState(state)) };
}
