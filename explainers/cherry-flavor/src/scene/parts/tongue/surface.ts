import {
  BoxGeometry,
  CatmullRomCurve3,
  ConeGeometry,
  Color,
  LatheGeometry,
  Matrix4,
  Mesh,
  PlaneGeometry,
  Quaternion,
  Shape,
  ShapeGeometry,
  SphereGeometry,
  TubeGeometry,
  Vector2,
  Vector3,
} from 'three';
import type { InstancedMesh, MeshStandardMaterial, Object3D } from 'three';
import type { TasteReading } from '../../../ids';
import {
  CUT_PAPILLA,
  NERVE_Y,
  PAPILLA_SPACING_MM,
  TONGUE_PATCH,
  TONGUE_SURFACE_Y,
} from '../../../model/layout';
import { TASTE_GLOWS } from '../../../theme';
import { DETAIL } from '../../constants';
import { addMesh, instanced, label, material, namedGroup } from '../context';
import type { PartContext } from '../context';
import { seededRandom } from '../random';

const HALF = 0.5;
const BODY_DEPTH = 6;
const SURFACE_SEGMENTS = [80, 56] as const;
const RIPPLE = { scale: 0.55, amount: 0.12 } as const;

const PAPILLA_PROFILE: readonly [number, number][] = [
  [0.001, 0],
  [0.36, 0],
  [0.33, 0.4],
  [0.5, 0.58],
  [0.6, 0.75],
  [0.5, 0.92],
  [0.28, 1],
  [0.001, 1.02],
];
const PAPILLA_JITTER = 0.55;
const PAPILLA_SIZE = { min: 0.8, spread: 0.4 } as const;
const PORE = { radius: 0.17, height: 1.0 } as const;

const FILIFORM = { count: 900, radius: 0.16, height: 0.55, seed: 7 } as const;

const CUT = {
  lathe: 28,
  budY: 0.74,
  spread: 0.3,
  cells: 13,
  fan: 1.1,
  cellSize: [0.055, 0.22, 0.04],
} as const;
const BUD_FACE_Z = 0.03;

const NERVE_FRONT = 0.14;
const NERVE_RADIUS = 0.32;
const NERVE_BRANCHES = [-15, -7, 1, 9, 17] as const;
const NERVE_STUB = 1.4;

const GLOW = { taste: 1.8, cold: 1.5 } as const;

export interface TongueSurface {
  setTaste(taste: TasteReading): void;
}

function ripple(x: number, z: number): number {
  return (
    Math.sin(x * RIPPLE.scale + Math.sin(z * 0.4)) *
    Math.sin(z * RIPPLE.scale * 1.3 + x * 0.2) *
    RIPPLE.amount
  );
}

function buildSlab(context: PartContext, parent: Object3D): void {
  const width = TONGUE_PATCH.x[1] - TONGUE_PATCH.x[0];
  const depth = TONGUE_PATCH.z[1] - TONGUE_PATCH.z[0];
  const top = new PlaneGeometry(width, depth, ...SURFACE_SEGMENTS);
  top.rotateX(-Math.PI * HALF);
  const position = top.getAttribute('position');
  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index);
    const z = position.getZ(index);
    position.setY(index, TONGUE_SURFACE_Y + ripple(x, z) - RIPPLE.amount);
  }
  top.computeVertexNormals();
  addMesh(context, parent, top, 'papilla', 'tongueTop').name = 'tongueTop';
  const body = new BoxGeometry(width, BODY_DEPTH, depth);
  body.translate(0, TONGUE_SURFACE_Y - RIPPLE.amount * 2 - BODY_DEPTH * HALF, 0);
  const side = material(context, 'papilla', 'tongueBody');
  const cut = material(context, 'papilla', 'tongueCut');
  const mesh = new Mesh(context.tracker.track(body), [side, side, side, side, cut, side]);
  mesh.name = 'tongueBody';
  parent.add(mesh);
}

function papillaGeometry(): LatheGeometry {
  return new LatheGeometry(
    PAPILLA_PROFILE.map(([radius, height]) => new Vector2(radius, height)),
    DETAIL.papilla[0],
  );
}

