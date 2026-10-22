import type { AssemblyState } from '../../../ids';
import { INSET, INSET_CENTRE } from '../../../model';
import { label, namedGroup, sceneAnchor } from '../context';
import type { PartContext, Section } from '../context';

export function buildInset(context: PartContext): Section {
  const root = namedGroup('inset');
  const [x, y, z] = INSET_CENTRE;
  label(context, 'gapInset', root, [x, y + INSET.height / 2, z]);
  sceneAnchor(context, 'inset', root, INSET_CENTRE);
  return {
    root,
    setState(state: AssemblyState) {
      root.visible = state.view.gap;
    },
  };
}
