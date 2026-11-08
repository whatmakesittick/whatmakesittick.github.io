import { Vector4 } from 'three';
import { PLAYED_KEY, keyX } from '../../../model';
import { label, namedGroup, sceneAnchor } from '../context';
import type { PartContext, Section } from '../context';
import { keyCentred } from '../ghosts/shapes';
import type { InsetClip } from './clip';
import { buildMagnified } from './magnified';
import { buildPanel } from './panel';
import { clipBounds, labelPoint, leaderFor, panelCentre } from './window';

const REFERENCE_KEY = PLAYED_KEY.middle;

export function createInset(context: PartContext): Section {
  const root = namedGroup('inset');
  const content = namedGroup('insetContent', root);
  const centre = keyCentred(panelCentre(REFERENCE_KEY), REFERENCE_KEY);
  const leader = leaderFor(REFERENCE_KEY);
  const clip: InsetClip = { value: new Vector4(...clipBounds(centre)) };
  const panel = namedGroup('insetPanel', content);
  panel.position.set(...centre);
  panel.add(...buildPanel(context, panelCentre(REFERENCE_KEY), leader));
  const magnified = buildMagnified(context, clip, REFERENCE_KEY);
  panel.add(magnified.root);
  label(context, 'inset', content, labelPoint(centre));
  sceneAnchor(context, 'inset', root, centre);
  let key = REFERENCE_KEY;

  return {
    root,
    setState(state) {
      content.visible = state.view.inset;
      const played = PLAYED_KEY[state.register];
      if (played !== key) {
        key = played;
        magnified.setKey(played);
      }
      root.position.x = keyX(played);
      magnified.pose(state.action);
    },
    warmUp(compile) {
      compile(content);
    },
  };
}
