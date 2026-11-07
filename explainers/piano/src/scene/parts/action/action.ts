import type { PartContext, Section } from '../context';
import { namedGroup } from '../context';

export function createAction(context: PartContext): Section {
  void context;
  return { root: namedGroup('action'), setState: () => undefined };
}
