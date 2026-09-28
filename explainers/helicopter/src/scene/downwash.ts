import { Color } from 'three';
import type { Points, Texture } from 'three';
import { PointCloud, createPointMaterial } from '@core/scene/pointCloud';
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
  private readonly cloud: PointCloud;

  constructor(texture: Texture, tracker: ResourceTracker) {
    this.particles = Array.from({ length: DOWNWASH.count }, (_, index) =>
      seedParticle(index / DOWNWASH.count),
    );
    const size = DOWNWASH.particleSize * SCENE_UNITS_PER_METRE;
    const material = tracker.track(createPointMaterial(texture, size));
    this.cloud = tracker.track(new PointCloud(DOWNWASH.count, material, OVERLAY_ORDER));
    this.points = this.cloud.points;
  }

  setVisible(visible: boolean): void {
    this.points.visible = visible;
  }

  update(frame: DownwashFrame): boolean {
    if (!this.points.visible) return false;
    const step = (fallSpeed(frame.rpm, frame.collective) * frame.deltaSeconds) / FALL;
    this.particles.forEach((particle, index) => {
      particle.progress += step;
      if (particle.progress >= 1) Object.assign(particle, seedParticle(particle.progress % 1));
      this.place(index, particle, frame.forward);
    });
    this.cloud.commit();
    return step > 0;
  }

  private place(index: number, particle: Particle, forward: number): void {
    const { progress } = particle;
    const radius =
      ROTOR.radiusMetres * particle.radiusShare * (1 - DOWNWASH.wakeContraction * progress);
    const skew = DOWNWASH.forwardSkew * forward * progress * FALL;
    const x = -radius * Math.cos(particle.angle) - skew;
    const z = radius * Math.sin(particle.angle);
    this.cloud.setPoint(index, x, TOP - progress * FALL, z);
    this.cloud.setColor(index, AIR_COLOR.r, AIR_COLOR.g, AIR_COLOR.b, fade(progress));
  }
}
