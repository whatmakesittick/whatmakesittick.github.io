import { Group, Shape, Vector2 } from 'three';
import type { BufferGeometry, Object3D } from 'three';
import { FEED_DOG_TIP, PLATE_BOTTOM } from '../../model';
import type { FeedDogPosition } from '../../model';
import { FEED_DOGS } from '../constants';
import { extrudeProfileAlongX } from '../geometry/extrude';
import { box } from '../geometry/primitives';
import { anchorAt, partMesh } from './context';
import type { PartContext } from './context';

export interface FeedDogsPart {
  object: Group;
  labelAnchor: Object3D;
  setPosition(position: FeedDogPosition): void;
}

const CROSS_TOP = PLATE_BOTTOM - FEED_DOG_TIP.raised;
const LABEL_Z_SHARE = 0.6;

function toothProfile(): Shape {
  const { front, back, height, toothHeight, toothPitch } = FEED_DOGS;
  const points = [new Vector2(front, -height), new Vector2(front, 0)];
  for (let z = front - toothPitch; z > back; z -= toothPitch) {
    points.push(new Vector2(z, -toothHeight), new Vector2(z, 0));
  }
  points.push(new Vector2(back, -toothHeight), new Vector2(back, -height));
  return new Shape(points);
}

function barGeometry(x: number): BufferGeometry {
  return extrudeProfileAlongX(
    toothProfile(),
    x - FEED_DOGS.barHalfWidth,
    x + FEED_DOGS.barHalfWidth,
  );
}

function crossGeometry(): BufferGeometry {
  const { x, barHalfWidth, back, crossDepth, crossHeight } = FEED_DOGS;
  return box({
    minX: -x - barHalfWidth,
    maxX: x + barHalfWidth,
    minY: CROSS_TOP - crossHeight,
    maxY: CROSS_TOP,
    minZ: back,
    maxZ: back + crossDepth,
  });
}

export function createFeedDogs(context: PartContext): FeedDogsPart {
  const object = new Group();
  [barGeometry(-FEED_DOGS.x), barGeometry(FEED_DOGS.x), crossGeometry()].forEach((geometry) =>
    object.add(partMesh(context, geometry, 'feedDogs', 'darkSteel')),
  );
  const labelAnchor = anchorAt(
    object,
    -FEED_DOGS.x,
    0,
    FEED_DOGS.front + (FEED_DOGS.back - FEED_DOGS.front) * LABEL_Z_SHARE,
  );
  return {
    object,
    labelAnchor,
    setPosition: ({ lift, shift }) => {
      object.position.set(0, lift, shift);
    },
  };
}
