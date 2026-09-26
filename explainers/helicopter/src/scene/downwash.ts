import { BufferAttribute, BufferGeometry, Color, Points, PointsMaterial } from 'three';
import type { Texture } from 'three';
import type { ResourceTracker } from '@core/scene/resources';
import { ROTOR } from '../model';
import { THEME } from '../theme';
import { DOWNWASH, HOVER_HEIGHT, HUB, SCENE_UNITS_PER_METRE } from './constants';

export interface DownwashFrame {
  rpm: number;
  collective: number;
  forward: number;
  deltaSeconds: number;
}

interface Particle {
  radiusShare: number;
  angle: number;
  progress: number;
}

const AIR_COLOR = new Color(THEME.air);
const XYZ = 3;
const RGBA = 4;
const ALPHA = 3;
const OVERLAY_ORDER = 2;
const TOP = HUB.height + DOWNWASH.startAbove;
const FALL = TOP + HOVER_HEIGHT;

function seedParticle(progress: number): Particle {
  return {
    radiusShare: Math.sqrt(Math.random()),
    angle: Math.random() * Math.PI * 2,
    progress,
  };
}

function fade(progress: number): number {
  const fadeIn = Math.min(1, progress / DOWNWASH.fadeIn);
  const fadeOut = Math.min(1, (1 - progress) / DOWNWASH.fadeOut);
  return Math.min(fadeIn, fadeOut) * DOWNWASH.opacity;
}

function fallSpeed(rpm: number, collective: number): number {
  return DOWNWASH.fallPerRpm * rpm * Math.sqrt(Math.max(collective, DOWNWASH.minimumLift));
}

export class Downwash {
  readonly points: Points;
  private readonly particles: Particle[];
  private readonly positions: Float32Array;
  private readonly colors: Float32Array;
  private readonly geometry: BufferGeometry;

  constructor(texture: Texture, tracker: ResourceTracker) {
    this.particles = Array.from({ length: DOWNWASH.count }, (_, index) =>
      seedParticle(index / DOWNWASH.count),
    );
    this.positions = new Float32Array(DOWNWASH.count * XYZ);
    this.colors = new Float32Array(DOWNWASH.count * RGBA);
    this.particles.forEach((_, index) => AIR_COLOR.toArray(this.colors, index * RGBA));
    this.geometry = tracker.track(new BufferGeometry());
    this.geometry.setAttribute('position', new BufferAttribute(this.positions, XYZ));
    this.geometry.setAttribute('color', new BufferAttribute(this.colors, RGBA));
    const material = tracker.track(
      new PointsMaterial({
        size: DOWNWASH.particleSize * SCENE_UNITS_PER_METRE,
        map: texture,
        vertexColors: true,
        transparent: true,
        depthWrite: false,
        sizeAttenuation: true,
      }),
    );
    this.points = new Points(this.geometry, material);
    this.points.frustumCulled = false;
    this.points.renderOrder = OVERLAY_ORDER;
  }

  setVisible(visible: boolean): void {
    this.points.visible = visible;
  }

  update(frame: DownwashFrame): void {
    if (!this.points.visible) return;
    const step = (fallSpeed(frame.rpm, frame.collective) * frame.deltaSeconds) / FALL;
    this.particles.forEach((particle, index) => {
      particle.progress += step;
      if (particle.progress >= 1) Object.assign(particle, seedParticle(particle.progress % 1));
      this.place(index, particle, frame.forward);
    });
    this.geometry.getAttribute('position').needsUpdate = true;
    this.geometry.getAttribute('color').needsUpdate = true;
  }

  private place(index: number, particle: Particle, forward: number): void {
    const { progress } = particle;
    const radius =
      ROTOR.radiusMetres * particle.radiusShare * (1 - DOWNWASH.wakeContraction * progress);
    const skew = DOWNWASH.forwardSkew * forward * progress * FALL;
    const offset = index * XYZ;
    this.positions[offset] = -radius * Math.cos(particle.angle) - skew;
    this.positions[offset + 1] = TOP - progress * FALL;
    this.positions[offset + 2] = radius * Math.sin(particle.angle);
    this.colors[index * RGBA + ALPHA] = fade(progress);
  }
}
