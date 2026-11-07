import type { PartContext, Section } from '../context';
import { namedGroup } from '../context';

export function createStage(context: PartContext): Section {
  void context;
  return { root: namedGroup('stage'), setState: () => undefined };
}
