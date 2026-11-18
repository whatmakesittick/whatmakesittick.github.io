import {
  CapsuleGeometry,
  CatmullRomCurve3,
  CircleGeometry,
  Mesh,
  Quaternion,
  Raycaster,
  Shape,
  ShapeGeometry,
  SphereGeometry,
  TorusGeometry,
  TubeGeometry,
  Vector3,
} from 'three';
import type { MeshStandardMaterial, Object3D, BufferGeometry } from 'three';
import { STRUCTURE_GROUP } from '@core/scene/materials';
import type { Point } from '../../../ids';
import {
  AIRWAY,
  NOSTRILS,
  OLFACTORY_BULB,
  SMELL_PATCH,
  THROAT,
  TONGUE,
} from '../../../model/layout';
import { CAVITY_BACK_Z, DETAIL, HEAD_CENTRE, SKIN_DEPTH } from '../../constants';
import { bulgeDepth, domeGeometry } from '../../geometry/dome';
import { CAVITY_BACK, headPieces, silhouette } from '../../geometry/headOutline';
import { smoothChain } from '../../geometry/outline';
import type { Flat } from '../../geometry/outline';
import { slabGeometry } from '../../geometry/slab';
import { addMesh, label, material, namedGroup } from '../context';
import type { EmphasisGroup, PartContext } from '../context';
import type { Finish } from '../../finishes';

const HALF = 0.5;
const FORWARD = new Vector3(0, 0, 1);

const TONGUE_OUTLINE: readonly Flat[] = [
  [TONGUE.tip[0], TONGUE.tip[1]],
  [7.2, -1.55],
  [6, -1.3],
  [TONGUE.hump[0], TONGUE.hump[1]],
  [3.2, -1.45],
  [2.2, -2.1],
  [1.5, -3],
  [TONGUE.root[0], TONGUE.root[1]],
  [1.4, -4.6],
  [2.6, -4.65],
  [4.5, -4.25],
  [6.5, -3.6],
  [7.8, -2.9],
  [8.35, -2.35],
  [TONGUE.tip[0], TONGUE.tip[1]],
];

const NASAL_BACK: readonly Flat[] = [
  [2.1, 0.45],
  [5, 0.55],
  [8.4, 0.65],
  [9.5, 0.95],
  [10.1, 1.3],
  [9.6, 2.4],
  [8.6, 4],
  [7.3, 4.95],
  [5.5, 5.15],
  [3.4, 5.15],
  [2.2, 4.85],
  [1.6, 3.6],
  [1.7, 1.2],
  [2.1, 0.45],
];

const TONGUE_DEPTH = 2.4;
const TONGUE_PROUD = 0.05;
const PIECE_DEPTH = SKIN_DEPTH.slab;
const NASAL_BACK_Z = CAVITY_BACK_Z + 0.04;

const SHELVES = [
  { from: 3.1, to: 8.3, y: 1.65, radius: 0.48 },
  { from: 3.7, to: 7.7, y: 3.15, radius: 0.42 },
] as const;
const SHELF_Z = -0.95;
const SHELF_FLATTEN = 0.8;

const PATCH = { radius: 0.2, depth: 0.55, drop: 0.16, lift: 0.04 } as const;
const BULB_SIZE: Point = [1.35, 0.6, 0.85];
const STALK = { fibres: 5, radius: 0.055, spread: 0.7, z: 0.02 } as const;

const NOSE_WING = { at: [9.75, 1.25, -1.95] as Point, size: [1.15, 0.8, 0.8] as Point };

const FACE_FEATURES = {
  eye: { y: 5.05, z: -3.2, radius: 0.55, tube: 0.075, lift: 0.02 },
  brow: { y: 6.05, z: -3.3, radius: 0.8, tube: 0.07, lift: 0.03 },
  cheek: { y: 1.7, z: -4.3, radius: 0.95, lift: 0.04 },
  ear: { x: -0.6, y: 2.4, size: [1.05, 1.85, 0.5] as Point, sink: 0.25 },
} as const;
const FEATURE_RAY_START = 30;
const ARC_SEGMENTS = 20;

export interface HeadAnatomy {
  readonly tongue: Object3D;
  readonly patch: MeshStandardMaterial;
  readonly bulb: MeshStandardMaterial;
  readonly nose: Object3D;
}

function shapeGeometry(points: readonly Flat[], z: number): ShapeGeometry {
  const shape = new Shape(smoothChain(points, DETAIL.outlineStep));
  const geometry = new ShapeGeometry(shape);
  geometry.translate(0, 0, z);
  return geometry;
}

function slabMesh(
  context: PartContext,
  parent: Object3D,
  geometry: BufferGeometry,
  groups: readonly [EmphasisGroup, Finish][],
): Mesh {
  const mesh = new Mesh(
    context.tracker.track(geometry),
    groups.map(([group, finish]) => material(context, group, finish)),
  );
  parent.add(mesh);
  return mesh;
}

