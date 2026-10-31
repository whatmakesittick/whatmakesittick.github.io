import {
  CanvasTexture,
  DoubleSide,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  RepeatWrapping,
} from 'three';
import type { Group } from 'three';
import type { Extent } from '@core/scene/regions';
import { RACK } from '../../../model';
import type { BoxSpec } from '../../../model';
import { FINISHES } from '../../finishes';
import { label, namedGroup, registeredMaterial } from '../context';
import {
  BASE_TOP,
  CAP_M,
  DOOR_M,
  FRONT_Z,
  POST_M,
  RACK_X,
  RACK_Z,
  RAIL_M,
  REAR_Z,
  SKIN_M,
  SPAN,
} from './dims';
import { box } from './kit';
import type { Kit } from './kit';

const TILE_PX = 16;
const HOLE_PX = 5;
const HOLE_PITCH_M = 0.012;
const ALPHA_CUT = 0.5;
const FOOT_M = 0.05;
const FOOT_TOP = 0.085;
const KICK_INSET_M = 0.02;
const STILE_M = 0.03;

export interface Cabinet {
  readonly group: Group;
  readonly westPanel: Group;
  readonly airDoor: Group;
}

const [WEST, EAST] = SPAN.x;
const TOP = RACK.height;
const FRAME_TOP = TOP - CAP_M;
const POSTS_Y: Extent = [BASE_TOP, FRAME_TOP];
const WEST_POST: Extent = [WEST + SKIN_M, WEST + SKIN_M + POST_M];
const EAST_POST: Extent = [EAST - SKIN_M - POST_M, EAST - SKIN_M];
const FRONT_POST: Extent = [FRONT_Z + DOOR_M, FRONT_Z + DOOR_M + POST_M];
const REAR_POST: Extent = [REAR_Z - POST_M, REAR_Z];
const SIDE_Z: Extent = [FRONT_Z + DOOR_M, REAR_Z];
const BETWEEN_POSTS: Extent = [FRONT_POST[1], REAR_POST[0]];
const DOOR_Z: Extent = [FRONT_Z, FRONT_Z + DOOR_M];

function frame(): BoxSpec[] {
  const posts = [WEST_POST, EAST_POST].flatMap((x) =>
    [FRONT_POST, REAR_POST].map((z) => box(x, POSTS_Y, z)),
  );
  const rails = [WEST_POST, EAST_POST].flatMap((x) => [
    box(x, [BASE_TOP, BASE_TOP + RAIL_M], BETWEEN_POSTS),
    box(x, [FRAME_TOP - RAIL_M, FRAME_TOP], BETWEEN_POSTS),
  ]);
  const crossRails = [FRONT_POST, REAR_POST].flatMap((z) => [
    box([WEST_POST[1], EAST_POST[0]], [BASE_TOP, BASE_TOP + RAIL_M], z),
    box([WEST_POST[1], EAST_POST[0]], [FRAME_TOP - RAIL_M, FRAME_TOP], z),
  ]);
  return [...posts, ...rails, ...crossRails];
}

function shell(): BoxSpec[] {
  return [
    box(SPAN.x, [FRAME_TOP, TOP], SPAN.z),
    box(SPAN.x, [FOOT_TOP, BASE_TOP], SPAN.z),
    box([EAST - SKIN_M, EAST], POSTS_Y, SIDE_Z),
  ];
}

function doorEdge(): BoxSpec[] {
  return [
    box([WEST, WEST + STILE_M], POSTS_Y, DOOR_Z),
    box([EAST - STILE_M, EAST], POSTS_Y, DOOR_Z),
    box([WEST + STILE_M, EAST - STILE_M], [FRAME_TOP - STILE_M, FRAME_TOP], DOOR_Z),
    box([WEST + STILE_M, EAST - STILE_M], [BASE_TOP, BASE_TOP + STILE_M], DOOR_Z),
  ];
}

function plinth(): BoxSpec[] {
  const feet = [WEST + FOOT_M / 2, EAST - FOOT_M / 2].flatMap((x) =>
    [FRONT_Z + FOOT_M / 2, REAR_Z - FOOT_M / 2].map((z) =>
      box([x - FOOT_M / 2, x + FOOT_M / 2], [0, FOOT_TOP], [z - FOOT_M / 2, z + FOOT_M / 2]),
    ),
  );
  const kick = box(
    [WEST + KICK_INSET_M, EAST - KICK_INSET_M],
    [0, FOOT_TOP],
    [FRONT_Z + KICK_INSET_M, REAR_Z - KICK_INSET_M],
  );
  return [kick, ...feet];
}

function perforation(kit: Kit): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = TILE_PX;
  canvas.height = TILE_PX;
  const paint = canvas.getContext('2d');
  if (paint) {
    paint.fillStyle = '#ffffff';
    paint.fillRect(0, 0, TILE_PX, TILE_PX);
    paint.fillStyle = '#000000';
    paint.beginPath();
    paint.arc(TILE_PX / 2, TILE_PX / 2, HOLE_PX, 0, Math.PI * 2);
    paint.fill();
  }
  const texture = kit.context.tracker.track(new CanvasTexture(canvas));
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  return texture;
}

function perforatedDoor(kit: Kit, parent: Group): void {
  const width = EAST - WEST - 2 * STILE_M;
  const tall = FRAME_TOP - BASE_TOP - 2 * STILE_M;
  const alphaMap = perforation(kit);
  alphaMap.repeat.set(width / HOLE_PITCH_M, tall / HOLE_PITCH_M);
  const material = registeredMaterial(
    kit.context,
    'subjectRack',
    new MeshStandardMaterial({
      ...FINISHES.rackDoor,
      alphaMap,
      alphaTest: ALPHA_CUT,
      side: DoubleSide,
    }),
  );
  const door = new Mesh(kit.context.tracker.track(new PlaneGeometry(width, tall)), material);
  door.position.set(RACK_X, BASE_TOP + STILE_M + tall / 2, FRONT_Z + DOOR_M / 2);
  door.name = 'subjectRack';
  parent.add(door);
}

export function buildCabinet(kit: Kit, root: Group): Cabinet {
  const group = namedGroup('subjectRack', root);
  const westPanel = namedGroup('westPanel', group);
  const airDoor = namedGroup('airDoor', group);
  kit.boxes(group, 'subjectRack', 'darkRack', [...shell(), ...plinth().slice(1)]);
  kit.boxes(group, 'subjectRack', 'steelDark', frame());
  kit.boxes(group, 'subjectRack', 'rackDoor', doorEdge());
  kit.boxes(group, 'subjectRack', 'cable', plinth().slice(0, 1));
  kit.boxes(westPanel, 'subjectRack', 'darkRack', [box([WEST, WEST + SKIN_M], POSTS_Y, SIDE_Z)]);
  perforatedDoor(kit, airDoor);
  label(kit.context, 'subjectRack', group, [RACK_X, TOP, RACK_Z]);
  return { group, westPanel, airDoor };
}
