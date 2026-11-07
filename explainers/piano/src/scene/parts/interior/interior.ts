import type { PartContext, Section } from '../context';
import { namedGroup } from '../context';

export function createInterior(context: PartContext): Section {
  void context;
  return { root: namedGroup('interior'), setState: () => undefined };
}
