import { INSET_CENTRE } from '../../../model';
import { label, namedGroup, sceneAnchor } from '../context';
import type { PartContext, Section } from '../context';

export const INSET_NAME = 'gapInset';

export function buildInset(context: PartContext): Section {
  const root = namedGroup(INSET_NAME);
  sceneAnchor(context, 'inset', root, INSET_CENTRE);
  label(context, 'gapInset', root, INSET_CENTRE);
  return {
    root,
    setState(state) {
      root.visible = state.view.gap;
    },
  };
}
