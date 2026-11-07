import type { PartContext, Section } from '../context';
import { namedGroup } from '../context';

export function createInset(context: PartContext): Section {
  void context;
  return { root: namedGroup('inset'), setState: () => undefined };
}