function buildCut(context: PartContext, parent: Object3D): void {
  const [skull, palate, jaw] = headPieces();
  const skin: [EmphasisGroup, Finish] = [STRUCTURE_GROUP, 'skin'];
  slabMesh(context, parent, slabGeometry(skull, PIECE_DEPTH), [
    [STRUCTURE_GROUP, 'cutFace'],
    ['airway', 'innerWall'],
    skin,
  ]).name = 'skull';
  slabMesh(context, parent, slabGeometry(palate, PIECE_DEPTH), [
    ['palate', 'palate'],
    ['palate', 'palate'],
    skin,
  ]).name = 'palate';
  slabMesh(context, parent, slabGeometry(jaw, PIECE_DEPTH), [
    [STRUCTURE_GROUP, 'cutFace'],
    ['throat', 'throat'],
    skin,
  ]).name = 'jaw';
  addMesh(context, parent, shapeGeometry(CAVITY_BACK, CAVITY_BACK_Z), 'airway', 'cavityBack');
  addMesh(context, parent, shapeGeometry(NASAL_BACK, NASAL_BACK_Z), 'nasalCavity', 'cavityAir');
}

function buildSkin(context: PartContext, parent: Object3D): Mesh {
  const geometry = domeGeometry(silhouette(), {
    centre: HEAD_CENTRE,
    slab: SKIN_DEPTH.slab,
    depth: SKIN_DEPTH.head,
    rings: DETAIL.domeRings,
    power: DETAIL.domePower,
    rounding: DETAIL.domeRounding,
    depthAt: bulgeDepth(SKIN_DEPTH.head, SKIN_DEPTH.nose, SKIN_DEPTH.noseFromX, SKIN_DEPTH.noseToX),
  });
  const skin = addMesh(context, parent, geometry, STRUCTURE_GROUP, 'skin');
  skin.name = 'skin';
  return skin;
}

function buildShelves(context: PartContext, parent: Object3D): void {
  SHELVES.forEach(({ from, to, y, radius }) => {
    const geometry = new CapsuleGeometry(radius, to - from - radius * 2, ...DETAIL.smallSphere);
    geometry.rotateZ(Math.PI * HALF);
    geometry.scale(1, 1, SHELF_FLATTEN);
    geometry.translate((from + to) * HALF, y, SHELF_Z);
    addMesh(context, parent, geometry, 'nasalCavity', 'shelf');
  });
}

function buildTongue(context: PartContext, parent: Object3D): Object3D {
  const group = namedGroup('tongue', parent);
  const points = smoothChain(TONGUE_OUTLINE, DETAIL.outlineStep).slice(0, -1);
  const geometry = slabGeometry({ points, outer: points.map(() => true) }, TONGUE_DEPTH);
  geometry.translate(0, 0, TONGUE_PROUD);
  slabMesh(context, group, geometry, [
    ['tongue', 'tongue'],
    ['tongue', 'tongueSide'],
    ['tongue', 'tongueSide'],
  ]);
  label(context, 'tongue', group, [TONGUE.hump[0] - 1, TONGUE.hump[1] - 1, TONGUE_PROUD]);
  return group;
}

function buildSmell(context: PartContext, parent: Object3D): Pick<HeadAnatomy, 'patch' | 'bulb'> {
  const [px, py] = SMELL_PATCH.centre;
  const patch = new CapsuleGeometry(PATCH.radius, SMELL_PATCH.width - PATCH.radius * 2, 6, 12);
  patch.rotateZ(Math.PI * HALF);
  patch.scale(1, 1, PATCH.depth / PATCH.radius);
  patch.translate(px, py - PATCH.radius - PATCH.drop - 0.05, -PATCH.depth);
  const patchMesh = addMesh(context, parent, patch, 'smellPatch', 'smellPatch');
  label(context, 'smellPatch', parent, [px, py - PATCH.drop - PATCH.radius * 2, PATCH.lift]);
  const [bx, by, bz] = OLFACTORY_BULB;
  const bulb = new SphereGeometry(1, ...DETAIL.sphere);
  bulb.scale(...BULB_SIZE);
  bulb.translate(bx, by, bz);
  const bulbMesh = addMesh(context, parent, bulb, 'olfactoryBulb', 'bulb');
  label(context, 'olfactoryBulb', parent, [bx - BULB_SIZE[0] * HALF, by, BULB_SIZE[2] * HALF]);
  for (let fibre = 0; fibre < STALK.fibres; fibre += 1) {
    const share = fibre / (STALK.fibres - 1) - HALF;
    const x = px + share * SMELL_PATCH.width * STALK.spread;
    const curve = new CatmullRomCurve3([
      new Vector3(x, py - PATCH.drop - PATCH.radius, STALK.z),
      new Vector3(x + share * 0.2, py + 0.3, STALK.z),
      new Vector3(bx + share * BULB_SIZE[0], by - BULB_SIZE[1] * HALF, STALK.z),
    ]);
    const tube = new TubeGeometry(curve, 10, STALK.radius, 5, false);
    addMesh(context, parent, tube, 'olfactoryBulb', 'fibre');
  }
  return {
    patch: patchMesh.material as MeshStandardMaterial,
    bulb: bulbMesh.material as MeshStandardMaterial,
  };
}

