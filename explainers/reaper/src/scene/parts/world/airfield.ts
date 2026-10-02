import {
  CylinderGeometry,
  ExtrudeGeometry,
  Group,
  LatheGeometry,
  PlaneGeometry,
  Shape,
  Sprite,
  SpriteMaterial,
  Vector2,
} from 'three';
import type { BufferGeometry, Object3D } from 'three';
import { box } from '@core/scene/geometry/box';
import { STRUCTURE_GROUP } from '@core/scene/materials';
import { anchorAt } from '@core/scene/parts';
import { GROUND_STATION, LOS_MAST, RUNWAY } from '../../../model/layout';
import { AIRFIELD } from '../../constants';
import { GLOW_SPRITE, PAINT, WORLD_FINISHES } from '../../finishes';
import { mergeParts, partMesh, registered } from '../context';
import type { PartContext } from '../context';
import {
  airfieldLights,
  blastPads,
  chevrons,
  runwayMarkings,
  shoulders,
  slab,
  stripe,
} from './runway';

type Triple = readonly [number, number, number];

const RUNWAY_LABEL_SIDE = 0.6;
const MAST_LABEL_SHARE = 0.8;

export interface AirfieldPart {
  object: Group;
  runwayAnchor: Object3D;
  stationAnchor: Object3D;
  mastAnchor: Object3D;
  mastTop: Object3D;
}

function centredBox(at: Triple, size: Triple): BufferGeometry {
  return box({
    minX: at[0] - size[0] / 2,
    maxX: at[0] + size[0] / 2,
    minY: at[1],
    maxY: at[1] + size[1],
    minZ: at[2] - size[2] / 2,
    maxZ: at[2] + size[2] / 2,
  });
}

function taxiwayGeometry(): { paving: BufferGeometry; lines: BufferGeometry } {
  const { taxiway } = AIRFIELD;
  const top = AIRFIELD.surface - AIRFIELD.steps.taxiway;
  const linkLength = taxiway.z - RUNWAY.halfWidth;
  const linkMiddle = (taxiway.z + RUNWAY.halfWidth) / 2;
  const span = taxiway.x[1] - taxiway.x[0];
  const paving = [
    slab(taxiway.x, [taxiway.z - taxiway.halfWidth, taxiway.z + taxiway.halfWidth], top),
    ...taxiway.links.map((x) =>
      slab([x - taxiway.halfWidth, x + taxiway.halfWidth], [RUNWAY.halfWidth, taxiway.z], top),
    ),
  ];
  const lines = [
    stripe(taxiway.x[0] + span / 2, taxiway.z, span, taxiway.line),
    ...taxiway.links.map((x) => stripe(x, linkMiddle, taxiway.line, linkLength)),
  ];
  return { paving: mergeParts(paving), lines: mergeParts(lines) };
}

function hangarGeometry(): { walls: BufferGeometry; door: BufferGeometry } {
  const { centre, width, depth, wall, arch, door, segments } = AIRFIELD.hangar;
  const half = width / 2;
  const outline = new Shape();
  outline.moveTo(-half, 0);
  outline.lineTo(half, 0);
  outline.lineTo(half, wall);
  outline.absellipse(0, wall, half, arch, 0, Math.PI, false);
  outline.lineTo(-half, 0);
  const walls = new ExtrudeGeometry(outline, {
    depth,
    bevelEnabled: false,
    curveSegments: segments,
  });
  walls.translate(centre[0], 0, centre[2] - depth / 2);
  const opening = new PlaneGeometry(door.width, door.height);
  opening.rotateY(Math.PI);
  opening.translate(centre[0], door.height / 2, centre[2] - depth / 2 - door.offset);
  return { walls, door: opening };
}

function dishBowl(radius: number, depth: number): BufferGeometry {
  const { dish, dishSamples } = AIRFIELD.segments;
  const profile = Array.from({ length: dishSamples + 1 }, (_, index) => {
    const share = index / dishSamples;
    return new Vector2(share * radius, depth * share * share);
  });
  return new LatheGeometry(profile, dish);
}

function containerGeometry(): { body: BufferGeometry; trim: BufferGeometry; dish: BufferGeometry } {
  const { size, door, cooler, dish } = AIRFIELD.container;
  const [x, , z] = GROUND_STATION;
  const front = z - size[2] / 2;
  const doorPanel = centredBox(
    [x - size[0] * door.shift, door.sill, front - door.depth / 2],
    [door.width, door.height, door.depth],
  );
  const unit = centredBox([x + size[0] / 2 + cooler.size[0] / 2, cooler.lift, z], cooler.size);
  const dishX = x + size[0] * dish.shift;
  const stand = new CylinderGeometry(
    dish.stand[0],
    dish.stand[1],
    dish.height,
    AIRFIELD.segments.mast,
  );
  stand.translate(dishX, size[1] + dish.height / 2, z);
  const bowl = dishBowl(dish.radius, dish.depth);
  bowl.rotateX(-dish.tilt);
  bowl.translate(dishX, size[1] + dish.height, z);
  return {
    body: centredBox([x, 0, z], size),
    trim: mergeParts([doorPanel, unit, stand]),
    dish: bowl,
  };
}