function grid(): Vector3[] {
  const random = seededRandom(3);
  const spots: Vector3[] = [];
  const [minX, maxX] = TONGUE_PATCH.x;
  const [minZ, maxZ] = TONGUE_PATCH.z;
  for (let x = minX + PAPILLA_SPACING_MM * HALF; x < maxX; x += PAPILLA_SPACING_MM) {
    for (let z = minZ + PAPILLA_SPACING_MM * HALF; z < maxZ; z += PAPILLA_SPACING_MM) {
      const px = x + (random() - HALF) * PAPILLA_JITTER * 2;
      const pz = z + (random() - HALF) * PAPILLA_JITTER * 2;
      const nearCut =
        Math.hypot(px - CUT_PAPILLA.centre[0], pz - CUT_PAPILLA.centre[2]) <
        PAPILLA_SPACING_MM * CUT_PAPILLA.magnify * HALF;
      if (!nearCut) spots.push(new Vector3(px, TONGUE_SURFACE_Y, pz));
    }
  }
  return spots;
}

function buildPapillae(context: PartContext, parent: Object3D): InstancedMesh {
  const spots = grid();
  const random = seededRandom(5);
  const bumps = instanced(
    context,
    parent,
    context.tracker.track(papillaGeometry()),
    'papilla',
    'papilla',
    spots.length,
  );
  const pores = instanced(
    context,
    parent,
    context.tracker.track(new SphereGeometry(PORE.radius, 8, 6)),
    'tasteBud',
    'pore',
    spots.length,
  );
  const matrix = new Matrix4();
  const turn = new Quaternion();
  spots.forEach((spot, index) => {
    const size = PAPILLA_SIZE.min + random() * PAPILLA_SIZE.spread;
    const at = spot.clone().setY(ripple(spot.x, spot.z) - RIPPLE.amount);
    matrix.compose(at, turn.identity(), new Vector3(size, size, size));
    bumps.setMatrixAt(index, matrix);
    matrix.compose(
      at.clone().setY(at.y + PORE.height * size),
      turn,
      new Vector3(1, 0.5, 1).multiplyScalar(size),
    );
    pores.setMatrixAt(index, matrix);
  });
  bumps.count = spots.length;
  pores.count = spots.length;
  label(context, 'papilla', parent, [spots[spots.length - 30].x, 1, spots[spots.length - 30].z]);
  buildFiliform(context, parent);
  return pores;
}

function buildFiliform(context: PartContext, parent: Object3D): void {
  const random = seededRandom(FILIFORM.seed);
  const cone = new ConeGeometry(FILIFORM.radius, FILIFORM.height, 5);
  cone.translate(0, FILIFORM.height * HALF, 0);
  const mesh = instanced(
    context,
    parent,
    context.tracker.track(cone),
    'papilla',
    'papilla',
    FILIFORM.count,
  );
  const matrix = new Matrix4();
  const turn = new Quaternion();
  const lean = new Vector3();
  for (let index = 0; index < FILIFORM.count; index += 1) {
    const x = TONGUE_PATCH.x[0] + random() * (TONGUE_PATCH.x[1] - TONGUE_PATCH.x[0]);
    const z = TONGUE_PATCH.z[0] + random() * (TONGUE_PATCH.z[1] - TONGUE_PATCH.z[0]);
    lean.set(random() - HALF, 4, random() - HALF).normalize();
    turn.setFromUnitVectors(new Vector3(0, 1, 0), lean);
    const size = 0.7 + random() * 0.6;
    matrix.compose(
      new Vector3(x, ripple(x, z) - RIPPLE.amount * 1.5, z),
      turn,
      new Vector3(size, size, size),
    );
    mesh.setMatrixAt(index, matrix);
  }
  mesh.count = FILIFORM.count;
}

