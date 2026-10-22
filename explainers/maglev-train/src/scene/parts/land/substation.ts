import { BoxGeometry, Group, Mesh } from 'three';
import type { BufferGeometry } from 'three';
import { SIDE_SIGNS } from '../../../model';
import { LINE_DRAW } from '../../constants';
import { lineX } from '../../pose';
import { LINE_GROUP } from '../context';
import type { PartContext } from '../context';
import { mergeParts } from '../line/geometry';
import { overlaps } from '../line/slots';
import { FEATHER_SHADE, featherGeometry, featherShadowMaterial } from './feather';
import { painted } from './scenery/faceBuilder';
import type { Rgb } from './scenery/faceBuilder';
import { vertexFinish } from './scenery/instances';
import { prismShadow } from './shadow';
import { SUBSTATION, substationLines } from './substationPlan';

type Box = readonly [
  x: number,
  y: number,
  z: number,
  length: number,
  height: number,
  depth: number,
];
type Part = readonly [Box, Rgb];

const COLOURS = {
  gravel: [0.5, 0.49, 0.46],
  concrete: [0.74, 0.72, 0.68],
  wall: [0.86, 0.85, 0.82],
  glass: [0.2, 0.25, 0.3],
  steel: [0.55, 0.58, 0.6],
  transformer: [0.36, 0.42, 0.38],
  porcelain: [0.62, 0.48, 0.38],
} as const satisfies Record<string, Rgb>;

const FINISH = vertexFinish(0.8, 0.1);
const YARD: Box = [0, 0.01, 0, SUBSTATION.length, 0.04, SUBSTATION.depth];
const HALL: Box = [-11, 0, 4.5, 16, 6, 9];
const ROOF: Box = [-11, 5.6, 4.5, 16.3, 0.5, 9.3];
const WINDOWS = { count: 5, width: 1.8, sill: 2.4, height: 1.4, depth: 0.06 } as const;
const FENCE = { height: 2.2, plinth: 0.45, post: 0.12, spacing: 3, wall: 0.2 } as const;
const GANTRY: readonly Box[] = [
  [-13, 0, -6, 0.35, 11, 0.35],
  [13, 0, -6, 0.35, 11, 0.35],
  [0, 10.4, -6, 26.35, 0.6, 0.49],
];
const TRANSFORMER_XS = [-2, 6.5, 15] as const;
const TRANSFORMER_Z = -6;
const TRANSFORMER_BODY: Box = [0, 0.4, 0, 4.2, 3, 3.2];
const TRANSFORMER: readonly Part[] = [
  [[0, 0, 0, 5.2, 0.4, 4.2], COLOURS.concrete],
  [TRANSFORMER_BODY, COLOURS.transformer],
  [[0, 0.6, 1.9, 3.8, 2.4, 0.5], COLOURS.transformer],
  [[-1.26, 3.4, 0, 0.3, 1.6, 0.3], COLOURS.porcelain],
  [[0, 3.4, 0, 0.3, 1.6, 0.3], COLOURS.porcelain],
  [[1.26, 3.4, 0, 0.3, 1.6, 0.3], COLOURS.porcelain],
];
const SHADOW_FEATHER = 1.2;

function block([x, y, z, length, height, depth]: Box, colour: Rgb): BufferGeometry {
  return painted(new BoxGeometry(length, height, depth).translate(x, y + height / 2, z), colour);
}

function moved([x, y, z, ...size]: Box, by: number): Box {
  return [x + by, y, z + TRANSFORMER_Z, ...size];
}

function fence(): Box[] {
  const { length, depth } = SUBSTATION;
  const { height, plinth, post, spacing, wall } = FENCE;
  const boxes = SIDE_SIGNS.flatMap((side): Box[] => [
    [0, 0, (side * depth) / 2, length, plinth, wall],
    [(side * length) / 2, 0, 0, wall, plinth, depth],
  ]);
  for (let x = -length / 2; x <= length / 2; x += spacing)
    SIDE_SIGNS.forEach((side) => boxes.push([x, 0, (side * depth) / 2, post, height, post]));
  for (let z = spacing - depth / 2; z < depth / 2; z += spacing)
    SIDE_SIGNS.forEach((side) => boxes.push([(side * length) / 2, 0, z, post, height, post]));
  return boxes;
}

function windows(): Box[] {
  const [x, , z, length, , depth] = HALL;
  const { count, width, sill, height } = WINDOWS;
  return Array.from({ length: count }, (_, index) => [
    x + length * ((index + 0.5) / count - 0.5),
    sill,
    z + depth / 2,
    width,
    height,
    WINDOWS.depth,
  ]);
}

function parts(): Part[] {
  return [
    [YARD, COLOURS.gravel],
    [HALL, COLOURS.wall],
    [ROOF, COLOURS.concrete],
    ...[...fence(), ...GANTRY].map((box): Part => [box, COLOURS.steel]),
    ...windows().map((box): Part => [box, COLOURS.glass]),
    ...TRANSFORMER_XS.flatMap((at) =>
      TRANSFORMER.map(([box, colour]): Part => [moved(box, at), colour]),
    ),
  ];
}

function shadowOf([x, y, z, length, height, depth]: Box): BufferGeometry {
  const prism = {
    x: [x - length / 2, x + length / 2],
    y: [y, y + height],
    z: [z - depth / 2, z + depth / 2],
  } as const;
  return featherGeometry(prismShadow(prism), SHADOW_FEATHER, FEATHER_SHADE.lift);
}

export function substationGeometry(): BufferGeometry {
  return mergeParts(parts().map(([box, colour]) => block(box, colour)));
}

function shadowGeometry(): BufferGeometry {
  return mergeParts(
    [HALL, ...TRANSFORMER_XS.map((at) => moved(TRANSFORMER_BODY, at))].map(shadowOf),
  );
}

export interface Substations {
  readonly root: Group;
  setState(distance: number): void;
}

export function buildSubstations(context: PartContext): Substations {
  const root = new Group();
  root.name = 'substations';
  const geometry = context.tracker.track(substationGeometry());
  const material = context.materials.get(LINE_GROUP, FINISH);
  const shadow = context.tracker.track(shadowGeometry());
  const shade = featherShadowMaterial(context);
  const lines = substationLines();
  const meshes = lines.map(() => {
    const mesh = new Mesh(geometry, material);
    mesh.name = 'substation';
    mesh.position.z = SUBSTATION.centreZ;
    const cast = new Mesh(shadow, shade);
    cast.renderOrder = 1;
    mesh.add(cast);
    root.add(mesh);
    return mesh;
  });
  const drawn = [-LINE_DRAW.behind, LINE_DRAW.ahead] as const;
  return {
    root,
    setState(distance) {
      meshes.forEach((mesh, index) => {
        mesh.position.x = lineX(lines[index], distance);
        mesh.visible = overlaps(mesh.position.x, SUBSTATION.length / 2, drawn);
      });
    },
  };
}
