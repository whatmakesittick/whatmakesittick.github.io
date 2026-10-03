import { DoubleSide, Group, Object3D } from 'three';
import type { Texture } from 'three';
import type { MaterialFinish } from '@core/scene/materials';
import { SHIP } from '../../../model/layout';
import { instanced, partMesh } from '../context';
import type { PartContext } from '../context';
import { wetSurface } from '../water/wetSurface';
import {
  RADAR,
  antenna,
  bollard,
  bollardSpots,
  chainLink,
  chainSpots,
  fittings,
  lamps,
  mastHead,
  raft,
  raftSpots,
  rails,
} from './ship/gear';
import { buildHouse } from './ship/house';
import { buildHull } from './ship/hull';
import { PAINT, deckMap, glassMap, grainMap, hullMap, railMap, wallMap } from './ship/maps';

export interface ShipPart {
  object: Group;
  radar: Object3D;
  deckAnchor: Object3D;
  radarAnchor: Object3D;
}

const REFLECTION = 0.9;
const PAINT_METAL = 0.08;
const ALPHA_CUT = 0.5;

const GRAIN = { hull: [216, 27], deck: [216, 30], walls: [120, 60] } as const;

const FITTINGS: MaterialFinish = {
  color: '#ffffff',
  vertexColors: true,
  roughness: 0.62,
  metalness: 0.15,
  envMapIntensity: REFLECTION,
};

const CHAIN: MaterialFinish = { color: '#4a4039', roughness: 0.55, metalness: 0.55 };

const LAMP: MaterialFinish = {
  color: '#fff1d6',
  emissive: '#ffcf8a',
  emissiveIntensity: 0.6,
  roughness: 0.4,
};

function looks(context: PartContext) {
  const track = <T extends Texture>(texture: T) => context.tracker.track(texture);
  const paint = (map: Texture, color: string, grain: readonly [number, number]) => ({
    color,
    map: track(map),
    roughnessMap: track(grainMap(grain)),
    roughness: 1,
    metalness: PAINT_METAL,
    envMapIntensity: REFLECTION,
  });
  return {
    hull: paint(hullMap(), PAINT.hull, GRAIN.hull),
    deck: paint(deckMap(), PAINT.deck, GRAIN.deck),
    walls: paint(wallMap(), PAINT.hull, GRAIN.walls),
    glass: {
      color: '#ffffff',
      map: track(glassMap()),
      roughness: 0.08,
      metalness: 0.3,
      envMapIntensity: 2.4,
    },
    rails: {
      color: PAINT.steel,
      map: track(railMap()),
      alphaTest: ALPHA_CUT,
      alphaToCoverage: true,
      side: DoubleSide,
      roughness: 0.5,
      metalness: 0.4,
    },
  } satisfies Record<string, MaterialFinish>;
}

export function createShip(context: PartContext): ShipPart {
  const finish = looks(context);
  const hull = buildHull();
  const house = buildHouse();
  wetSurface(context.materials.get('ship', finish.hull));
  const radar = new Group();
  radar.position.set(RADAR.x, RADAR.joint, 0);
  const radarAnchor = new Object3D();
  radarAnchor.position.y = SHIP.radarHeight - RADAR.joint;
  radar.add(partMesh(context, antenna(), 'shipRadar', FITTINGS), radarAnchor);
  const deckAnchor = new Object3D();
  deckAnchor.position.y = SHIP.deck;
  const object = new Group();
  object.add(
    partMesh(context, hull.shell, 'ship', finish.hull),
    partMesh(context, hull.deck, 'ship', finish.deck),
    partMesh(context, house.walls, 'ship', finish.walls),
    partMesh(context, house.glass, 'ship', finish.glass),
    partMesh(context, rails(), 'ship', finish.rails),
    partMesh(context, fittings(), 'ship', FITTINGS),
    partMesh(context, lamps(), 'ship', LAMP),
    instanced(context, bollard(), 'ship', FITTINGS, bollardSpots()),
    instanced(context, raft(), 'ship', FITTINGS, raftSpots()),
    instanced(context, chainLink(), 'ship', CHAIN, chainSpots()),
    partMesh(context, mastHead(), 'shipRadar', FITTINGS),
    radar,
    deckAnchor,
  );
  return { object, radar, deckAnchor, radarAnchor };
}