function buildCutPapilla(
  context: PartContext,
  parent: Object3D,
): { sweet: MeshStandardMaterial; sour: MeshStandardMaterial } {
  const group = namedGroup('cutPapilla', parent);
  group.position.set(...CUT_PAPILLA.centre);
  group.scale.setScalar(CUT_PAPILLA.magnify);
  const half = new LatheGeometry(
    PAPILLA_PROFILE.map(([radius, height]) => new Vector2(radius, height)),
    CUT.lathe,
    Math.PI * HALF,
    Math.PI,
  );
  addMesh(context, group, half, 'tasteBud', 'papilla');
  const outline = new Shape([
    ...PAPILLA_PROFILE.map(([radius, height]) => new Vector2(radius, height)),
    ...[...PAPILLA_PROFILE].reverse().map(([radius, height]) => new Vector2(-radius, height)),
  ]);
  addMesh(context, group, new ShapeGeometry(outline), 'tasteBud', 'tongueCut');
  const cell = new SphereGeometry(1, ...DETAIL.smallSphere);
  cell.scale(...CUT.cellSize);
  const sweet = material(context, 'tasteBud', 'budSweet');
  const sour = material(context, 'tasteBud', 'budSour');
  const plain = material(context, 'tasteBud', 'budCell');
  for (let index = 0; index < CUT.cells; index += 1) {
    const share = index / (CUT.cells - 1) - HALF;
    const mesh = new Mesh(cell, index % 3 === 0 ? sour : index % 3 === 1 ? sweet : plain);
    mesh.position.set(share * CUT.spread, CUT.budY - Math.abs(share) * 0.08, BUD_FACE_Z);
    mesh.rotation.z = -share * CUT.fan;
    group.add(mesh);
  }
  context.tracker.track(cell);
  const fibre = new TubeGeometry(
    new CatmullRomCurve3([
      new Vector3(0, 0.6, BUD_FACE_Z),
      new Vector3(0.06, 0.3, BUD_FACE_Z),
      new Vector3(-0.05, 0, BUD_FACE_Z),
    ]),
    10,
    0.05,
    6,
    false,
  );
  addMesh(context, group, fibre, 'nerve', 'nerve');
  label(context, 'tasteBud', group, [CUT.spread * HALF, CUT.budY, BUD_FACE_Z]);
  return { sweet, sour };
}

function buildNerves(context: PartContext, parent: Object3D): void {
  const front = TONGUE_PATCH.z[1] + NERVE_FRONT;
  const [minX, maxX] = TONGUE_PATCH.x;
  const main: Vector3[] = [];
  for (let x = minX + 0.5; x <= maxX - 0.5; x += 2) {
    main.push(new Vector3(x, NERVE_Y + Math.sin(x * 0.5) * 0.35, front));
  }
  addMesh(
    context,
    parent,
    new TubeGeometry(new CatmullRomCurve3(main), 80, NERVE_RADIUS, DETAIL.tube, false),
    'nerve',
    'nerve',
  );
  NERVE_BRANCHES.forEach((x, index) => {
    const up = new CatmullRomCurve3([
      new Vector3(x, NERVE_Y, front),
      new Vector3(x + 0.6, NERVE_Y + 1.4, front),
      new Vector3(x - 0.3, TONGUE_SURFACE_Y - 0.6, front),
    ]);
    addMesh(
      context,
      parent,
      new TubeGeometry(up, 16, NERVE_RADIUS * 0.6, 6, false),
      'nerve',
      'nerve',
    );
    const stub = new TubeGeometry(
      new CatmullRomCurve3([
        new Vector3(x + 1.5, NERVE_Y - 0.6, front - 0.2),
        new Vector3(x + 1.6, NERVE_Y - 0.5, front + NERVE_STUB * (0.6 + (index % 2) * 0.4)),
      ]),
      4,
      NERVE_RADIUS * 0.75,
      DETAIL.tube,
      false,
    );
    addMesh(context, parent, stub, 'nerve', 'nerve');
  });
  label(context, 'nerve', parent, [NERVE_BRANCHES[3], NERVE_Y, front + NERVE_RADIUS]);
}

class Surface implements TongueSurface {
  private readonly pores: MeshStandardMaterial;
  private readonly buds: { sweet: MeshStandardMaterial; sour: MeshStandardMaterial };
  private readonly nerve: MeshStandardMaterial;
  private readonly sweet = new Color(TASTE_GLOWS.sweet);
  private readonly sour = new Color(TASTE_GLOWS.sour);

  constructor(context: PartContext, parent: Object3D) {
    buildSlab(context, parent);
    this.pores = buildPapillae(context, parent).material as MeshStandardMaterial;
    this.buds = buildCutPapilla(context, parent);
    buildNerves(context, parent);
    this.nerve = material(context, 'nerve', 'nerve');
    this.nerve.emissive.set(TASTE_GLOWS.cold);
    this.buds.sweet.emissive.copy(this.sweet);
    this.buds.sour.emissive.copy(this.sour);
  }

  setTaste({ sweet, sour, cold }: TasteReading): void {
    this.buds.sweet.emissiveIntensity = GLOW.taste * sweet;
    this.buds.sour.emissiveIntensity = GLOW.taste * sour;
    const total = sweet + sour;
    if (total > 0) this.pores.emissive.copy(this.sweet).lerp(this.sour, sour / total);
    this.pores.emissiveIntensity = GLOW.taste * Math.max(sweet, sour) * HALF;
    this.nerve.emissiveIntensity = GLOW.cold * cold;
  }
}

export function buildTongueSurface(context: PartContext, parent: Object3D): TongueSurface {
  return new Surface(context, parent);
}
