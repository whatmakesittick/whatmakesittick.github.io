import { LatheGeometry, Vector2 } from 'three';
import type { BufferGeometry, Object3D } from 'three';
import type { Point } from '../../../ids';
import { CAPSTAN, KEY, KEY_LEVER, PLAYED_KEY } from '../../../model';
import { FINISHES } from '../../finishes';
import { label, namedGroup, sceneAnchor } from '../context';
import type { PartContext } from '../context';
import {
  boxBetween,
  mergeParts,
  outlineShape,
  planSlab,
  profileAlongX,
  roundedShape,
} from '../keyboard/geometry';
import type { Outline } from '../keyboard/geometry';
import { KEY_PLAN, punchings, tailSpan, whiteNotch, whiteOutline } from '../keyboard/layout';
import type { Notch } from '../keyboard/layout';
import { BACK_CHECK_BLOCK, CAPSTAN_PROFILE } from './dimensions';
import { ACTION_FINISHES } from './finishes';
import { backCheckFaceZ } from './layout';
import { addMesh, pivotFrame, placeRod, rodGeometry, uprightRod } from './meshes';
import type { Piece } from './meshes';

const IVORY = { top: 0.003, front: 0.002, bevel: 0.0007, inset: 0.0003 } as const;
const STICK = { halfWidth: KEY_PLAN.stickWidth / 2, bevel: 0.0005, round: 0.004 } as const;
const STICK_FRONT = KEY_PLAN.topBackZ + KEY_PLAN.stickOverlap;
const STICK_PROFILE: Outline = [
  [STICK_FRONT, KEY_PLAN.bottom],
  [STICK_FRONT, KEY.top],
  [KEY.frontZ - KEY.length, KEY.top],
  [KEY.frontZ - KEY.length, KEY_PLAN.bottom],
];
const LEAD = {
  y: KEY_PLAN.bottom + 0.01,
  zs: [-0.07, -0.105],
  radius: 0.0045,
  proud: 0.0002,
} as const;
const LEAD_SEGMENTS = 14;
const CLOSE_LABEL_Z = -0.19;
const CAPSTAN_SEGMENTS = 18;
const WIRE_SEGMENTS = 6;
const WIRE_SET_BACK = 0.003;
const PUNCHING_SEGMENTS = 12;

interface KeyGeometry {
  ivory: BufferGeometry;
  wood: BufferGeometry;
  lead: BufferGeometry;
}

function keyGeometry(notch: Notch): KeyGeometry {
  const outline = outlineShape(whiteOutline(notch));
  const under = KEY.top - IVORY.top;
  const half = KEY.whiteWidth / 2 - IVORY.inset;
  const front = boxBetween({
    minX: -half,
    maxX: half,
    minY: KEY_PLAN.bottom + IVORY.inset,
    maxY: under + IVORY.inset,
    minZ: KEY.frontZ - IVORY.front,
    maxZ: KEY.frontZ,
  });
  const [left, right] = tailSpan(notch);
  const lead = LEAD.zs.map((z) =>
    profileAlongX(
      outlineShape(circleOutline(z, LEAD.y, LEAD.radius)),
      left - LEAD.proud,
      right + LEAD.proud,
    ),
  );
  const stick = profileAlongX(
    roundedShape(STICK_PROFILE, STICK.round),
    -STICK.halfWidth,
    STICK.halfWidth,
    STICK.bevel,
  );
  return {
    ivory: mergeParts([planSlab(outline, under, KEY.top, IVORY.bevel), front]),
    wood: mergeParts([
      planSlab(outline, KEY_PLAN.bottom, under).translate(0, 0, -IVORY.front),
      stick,
    ]),
    lead: mergeParts(lead),
  };
}

function circleOutline(z: number, y: number, radius: number): Outline {
  return Array.from({ length: LEAD_SEGMENTS }, (_, index) => {
    const angle = (index / LEAD_SEGMENTS) * 2 * Math.PI;
    return [z + radius * Math.cos(angle), y + radius * Math.sin(angle)] as const;
  });
}