function mastGeometry(): BufferGeometry {
  const { radius, head } = AIRFIELD.mast;
  const segments = AIRFIELD.segments.mast;
  const [x, , z] = LOS_MAST.position;
  const pole = new CylinderGeometry(radius[1], radius[0], LOS_MAST.height, segments);
  pole.translate(x, LOS_MAST.height / 2, z);
  const top = new CylinderGeometry(head.radius, head.radius, head.height, segments * 2);
  top.translate(x, LOS_MAST.height + head.height / 2, z);
  return mergeParts([pole, top]);
}

function floodPoles(): BufferGeometry {
  const { poles, height, radius } = AIRFIELD.floods;
  return mergeParts(
    poles.map(([x, , z]) => {
      const pole = new CylinderGeometry(radius[0], radius[1], height, AIRFIELD.segments.mast);
      pole.translate(x, height / 2, z);
      return pole;
    }),
  );
}

function glowSprite(context: PartContext, colour: string, size: number, at: Triple): Sprite {
  const material = registered(
    context,
    STRUCTURE_GROUP,
    new SpriteMaterial({ ...GLOW_SPRITE, map: context.textures.glow, color: colour }),
  );
  const sprite = new Sprite(material);
  sprite.position.set(...at);
  sprite.scale.setScalar(size);
  return sprite;
}

function addRunway(context: PartContext, object: Group): void {
  const half = RUNWAY.halfWidth;
  object.add(
    partMesh(
      context,
      slab(RUNWAY.x, [-half, half], AIRFIELD.surface),
      'runway',
      WORLD_FINISHES.asphalt,
    ),
    partMesh(context, shoulders(), 'runway', WORLD_FINISHES.shoulder),
    partMesh(context, runwayMarkings(), 'runway', WORLD_FINISHES.marking),
    partMesh(context, blastPads(), 'runway', WORLD_FINISHES.blastPad),
    partMesh(context, chevrons(), 'runway', WORLD_FINISHES.taxiLine),
    airfieldLights(context).points,
  );
}

function addFacilities(context: PartContext, object: Group): void {
  const taxi = taxiwayGeometry();
  const hangar = hangarGeometry();
  const container = containerGeometry();
  const { apron, floods } = AIRFIELD;
  const apronTop = AIRFIELD.surface - AIRFIELD.steps.apron;
  object.add(
    partMesh(context, taxi.paving, STRUCTURE_GROUP, WORLD_FINISHES.taxiway),
    partMesh(context, taxi.lines, STRUCTURE_GROUP, WORLD_FINISHES.taxiLine),
    partMesh(context, slab(apron.x, apron.z, apronTop), STRUCTURE_GROUP, WORLD_FINISHES.concrete),
    partMesh(context, hangar.walls, STRUCTURE_GROUP, WORLD_FINISHES.hangar),
    partMesh(context, hangar.door, STRUCTURE_GROUP, WORLD_FINISHES.hangarInside),
    partMesh(context, floodPoles(), STRUCTURE_GROUP, WORLD_FINISHES.trim),
    partMesh(context, container.body, 'groundStation', WORLD_FINISHES.container),
    partMesh(context, container.trim, 'groundStation', WORLD_FINISHES.trim),
    partMesh(context, container.dish, 'groundStation', WORLD_FINISHES.dish),
    partMesh(context, mastGeometry(), 'losAntenna', WORLD_FINISHES.mast),
    ...floods.poles.map(([x, , z]) =>
      glowSprite(context, floods.colour, floods.glow, [x, floods.height, z]),
    ),
  );
}

export function createAirfield(context: PartContext): AirfieldPart {
  const object = new Group();
  addRunway(context, object);
  addFacilities(context, object);
  const { mast } = AIRFIELD;
  const [x, , z] = LOS_MAST.position;
  const mastTopY = LOS_MAST.height + mast.head.height;
  object.add(glowSprite(context, PAINT.navRed, mast.beacon, [x, mastTopY + mast.beaconLift, z]));
  return {
    object,
    runwayAnchor: anchorAt(
      object,
      (RUNWAY.x[0] + RUNWAY.x[1]) / 2,
      AIRFIELD.surface,
      -RUNWAY.halfWidth * RUNWAY_LABEL_SIDE,
    ),
    stationAnchor: anchorAt(
      object,
      GROUND_STATION[0],
      AIRFIELD.container.size[1],
      GROUND_STATION[2],
    ),
    mastAnchor: anchorAt(object, x, mastTopY * MAST_LABEL_SHARE, z),
    mastTop: anchorAt(object, x, mastTopY, z),
  };
}
