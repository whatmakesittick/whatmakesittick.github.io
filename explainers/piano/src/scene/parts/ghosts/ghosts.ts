import type { PartContext, Section } from '../context';
import { namedGroup } from '../context';

export function createGhosts(context: PartContext): Section {
  void context;
  return { root: namedGroup('ghosts'), setState: () => undefined };
}