function capstan(): BufferGeometry {
  const profile = CAPSTAN_PROFILE.map(([radius, y]) => new Vector2(radius, y));
  return new LatheGeometry(profile, CAPSTAN_SEGMENTS).translate(0, 0, CAPSTAN.z);
}

function backCheck(context: PartContext, body: Object3D): (key: number) => void {
  const { top, height, depth, felt, halfWidth, tilt, wireRadius } = BACK_CHECK_BLOCK;
  const group = namedGroup('backCheck', body);
  group.rotation.x = -tilt;
  const block = { minX: -halfWidth, maxX: halfWidth, minY: -height, maxY: 0 };
  addMesh(
    context,
    group,
    boxBetween({ ...block, minZ: -felt, maxZ: 0 }),
    'backCheck',
    ACTION_FINISHES.buckskin,
  );
  addMesh(
    context,
    group,
    boxBetween({ ...block, minZ: -depth, maxZ: -felt }),
    'backCheck',
    ACTION_FINISHES.moulding,
  );
  const wire = addMesh(context, body, rodGeometry(WIRE_SEGMENTS), 'backCheck', FINISHES.steel);
  label(context, 'backCheck', group, [0, 0, -depth / 2]);
  return (key) => {
    const face = backCheckFaceZ(key);
    group.position.set(0, top, face);
    placeRod(wire, [0, face - WIRE_SET_BACK], [KEY.top, top - height + WIRE_SET_BACK], wireRadius);
  };
}

function punchingGeometry(key: number): BufferGeometry {
  return mergeParts(
    punchings(key).map(({ position: [, y, z], radius, height }) =>
      uprightRod([0, z], [y, y + height], radius, PUNCHING_SEGMENTS),
    ),
  );
}

export function buildKey(context: PartContext, parent: Object3D): Piece {
  const frame = pivotFrame(parent, 'key', KEY_LEVER.pivotY, KEY_LEVER.pivotZ);
  const cache = new Map<Notch, KeyGeometry>();
  const geometryFor = (notch: Notch): KeyGeometry => {
    const cached = cache.get(notch);
    if (cached) return cached;
    const built = keyGeometry(notch);
    Object.values(built).forEach((geometry) => context.tracker.track(geometry));
    cache.set(notch, built);
    return built;
  };
  const first = geometryFor(whiteNotch(PLAYED_KEY.middle));
  const ivory = addMesh(context, frame.body, first.ivory, 'key', FINISHES.ivory);
  const wood = addMesh(context, frame.body, first.wood, 'key', FINISHES.keyWood);
  const lead = addMesh(context, frame.body, first.lead, 'key', ACTION_FINISHES.lead);
  addMesh(context, frame.body, capstan(), 'capstan', FINISHES.brass);
  const placeBackCheck = backCheck(context, frame.body);
  const cloth = addMesh(
    context,
    parent,
    punchingGeometry(PLAYED_KEY.middle),
    'key',
    FINISHES.cloth,
  );
  const clothFor = new Map<number, BufferGeometry>();
  const front: Point = [0, KEY.top, KEY.frontZ];
  const keyLabel = label(context, 'key', frame.body, front);
  sceneAnchor(context, 'key', frame.body, front);
  label(context, 'capstan', frame.body, [0, CAPSTAN.top, CAPSTAN.z]);
  return {
    setKey(key) {
      const geometry = geometryFor(whiteNotch(key));
      ivory.geometry = geometry.ivory;
      wood.geometry = geometry.wood;
      lead.geometry = geometry.lead;
      placeBackCheck(key);
      cloth.geometry = clothFor.get(key) ?? context.tracker.track(punchingGeometry(key));
      clothFor.set(key, cloth.geometry);
    },
    pose(pose) {
      frame.pivot.rotation.x = pose.key;
    },
    focus(close) {
      keyLabel.position.z = close ? CLOSE_LABEL_Z : KEY.frontZ;
    },
  };
}
