import { Group } from 'three';
import { UNDIMMED_GROUP } from '@core/scene/materials';
import { bushesGeometry, scatterBushes } from '../../geometry/site/bushes';
import {
  SCRUB_CARDS,
  TREE_LINE,
  bushCardMap,
  cardsGeometry,
  scatterScrubCards,
  scatterTreeLine,
  treeCardMap,
} from '../../geometry/site/cards';
import { groundGeometry } from '../../geometry/site/groundGrid';
import { scrubMap } from '../../geometry/site/scrub';
import { trackMap, tracksGeometry } from '../../geometry/site/tracks';
import { partMesh } from '../context';
import type { PartContext } from '../context';
import { WORLD_FINISHES, cardFinish, decalFinish, groundFinish } from './finishes';

export function createGround(context: PartContext): Group {
  const ground = new Group();
  ground.name = 'ground';
  const { tracker } = context;
  const scrub = tracker.track(scrubMap());
  const bushCards = tracker.track(bushCardMap());
  const treeCards = tracker.track(treeCardMap());
  const tracks = tracker.track(trackMap());
  ground.add(
    partMesh(context, groundGeometry(), UNDIMMED_GROUP, groundFinish(scrub)),
    partMesh(context, tracksGeometry(), UNDIMMED_GROUP, decalFinish(tracks)),
    partMesh(context, bushesGeometry(scatterBushes()), UNDIMMED_GROUP, WORLD_FINISHES.bushes),
    partMesh(
      context,
      cardsGeometry(scatterScrubCards(), SCRUB_CARDS.sink, SCRUB_CARDS.tint),
      UNDIMMED_GROUP,
      cardFinish(bushCards),
    ),
    partMesh(
      context,
      cardsGeometry(scatterTreeLine(), TREE_LINE.sink, TREE_LINE.tint),
      UNDIMMED_GROUP,
      cardFinish(treeCards),
    ),
  );
  return ground;
}
