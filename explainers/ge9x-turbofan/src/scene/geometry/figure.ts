import {
  BoxGeometry,
  Color,
  CylinderGeometry,
  Float32BufferAttribute,
  LatheGeometry,
  Quaternion,
  SphereGeometry,
  Vector2,
  Vector3,
} from 'three';
import type { BufferGeometry } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { THEME } from '../../theme';

const TONES = {
  skin: '#c99677',
  vest: THEME.person,
  stripe: '#eef0e8',
  shirt: '#7f93ab',
  trousers: '#2b3647',
  boots: '#3a2e27',
  helmet: '#f3f2ec',
  muffs: '#3d434b',
} as const;

type Tone = keyof typeof TONES;

const ROUND = 14;

interface Piece {
  geometry: BufferGeometry;
  tone: Tone;
}

function tinted({ geometry, tone }: Piece): BufferGeometry {
  const colour = new Color(TONES[tone]);
  const count = geometry.getAttribute('position').count;
  const values = new Float32Array(count * 3);
  for (let index = 0; index < count; index += 1) {
    values.set([colour.r, colour.g, colour.b], index * 3);
  }
  geometry.setAttribute('color', new Float32BufferAttribute(values, 3));
  return geometry;
}

const UP = new Vector3(0, 1, 0);

function limb(from: Vector3, to: Vector3, top: number, bottom: number): BufferGeometry {
  const span = new Vector3().subVectors(to, from);
  const geometry = new CylinderGeometry(top, bottom, span.length(), ROUND, 1);
  geometry.applyQuaternion(new Quaternion().setFromUnitVectors(UP, span.clone().normalize()));
  const middle = from.clone().add(to).multiplyScalar(0.5);
  geometry.translate(middle.x, middle.y, middle.z);
  return geometry;
}

function ball(radius: number, at: Vector3, scale = new Vector3(1, 1, 1)): BufferGeometry {
  const geometry = new SphereGeometry(radius, ROUND, ROUND / 2 + 2);
  geometry.scale(scale.x, scale.y, scale.z);
  geometry.translate(at.x, at.y, at.z);
  return geometry;
}

function torso(): BufferGeometry {
  const profile = [
    [0.001, 0.9],
    [0.165, 0.9],
    [0.172, 1.0],
    [0.19, 1.18],
    [0.2, 1.33],
    [0.19, 1.43],
    [0.12, 1.49],
    [0.001, 1.5],
  ].map(([radius, height]) => new Vector2(radius, height));
  const geometry = new LatheGeometry(profile, ROUND + 6);
  geometry.scale(1, 1, 0.62);
  return geometry;
}

function stripe(height: number): BufferGeometry {
  const geometry = new CylinderGeometry(0.197, 0.195, 0.035, ROUND + 6, 1, true);
  geometry.scale(1, 1, 0.64);
  geometry.translate(0, height, 0);
  return geometry;
}

function boot(side: number): BufferGeometry {
  const geometry = new BoxGeometry(0.11, 0.08, 0.27, 2, 1, 2);
  geometry.translate(side * 0.1, 0.04, 0.05);
  return geometry;
}

function helmet(): BufferGeometry[] {
  const dome = new SphereGeometry(0.125, ROUND, 8, 0, Math.PI * 2, 0, Math.PI / 2);
  dome.translate(0, 1.685, 0.005);
  const brim = new CylinderGeometry(0.14, 0.145, 0.014, ROUND + 6);
  brim.translate(0, 1.688, 0.02);
  return [dome, brim];
}

function pieces(): Piece[] {
  const hipL = new Vector3(-0.1, 0.9, 0);
  const hipR = new Vector3(0.1, 0.9, 0);
  const kneeL = new Vector3(-0.105, 0.5, 0.02);
  const kneeR = new Vector3(0.105, 0.5, 0.02);
  const ankleL = new Vector3(-0.1, 0.09, 0);
  const ankleR = new Vector3(0.1, 0.09, 0);
  const shoulderL = new Vector3(-0.215, 1.42, 0);
  const shoulderR = new Vector3(0.215, 1.42, 0);
  const elbowL = new Vector3(-0.255, 1.13, -0.02);
  const elbowR = new Vector3(0.255, 1.13, -0.02);
  const wristL = new Vector3(-0.24, 0.87, 0.06);
  const wristR = new Vector3(0.24, 0.87, 0.06);
  return [
    { geometry: boot(-1), tone: 'boots' },
    { geometry: boot(1), tone: 'boots' },
    { geometry: limb(ankleL, kneeL, 0.062, 0.05), tone: 'trousers' },
    { geometry: limb(ankleR, kneeR, 0.062, 0.05), tone: 'trousers' },
    { geometry: limb(kneeL, hipL, 0.08, 0.064), tone: 'trousers' },
    { geometry: limb(kneeR, hipR, 0.08, 0.064), tone: 'trousers' },
    {
      geometry: ball(0.17, new Vector3(0, 0.93, 0), new Vector3(1.08, 0.55, 0.72)),
      tone: 'trousers',
    },
    { geometry: torso(), tone: 'vest' },
    { geometry: stripe(1.06), tone: 'stripe' },
    { geometry: stripe(1.2), tone: 'stripe' },
    { geometry: ball(0.07, shoulderL), tone: 'shirt' },
    { geometry: ball(0.07, shoulderR), tone: 'shirt' },
    { geometry: limb(elbowL, shoulderL, 0.056, 0.048), tone: 'shirt' },
    { geometry: limb(elbowR, shoulderR, 0.056, 0.048), tone: 'shirt' },
    { geometry: limb(wristL, elbowL, 0.047, 0.04), tone: 'shirt' },
    { geometry: limb(wristR, elbowR, 0.047, 0.04), tone: 'shirt' },
    { geometry: ball(0.045, wristL.clone().add(new Vector3(0, -0.05, 0.01))), tone: 'skin' },
    { geometry: ball(0.045, wristR.clone().add(new Vector3(0, -0.05, 0.01))), tone: 'skin' },
    {
      geometry: limb(new Vector3(0, 1.47, 0), new Vector3(0, 1.58, 0.01), 0.048, 0.052),
      tone: 'skin',
    },
    { geometry: ball(0.105, new Vector3(0, 1.65, 0.015), new Vector3(0.92, 1.1, 1)), tone: 'skin' },
    ...helmet().map((geometry): Piece => ({ geometry, tone: 'helmet' })),
    { geometry: ball(0.042, new Vector3(-0.1, 1.64, 0.01), new Vector3(0.7, 1, 1)), tone: 'muffs' },
    { geometry: ball(0.042, new Vector3(0.1, 1.64, 0.01), new Vector3(0.7, 1, 1)), tone: 'muffs' },
  ];
}

export function figureGeometry(): BufferGeometry {
  const parts = pieces().map((piece) => {
    const geometry = tinted(piece);
    return geometry.index ? geometry.toNonIndexed() : geometry;
  });
  const merged = mergeGeometries(parts);
  parts.forEach((part) => part.dispose());
  if (!merged) throw new Error('Cannot merge the figure');
  return merged;
}
