import { ANCHOR_POINTS } from '../../../model';
import { namedGroup, sceneAnchor } from '../context';
import type { PartContext, Section } from '../context';
import { buildCallouts } from './callouts';
import { buildScmaglev } from './scmaglev';
import { buildWheelRail } from './wheelRail';

export const LINE_UP_NAME = 'lineUp';

export function buildLineUp(context: PartContext): Section {
  const root = namedGroup(LINE_UP_NAME);
  sceneAnchor(context, 'lineUp', root, ANCHOR_POINTS.lineUp);
  root.add(buildScmaglev(context), buildWheelRail(context), buildCallouts(context));
  return {
    root,
    setState(state) {
      root.visible = state.view.lineUp;
    },
  };
}
