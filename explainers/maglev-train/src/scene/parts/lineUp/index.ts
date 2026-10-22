import { ANCHOR_POINTS, CUT_X, LINE_UP } from '../../../model';
import { label, namedGroup, sceneAnchor } from '../context';
import type { PartContext, Section } from '../context';
import { buildScmaglev } from './scmaglev';
import { buildWheelRail } from './wheelRail';

export const LINE_UP_NAME = 'lineUp';

export function buildLineUp(context: PartContext): Section {
  const root = namedGroup(LINE_UP_NAME);
  sceneAnchor(context, 'lineUp', root, ANCHOR_POINTS.lineUp);
  label(context, 'gapCallouts', root, [CUT_X, LINE_UP.plinthTop, 0]);
  root.add(buildScmaglev(context), buildWheelRail(context));
  return {
    root,
    setState(state) {
      root.visible = state.view.lineUp;
    },
  };
}
