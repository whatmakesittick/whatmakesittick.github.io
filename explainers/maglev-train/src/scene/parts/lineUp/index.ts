import { ANCHOR_POINTS, CUT_X, LINE_UP, LINE_UP_SPACING } from '../../../model';
import { label, namedGroup, sceneAnchor } from '../context';
import type { PartContext, Section } from '../context';

export const LINE_UP_NAME = 'lineUp';

export function buildLineUp(context: PartContext): Section {
  const root = namedGroup(LINE_UP_NAME);
  sceneAnchor(context, 'lineUp', root, ANCHOR_POINTS.lineUp);
  label(context, 'scmaglev', root, [CUT_X, LINE_UP.plinthTop, -LINE_UP_SPACING]);
  label(context, 'wheelRail', root, [CUT_X, LINE_UP.plinthTop, LINE_UP_SPACING]);
  label(context, 'gapCallouts', root, [CUT_X, LINE_UP.plinthTop, 0]);
  return {
    root,
    setState(state) {
      root.visible = state.view.lineUp;
    },
  };
}
