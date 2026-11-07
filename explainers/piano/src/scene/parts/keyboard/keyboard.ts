import type { PartContext, Section } from '../context';
import { namedGroup } from '../context';

export function createKeyboard(context: PartContext): Section {
  void context;
  return { root: namedGroup('keyboard'), setState: () => undefined };
}
