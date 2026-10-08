import type { AnchorId, PartId, Point } from '../../ids';
import { label, namedGroup, sceneAnchor } from './context';
import type { PartContext, Section } from './context';

const ORIGIN: Point = [0, 0, 0];

export function stubSection(
  context: PartContext,
  name: string,
  parts: readonly PartId[],
  anchors: readonly AnchorId[] = [],
): Section {
  const root = namedGroup(name);
  parts.forEach((part) => label(context, part, root, ORIGIN));
  anchors.forEach((id) => sceneAnchor(context, id, root, ORIGIN));
  return { root, setState: () => undefined };
}
