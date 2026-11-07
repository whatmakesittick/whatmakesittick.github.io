import type { PartContext, Section } from '../context';
import { namedGroup } from '../context';

export function createCase(context: PartContext): Section {
  void context;
  return { root: namedGroup('case'), setState: () => undefined };
}
