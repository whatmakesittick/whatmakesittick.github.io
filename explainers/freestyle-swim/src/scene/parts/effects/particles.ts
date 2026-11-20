import type { Color, Object3D } from 'three';
import { UNDIMMED_GROUP } from '@core/scene/materials';
import { PointCloud, createPointMaterial } from '@core/scene/pointCloud';
import { registered } from '../context';
import type { PartContext } from '../context';
import { LAYER } from '../pool/constants';

const POINT_COUNT = 96;
const POINT_SIZE_M = 0.02;
const GRAVITY = 9.8;
const BUBBLE = { rise: 0.3, wobble: 0.04, life: 1.2, alpha: 0.38, drift: 0.85 } as const;
const DROPLET = { life: 0.5, alpha: 0.7, up: 1, spread: 0.5 } as const;
const HIDDEN_Y = -50;
const SURFACE_Y = -0.005;
const SEED_RANGE = 6;

interface Particle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  age: number;
  life: number;
  alpha: number;
  seed: number;
  bubble: boolean;
}

function idle(): Particle {
  return {
    x: 0,
    y: HIDDEN_Y,
    z: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    age: 1,
    life: 1,
    alpha: 0,
    seed: 0,
    bubble: false,
  };
}

export class Particles {
  readonly object: Object3D;
  private readonly cloud: PointCloud;
  private readonly items = Array.from({ length: POINT_COUNT }, idle);
  private readonly tint: Color;

  constructor(context: PartContext, tint: Color) {
    this.tint = tint;
    const material = registered(
      context,
      UNDIMMED_GROUP,
      createPointMaterial(context.textures.dot, POINT_SIZE_M),
    );
    this.cloud = new PointCloud(POINT_COUNT, material, LAYER.effects);
    context.tracker.track({ dispose: () => this.cloud.dispose() });
    this.object = this.cloud.points;
    this.write();
  }

  get alive(): boolean {
    return this.items.some((item) => item.age < item.life);
  }

  bubble(x: number, y: number, z: number): void {
    this.claim({
      ...idle(),
      x,
      y: Math.min(y, SURFACE_Y * 2),
      z,
      vy: BUBBLE.rise * (0.7 + Math.random() * 0.6),
      age: 0,
      life: BUBBLE.life,
      alpha: BUBBLE.alpha,
      seed: Math.random() * SEED_RANGE,
      bubble: true,
    });
  }

  droplet(x: number, z: number): void {
    const angle = Math.random() * Math.PI * 2;
    this.claim({
      ...idle(),
      x,
      y: 0,
      z,
      vx: Math.cos(angle) * DROPLET.spread * Math.random(),
      vy: DROPLET.up * (0.6 + Math.random() * 0.4),
      vz: Math.sin(angle) * DROPLET.spread * Math.random(),
      age: 0,
      life: DROPLET.life,
      alpha: DROPLET.alpha,
    });
  }

  advance(seconds: number, driftM: number): void {
    this.items.forEach((item) => {
      if (item.age >= item.life) return;
      item.age += seconds;
      item.x += item.vx * seconds - driftM * (item.bubble ? BUBBLE.drift : 1);
      item.z +=
        item.vz * seconds +
        (item.bubble ? Math.sin(item.age * 5 + item.seed) * BUBBLE.wobble * seconds : 0);
      item.y += item.vy * seconds;
      if (!item.bubble) item.vy -= GRAVITY * seconds;
      const landed = item.bubble ? item.y >= SURFACE_Y : item.y < 0 && item.age > seconds;
      if (landed) item.age = item.life;
    });
    this.write();
  }

  clear(): void {
    this.items.forEach((item) => Object.assign(item, idle()));
    this.write();
  }

  private claim(next: Particle): void {
    const slot = this.items.find((item) => item.age >= item.life);
    if (slot) Object.assign(slot, next);
  }

  private write(): void {
    this.items.forEach((item, index) => {
      const live = item.age < item.life;
      this.cloud.setPoint(index, item.x, live ? item.y : HIDDEN_Y, item.z);
      const fade = live ? item.alpha * (1 - item.age / item.life) : 0;
      this.cloud.setColor(index, this.tint.r, this.tint.g, this.tint.b, fade);
    });
    this.cloud.commit();
  }
}
