import { Vector4 } from 'three';
import { PLAYED_KEY, keyX } from '../../../model';
import { isCloseView } from '../closeLook';
import { label, namedGroup, sceneAnchor } from '../context';
import type { PartContext, Section } from '../context';
import { keyCentred } from '../ghosts/shapes';
import type { InsetClip } from './clip';
import { buildMagnified } from './magnified';
import { buildLeader, buildPanel, insetInk } from './panel';
import { clipBounds, labelPoint, leaderFor, panelCentre } from './window';
import type { InsetPlace } from './window';

const REFERENCE_KEY = PLAYED_KEY.middle;
const PLACES: readonly InsetPlace[] = ['open', 'close'];

export function createInset(context: PartContext): Section {
  const root = namedGroup('inset');
  const content = namedGroup('insetContent', root);
  const clip: InsetClip = { value: new Vector4() };
  const panel = namedGroup('insetPanel', content);
  const ink = insetInk(context);
  const leaders = new Map(
    PLACES.map((place) => {
      const leader = leaderFor(REFERENCE_KEY, place);
      return [place, buildLeader(context, ink, leader, panelCentre(REFERENCE_KEY, place))];
    }),
  );
  panel.add(...buildPanel(context, ink), ...leaders.values());
  const magnified = buildMagnified(context, clip, REFERENCE_KEY);
  panel.add(magnified.root);
  const insetLabel = label(context, 'inset', content, [0, 0, 0]);
  const anchor = sceneAnchor(context, 'inset', root, [0, 0, 0]);
  let key = REFERENCE_KEY;

  function placeAt(place: InsetPlace): void {
    const centre = keyCentred(panelCentre(REFERENCE_KEY, place), REFERENCE_KEY);
    panel.position.set(...centre);
    clip.value.set(...clipBounds(centre));
    insetLabel.position.set(...labelPoint(centre, place));
    anchor.position.set(...centre);
    leaders.forEach((leader, shown) => (leader.visible = shown === place));
  }

  placeAt('open');

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
    focus(view) {
      placeAt(isCloseView(view) ? 'close' : 'open');
    },
    warmUp(compile) {
      compile(content);
    },
  };
}
