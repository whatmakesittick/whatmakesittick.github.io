import { BackSide, Mesh, Shape, ShapeGeometry } from 'three';
import type { BufferGeometry, Group, Material } from 'three';
import type { MaterialFinish } from '@core/scene/materials';
import { CUT_X, SIDE_SIGNS } from '../../../model';
import { FINISHES } from '../../finishes';
import type { Finish } from '../../finishes';
import { LINE_GROUP, namedGroup } from '../context';
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
const CUT_CONCRETE: MaterialFinish = { color: '#c9c6be', roughness: 0.95, metalness: 0 };
const HOLLOW_CONCRETE: MaterialFinish = {
  color: '#4f4c47',
  roughness: 1,
  metalness: 0,
  side: BackSide,
};
const LINING = { depth: 4, inset: 0.01 } as const;

function facingAhead(shape: Shape): BufferGeometry {
  const geometry = new ShapeGeometry(shape, CURVE_SEGMENTS);
  geometry.rotateY(QUARTER_TURN);
  geometry.translate(CAP_X, 0, 0);
  return geometry;
}

function mirroredShape(points: readonly ProfilePoint[]): Shape {
  const shape = new Shape();
  points.forEach(([z, y], index) => (index === 0 ? shape.moveTo(-z, y) : shape.lineTo(-z, y)));
  return shape;
}

function bothSides(points: readonly ProfilePoint[]): BufferGeometry {
  return mergeParts(
    SIDE_SIGNS.map((side) => facingAhead(mirroredShape(sideProfile(points, side)))),
  );
}

function girderFace(): BufferGeometry {
  const source = girderShape();
  const shape = mirroredShape(source.getPoints().map(({ x, y }): ProfilePoint => [x, y]));
  source.holes.forEach((hole) => {
    const mirroredHole = mirroredShape(hole.getPoints().map(({ x, y }): ProfilePoint => [x, y]));
    shape.holes.push(mirroredHole);
  });
  return facingAhead(shape);
}

function voidLining(): BufferGeometry {
  const shape = profileShape(voidLiningProfile(LINING.inset));
  return extrudeAlongX(shape, CAP_X - LINING.depth, CAP_X);
}

interface CapPiece {
  readonly geometry: BufferGeometry;
  readonly group: EmphasisGroup;
  readonly finish: MaterialFinish;
}

function piece(geometry: BufferGeometry, group: EmphasisGroup, finish: Finish): CapPiece {
  return { geometry, group, finish: FINISHES[finish] };
}

export function buildCutCap(context: PartContext, steel: MaterialFinish): Group {
  const group = namedGroup('guidewayCut');
  const pieces: readonly CapPiece[] = [
    { geometry: girderFace(), group: LINE_GROUP, finish: CUT_CONCRETE },
    { geometry: bothSides(CANTILEVER_PROFILE), group: 'guideway', finish: steel },
    piece(bothSides(STRIP_PROFILE), 'guideway', 'slideStrip'),
    piece(bothSides(PACK_PROFILE), 'statorPacks', 'stator'),
    piece(bothSides(RAIL_PROFILE), 'guidanceRails', 'guidanceRail'),
    { geometry: voidLining(), group: LINE_GROUP, finish: HOLLOW_CONCRETE },
  ];
  pieces.forEach(({ geometry, group: emphasis, finish }) => {
    const material: Material = context.materials.get(emphasis, finish);
    group.add(new Mesh(context.tracker.track(geometry), material));
  });
  group.visible = false;
  return group;
}
