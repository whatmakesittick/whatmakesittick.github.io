import { BufferAttribute, BufferGeometry, DoubleSide, Mesh } from 'three';
import type { Color } from 'three';
import { UNDIMMED_GROUP } from '@core/scene/materials';
import type { PartContext } from '../context';
import { LAYER } from '../pool/constants';
import type { PoolFrame } from '../pool/constants';
import { BASE_VERTEX, FRAGMENT_HEAD, FRAGMENT_TAIL, fogShader } from '../pool/shaders';

const RING_COUNT = 4;
const RING_LIFE_SECONDS = 0.9;
const RING_HALF_M = 0.35;
const RING_Y = 0.004;
const QUAD_CORNERS = [
  [-1, -1],
  [1, -1],
  [1, 1],
  [-1, 1],
] as const;
const QUAD_INDEX = [0, 1, 2, 0, 2, 3];
const SEED_RANGE = 10;

const VERTEX = /* glsl */ `
attribute vec2 aLife;
${BASE_VERTEX.replace('varying vec2 vUv;', 'varying vec2 vUv;\nvarying vec2 vLife;').replace('vUv = uv;', 'vUv = uv;\n  vLife = aLife;')}
`;

const FRAGMENT = /* glsl */ `
${FRAGMENT_HEAD}
varying vec2 vLife;
uniform vec3 uFoam;
void main() {
  float age = vLife.x;
  if (age >= 1.0) discard;
  vec2 c = vUv * 2.0 - 1.0;
  float r = length(c);
  float angle = atan(c.y, c.x);
  float seed = vLife.y;
  float radius = 0.1 + 0.85 * (1.0 - pow(1.0 - age, 2.2));
  float width = mix(0.09, 0.03, age);
  float ring = exp(-pow((r - radius) / width, 2.0));
  float n = (sin(angle * 3.0 + seed * 11.0) + sin(angle * 5.0 - seed * 5.0 + age * 2.0) + sin(angle * 9.0 + seed * 3.0)) / 3.0;
  float broken = smoothstep(-0.7, 0.2, n);
  float inner = (1.0 - smoothstep(0.0, radius, r)) * pow(1.0 - age, 3.0) * 0.35 * (0.6 + 0.4 * n);
  float alpha = (ring * broken * 0.9 + inner) * (1.0 - age) * (1.0 - smoothstep(0.85, 1.0, r));
  gl_FragColor = vec4(uFoam, alpha);
${FRAGMENT_TAIL}`;

interface Ring {
  x: number;
  z: number;
  age: number;
  seed: number;
}

export class SplashRings {
  readonly mesh: Mesh;
  private readonly rings: Ring[] = Array.from({ length: RING_COUNT }, () => ({
    x: 0,
    z: 0,
    age: RING_LIFE_SECONDS,
    seed: 0,
  }));
  private readonly positions = new Float32Array(RING_COUNT * QUAD_CORNERS.length * 3);
  private readonly lives = new Float32Array(RING_COUNT * QUAD_CORNERS.length * 2);
  private readonly geometry = new BufferGeometry();

  constructor(context: PartContext, frame: PoolFrame, foam: Color) {
    const uvs = new Float32Array(RING_COUNT * QUAD_CORNERS.length * 2);
    const indices: number[] = [];
    for (let ring = 0; ring < RING_COUNT; ring += 1) {
      QUAD_CORNERS.forEach(([cx, cy], corner) =>
        uvs.set([(cx + 1) / 2, (cy + 1) / 2], (ring * 4 + corner) * 2),
      );
      indices.push(...QUAD_INDEX.map((index) => ring * 4 + index));
    }
    this.geometry.setAttribute('position', new BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('uv', new BufferAttribute(uvs, 2));
    this.geometry.setAttribute('aLife', new BufferAttribute(this.lives, 2));
    this.geometry.setIndex(indices);
    context.tracker.track(this.geometry);
    const material = fogShader(context, UNDIMMED_GROUP, {
      vertex: VERTEX,
      fragment: FRAGMENT,
      side: DoubleSide,
      transparent: true,
      uniforms: { uScroll: frame.uScroll, uPhase: frame.uPhase, uFoam: { value: foam } },
    });
    this.mesh = new Mesh(this.geometry, material);
    this.mesh.renderOrder = LAYER.effects;
    this.mesh.frustumCulled = false;
    this.write();
  }

  get alive(): boolean {
    return this.rings.some((ring) => ring.age < RING_LIFE_SECONDS);
  }

  spawn(x: number, z: number): void {
    const slot = this.rings.reduce((oldest, ring) => (ring.age > oldest.age ? ring : oldest));
    Object.assign(slot, { x, z, age: 0, seed: Math.random() * SEED_RANGE });
    this.write();
  }

  advance(seconds: number, driftM: number): void {
    this.rings.forEach((ring) => {
      if (ring.age >= RING_LIFE_SECONDS) return;
      ring.age += seconds;
      ring.x -= driftM;
    });
    this.write();
  }

  clear(): void {
    this.rings.forEach((ring) => (ring.age = RING_LIFE_SECONDS));
    this.write();
  }

  private write(): void {
    this.rings.forEach((ring, index) => {
      const live = ring.age < RING_LIFE_SECONDS;
      const half = live ? RING_HALF_M : 0;
      QUAD_CORNERS.forEach(([cx, cy], corner) => {
        const vertex = index * QUAD_CORNERS.length + corner;
        this.positions.set([ring.x + cx * half, RING_Y, ring.z + cy * half], vertex * 3);
        this.lives.set([live ? ring.age / RING_LIFE_SECONDS : 1, ring.seed], vertex * 2);
      });
    });
    this.geometry.getAttribute('position').needsUpdate = true;
    this.geometry.getAttribute('aLife').needsUpdate = true;
  }
}
