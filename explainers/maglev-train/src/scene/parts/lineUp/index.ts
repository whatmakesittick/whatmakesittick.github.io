import type { AssemblyState } from '../../../ids';
import { ANCHOR_POINTS, CUT_X, LINE_UP, LINE_UP_SPACING, TRAIN, mm } from '../../../model';
import { label, namedGroup, sceneAnchor } from '../context';
import type { PartContext, Section } from '../context';

const SCMAGLEV_TOP = LINE_UP.plinthTop + mm(LINE_UP.scmaglev.gapMm) + LINE_UP.scmaglev.height;

export function buildLineUp(context: PartContext): Section {
  const root = namedGroup('lineUp');
  label(context, 'scmaglev', root, [CUT_X, SCMAGLEV_TOP, -LINE_UP_SPACING]);
  label(context, 'wheelRail', root, [CUT_X, LINE_UP.plinthTop + TRAIN.height, LINE_UP_SPACING]);
  label(context, 'gapCallouts', root, [CUT_X, LINE_UP.plinthTop, -LINE_UP_SPACING]);
  sceneAnchor(context, 'lineUp', root, ANCHOR_POINTS.lineUp);
  return {
    root,
    setState(state: AssemblyState) {
      root.visible = state.view.lineUp;
    },
  };
}