function onSkin(skin: Mesh, from: Vector3, direction: Vector3): { at: Vector3; normal: Vector3 } {
  const caster = new Raycaster(from, direction.clone().normalize());
  const [hit] = caster.intersectObject(skin, false);
  if (!hit?.face) return { at: from.clone(), normal: direction.clone().negate() };
  return { at: hit.point, normal: hit.face.normal.clone() };
}

function facing(mesh: Mesh, normal: Vector3): void {
  mesh.quaternion.copy(new Quaternion().setFromUnitVectors(FORWARD, normal));
}

function buildFace(context: PartContext, parent: Object3D, skin: Mesh): void {
  skin.updateMatrixWorld(true);
  const fromFront = (y: number, z: number) =>
    onSkin(skin, new Vector3(FEATURE_RAY_START, y, z), new Vector3(-1, 0, 0));
  const { eye, brow, cheek, ear } = FACE_FEATURES;
  const eyeSpot = fromFront(eye.y, eye.z);
  const lid = new TorusGeometry(eye.radius, eye.tube, 6, ARC_SEGMENTS, Math.PI);
  lid.rotateZ(Math.PI);
  const lidMesh = addMesh(context, parent, lid, STRUCTURE_GROUP, 'lid');
  facing(lidMesh, eyeSpot.normal);
  lidMesh.position.copy(eyeSpot.at).addScaledVector(eyeSpot.normal, eye.lift);
  const browSpot = fromFront(brow.y, brow.z);
  const browMesh = addMesh(
    context,
    parent,
    new TorusGeometry(brow.radius, brow.tube, 6, ARC_SEGMENTS, Math.PI * 0.7),
    STRUCTURE_GROUP,
    'brow',
  );
  browMesh.geometry.rotateZ(Math.PI * 0.15);
  facing(browMesh, browSpot.normal);
  browMesh.position.copy(browSpot.at).addScaledVector(browSpot.normal, brow.lift);
  const cheekSpot = fromFront(cheek.y, cheek.z);
  const blush = addMesh(
    context,
    parent,
    new CircleGeometry(cheek.radius, 24),
    STRUCTURE_GROUP,
    'blush',
  );
  facing(blush, cheekSpot.normal);
  blush.position.copy(cheekSpot.at).addScaledVector(cheekSpot.normal, cheek.lift);
  const earSpot = onSkin(skin, new Vector3(ear.x, ear.y, -FEATURE_RAY_START), FORWARD.clone());
  const earGeometry = new SphereGeometry(1, ...DETAIL.sphere);
  earGeometry.scale(...ear.size);
  const earMesh = addMesh(context, parent, earGeometry, STRUCTURE_GROUP, 'ear');
  earMesh.position.copy(earSpot.at).addScaledVector(earSpot.normal, ear.size[2] - ear.sink);
}

function buildNose(context: PartContext, parent: Object3D): Object3D {
  const wing = new SphereGeometry(1, ...DETAIL.sphere);
  wing.scale(...NOSE_WING.size);
  wing.translate(...NOSE_WING.at);
  const mesh = addMesh(context, parent, wing, 'nostrils', 'skin');
  label(context, 'nostrils', mesh, NOSTRILS);
  return mesh;
}

function buildLabels(context: PartContext, parent: Object3D): void {
  label(context, 'palate', parent, [5.5, 0.22, 0]);
  label(context, 'airway', parent, [
    (AIRWAY.bottom[0] + AIRWAY.top[0]) * HALF - 0.4,
    (AIRWAY.bottom[1] + AIRWAY.top[1]) * HALF + 0.6,
    0,
  ]);
  label(context, 'throat', parent, [
    (THROAT.top[0] + THROAT.bottom[0]) * HALF,
    (THROAT.top[1] + THROAT.bottom[1]) * HALF,
    0,
  ]);
  label(context, 'nasalCavity', parent, [7, 2.4, 0]);
}

export function buildAnatomy(context: PartContext, parent: Object3D): HeadAnatomy {
  const skin = buildSkin(context, parent);
  buildCut(context, parent);
  buildShelves(context, parent);
  const tongue = buildTongue(context, parent);
  const smell = buildSmell(context, parent);
  buildFace(context, parent, skin);
  const nose = buildNose(context, parent);
  buildLabels(context, parent);
  return { tongue, nose, ...smell };
}
