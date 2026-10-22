import { INSET_CENTRE } from '../../../model';
import { namedGroup, sceneAnchor } from '../context';
import type { PartContext, Section } from '../context';
import { InsetDrawing } from './drawing';
import { buildLeader } from './leader';

export const INSET_NAME = 'gapInset';

export function buildInset(context: PartContext): Section {
  const root = namedGroup(INSET_NAME);
  const drawing = new InsetDrawing(context);
  root.add(drawing.panel, ...buildLeader(context));
  sceneAnchor(context, 'inset', root, INSET_CENTRE);
  return {
    root,
    setState(state) {
      root.visible = state.view.gap;
      drawing.apply(state);
    },
    animate(frame, state) {
      if (!state.view.gap) return false;
      return drawing.advance(frame);
    },
  };
}
