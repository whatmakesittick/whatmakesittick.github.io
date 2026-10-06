import { MathUtils, Vector2 } from 'three';
import type { BufferGeometry, Group } from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { BORE, ISOCENTRE, MAGNET } from '../../../model/layout';
import type { Profile } from '../../geometry/profile';
import { quadratic, rectLoop, roundCorners, thickenPath } from '../../geometry/profile';
import { sweepProfile } from '../../geometry/sweep';
import type { Arc, Squash, SweepOptions } from '../../geometry/sweep';
import { mergeParts } from '../context';
import type { PartContext } from '../context';
import { addMeshes, boreGroup, REST_ARC, WEDGE_ARC } from './cutaway';
import { ACCENT_FINISH, COVER_FINISH, STEEL_FINISH, TRIM_FINISH } from './looks';
import { slice } from './slice';

const SEGMENTS = 128;
const CURVE_STEPS = 10;
const SKIN = 0.03;
const SIDE_FLATTEN = 0.035;
const FLATTEN_FROM = 0.93;
const FRONT = { joint: 0.58, mouth: 0.53, face: 0.85, rim: 0.86, corner: 0.66 } as const;
const BACK = { joint: -0.64, mouth: 0.43, face: -0.85, rim: 0.9, corner: -0.7 } as const;
const LIP = 0.004;
const BAND = { inner: 1.045, outer: 1.057, from: 0.4, to: 0.6, corner: 0.004 } as const;
const ACCENT = { inner: 0.585, outer: 0.6, depth: 0.007 } as const;
const PLINTH = { height: 0.32, inset: 0.05, segments: 3, radius: 0.03 } as const;

export const BORE_JOINTS = { back: BACK.joint, front: FRONT.joint } as const;

export const COVER_SQUASH: Squash = (radius) =>
  1 - SIDE_FLATTEN * MathUtils.smoothstep(radius, FLATTEN_FROM, MAGNET.radius);

function coverPath(): Vector2[] {
  const { radius } = MAGNET;
  const bore = BORE.radius + LIP;
  const backJoint = new Vector2(bore, BACK.joint);
  const backMouth = new Vector2(BACK.mouth, BACK.face);
  const backRim = new Vector2(BACK.rim, BACK.face);
  const frontCorner = new Vector2(radius, FRONT.corner);
  const frontRim = new Vector2(FRONT.rim, FRONT.face);
  const frontMouth = new Vector2(FRONT.mouth, FRONT.face);
  return [
    backJoint,
    ...quadratic(backJoint, new Vector2(bore, BACK.face), backMouth, CURVE_STEPS),
    backRim,
    ...quadratic(
      backRim,
      new Vector2(radius, BACK.face),
      new Vector2(radius, BACK.corner),
      CURVE_STEPS,
    ),
    frontCorner,
    ...quadratic(frontCorner, new Vector2(radius, FRONT.face), frontRim, CURVE_STEPS),
    frontMouth,
    ...quadratic(
      frontMouth,
      new Vector2(bore, FRONT.face),
      new Vector2(bore, FRONT.joint),
      CURVE_STEPS,
    ),
  ];
}

function coverProfile(): Profile {
  return { outer: thickenPath(coverPath(), SKIN), holes: [] };
}

function bandProfile(): Profile {
  const loop = rectLoop(BAND.inner, BAND.outer, BAND.from, BAND.to);
  return { outer: roundCorners(loop, BAND.corner, 2), holes: [] };
}

function accentProfile(): Profile {
  const loop = rectLoop(ACCENT.inner, ACCENT.outer, FRONT.face, FRONT.face + ACCENT.depth);
  return { outer: loop, holes: [] };
}

function plinthGeometry(): BufferGeometry {
  const width = 2 * MAGNET.baseHalfWidth;
  const depth = 2 * (MAGNET.halfLength - PLINTH.inset);
  return new RoundedBoxGeometry(
    width,
    PLINTH.height,
    depth,
    PLINTH.segments,
    PLINTH.radius,
  ).translate(0, PLINTH.height / 2 - ISOCENTRE[1], 0);
}

interface CoverPieces {
  shell: BufferGeometry;
  band: BufferGeometry;
  accent: BufferGeometry;
}

function sweepOptions(arc: Arc): SweepOptions {
  return { arc, segmentsPerTurn: SEGMENTS, squash: COVER_SQUASH };
}

function pieces(arc: Arc): CoverPieces {
  const options = sweepOptions(arc);
  return {
    shell: sweepProfile(coverProfile(), { ...options, capped: false }),
    band: sweepProfile(bandProfile(), options),
    accent: sweepProfile(accentProfile(), options),
  };
}

export interface CoverObjects {
  full: Group;
  cut: Group;
}

export function buildCover(context: PartContext): CoverObjects {
  const rest = pieces(REST_ARC);
  const wedge = pieces(WEDGE_ARC);
  const plinth = plinthGeometry();
  const section = slice(coverProfile(), 'cover', COVER_SQUASH);
  const backdrop = slice({ outer: coverPath(), holes: [] }, 'backdrop', COVER_SQUASH);
  const full = boreGroup('cover');
  const cut = boreGroup('coverCut');
  addMeshes(context, full, 'cover', COVER_FINISH, [mergeParts([rest.shell, wedge.shell])]);
  addMeshes(context, full, 'cover', TRIM_FINISH, [mergeParts([rest.band, wedge.band, plinth])]);
  addMeshes(context, full, 'cover', ACCENT_FINISH, [mergeParts([rest.accent, wedge.accent])]);
  addMeshes(context, cut, 'cover', COVER_FINISH, [mergeParts([rest.shell, section])]);
  addMeshes(context, cut, 'cover', TRIM_FINISH, [mergeParts([rest.band, plinth])]);
  addMeshes(context, cut, 'cover', ACCENT_FINISH, [rest.accent]);
  addMeshes(context, cut, 'cover', STEEL_FINISH, [backdrop]);
  return { full, cut };
}
