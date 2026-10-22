import { Mesh, Shape, ShapeGeometry } from 'three';
import type { BufferGeometry, Group, Material } from 'three';
import type { MaterialFinish } from '@core/scene/materials';
import { CUT_X, SIDE_SIGNS } from '../../../model';
import { FINISHES } from '../../finishes';
import type { Finish } from '../../finishes';
import { LINE_GROUP, namedGroup } from '../context';
import type { EmphasisGroup, PartContext } from '../context';
import { CABLES, TRAY } from './constants';
import { mergeParts, sideProfile } from './geometry';
import type { ProfilePoint } from './geometry';
import {
  CANTILEVER_PROFILE,
  PACK_PROFILE,
  RAIL_PROFILE,
  STRIP_PROFILE,
  TRAY_PROFILE,
  girderShape,
} from './profiles';

const QUARTER_TURN = Math.PI / 2;
const CAP_X = CUT_X - 0.003;
const CABLE_SEGMENTS = 12;
const CUT_CONCRETE: MaterialFinish = { color: '#c9c6be', roughness: 0.95, metalness: 0 };

function facingAhead(shape: Shape): BufferGeometry {
  const geometry = new ShapeGeometry(shape, CABLE_SEGMENTS);
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

function cableFaces(): BufferGeometry {
  const y = TRAY.bottom + TRAY.wall + CABLES.radius;
  return mergeParts(
    SIDE_SIGNS.flatMap((side) =>
      CABLES.offsets.map((offset) => {
        const shape = new Shape();
        shape.absarc(-side * offset, y, CABLES.radius, 0, Math.PI * 2, false);
        return facingAhead(shape);
      }),
    ),
  );
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
    piece(bothSides(TRAY_PROFILE), 'feederCable', 'tray'),
    piece(cableFaces(), 'feederCable', 'cable'),
  ];
  pieces.forEach(({ geometry, group: emphasis, finish }) => {
    const material: Material = context.materials.get(emphasis, finish);
    group.add(new Mesh(context.tracker.track(geometry), material));
  });
  group.visible = false;
  return group;
}
