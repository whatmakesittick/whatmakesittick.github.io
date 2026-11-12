import { Group } from 'three';
import { UNDIMMED_GROUP } from '@core/scene/materials';
import type { Steps } from '@core/scene/pacing';
import { bushesGeometry, scatterBushes } from '../../geometry/site/bushes';
import {
  SCRUB_CARDS,
  TREE_LINE,
  cardsGeometry,
  scatterScrubCards,
  scatterTreeLine,
} from '../../geometry/site/cards';
import { groundGeometry } from '../../geometry/site/groundGrid';
import { tracksGeometry } from '../../geometry/site/tracks';
import { partMesh } from '../context';
import type { WorldContext } from '../context';
import { WORLD_FINISHES, cardFinish, decalFinish, groundFinish } from './finishes';

export function* createGround(context: WorldContext): Steps<Group> {
  const ground = new Group();
  ground.name = 'ground';
  const { scrub, bushCards, treeCards, tracks } = context.site;
  ground.add(partMesh(context, groundGeometry(), UNDIMMED_GROUP, groundFinish(scrub)));
  yield;
  ground.add(partMesh(context, tracksGeometry(), UNDIMMED_GROUP, decalFinish(tracks)));
  yield;
  ground.add(
    partMesh(context, bushesGeometry(scatterBushes()), UNDIMMED_GROUP, WORLD_FINISHES.bushes),
  );
  yield;
  ground.add(
    partMesh(
      context,
      cardsGeometry(scatterScrubCards(), SCRUB_CARDS.sink, SCRUB_CARDS.tint),
      UNDIMMED_GROUP,
      cardFinish(bushCards),
    ),
  );
  yield;
  ground.add(
    partMesh(
      context,
      cardsGeometry(scatterTreeLine(), TREE_LINE.sink, TREE_LINE.tint),
      UNDIMMED_GROUP,
      cardFinish(treeCards),
    ),
  );
  return ground;
}
