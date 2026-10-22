import { BackSide, ShapeGeometry } from 'three';
import type { BufferGeometry, Group, Shape } from 'three';
import type { MaterialFinish } from '@core/scene/materials';
import { CUT_X, SIDE_SIGNS } from '../../../model';
import { FINISHES } from '../../finishes';
import { LINE_GROUP, finishMesh, namedGroup } from '../context';
import type { EmphasisGroup, PartContext } from '../context';
import { extrudeAlongX, mergeParts, profileShape, sideProfile } from './geometry';
import type { ProfilePoint } from './geometry';
import {
  CANTILEVER_PROFILE,
  PACK_PROFILE,
  RAIL_PROFILE,
  STRIP_PROFILE,
  girderShape,
  voidLiningProfile,
} from './profiles';

const QUARTER_TURN = Math.PI / 2;
const CAP_X = CUT_X - 0.003;
const CURVE_SEGMENTS = 12;
const CUT_CONCRETE: MaterialFinish = { color: '#c9c6be', roughness: 0.95 };
const HOLLOW_CONCRETE: MaterialFinish = { color: '#4f4c47', side: BackSide };
const LINING = { depth: 4, inset: 0.01 } as const;

function facingAhead(shape: Shape): BufferGeometry {
  const geometry = new ShapeGeometry(shape, CURVE_SEGMENTS);
  geometry.rotateY(QUARTER_TURN);
  geometry.translate(CAP_X, 0, 0);
  return geometry;
}

function bothSides(points: readonly ProfilePoint[]): BufferGeometry {
  return mergeParts(SIDE_SIGNS.map((side) => facingAhead(profileShape(sideProfile(points, side)))));
}

function voidLining(): BufferGeometry {
  const shape = profileShape(voidLiningProfile(LINING.inset));
  return extrudeAlongX(shape, CAP_X - LINING.depth, CAP_X);
}

export function buildCutCap(context: PartContext, steel: MaterialFinish): Group {
  const group = namedGroup('guidewayCut');
  const pieces: readonly (readonly [BufferGeometry, EmphasisGroup, MaterialFinish])[] = [
    [facingAhead(girderShape()), LINE_GROUP, CUT_CONCRETE],
    [bothSides(CANTILEVER_PROFILE), 'guideway', steel],
    [bothSides(STRIP_PROFILE), 'guideway', FINISHES.slideStrip],
    [bothSides(PACK_PROFILE), 'statorPacks', FINISHES.stator],
    [bothSides(RAIL_PROFILE), 'guidanceRails', FINISHES.guidanceRail],
    [voidLining(), LINE_GROUP, HOLLOW_CONCRETE],
  ];
  pieces.forEach((piece) => group.add(finishMesh(context, ...piece)));
  group.visible = false;
  return group;
}
