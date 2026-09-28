import { Color } from 'three';
import type { ColorRepresentation, PointsMaterial } from 'three';
import { createPointMaterial, PointCloud } from '@core/scene/pointCloud';
import { seededRandom } from '../../geometry/random';
import type { EmphasisGroup, PartContext } from '../context';

export interface Particle {
  progress: number;
  lane: number;
  depth: number;
  side: 1 | -1;
  angle: number;
  tint: Color;
}

export interface StreamSpec {
  count: number;
  group: EmphasisGroup;
  renderOrder: number;
  sizeScale: number;
  tones: readonly ColorRepresentation[];
  seed: number;
}

const FULL_TURN = Math.PI * 2;

export class Stream {
  readonly cloud: PointCloud;
  readonly particles: Particle[];
  private readonly material: PointsMaterial;
  private readonly sizeScale: number;

  constructor(context: PartContext, spec: StreamSpec) {
    this.material = context.tracker.track(createPointMaterial(context.textures.dot, 1));
    context.materials.register(spec.group, this.material);
    this.cloud = context.tracker.track(new PointCloud(spec.count, this.material, spec.renderOrder));
    this.sizeScale = spec.sizeScale;
    const random = seededRandom(spec.seed);
    const tones = spec.tones.map((tone) => new Color(tone));
    this.particles = Array.from({ length: spec.count }, (_, index) => ({
      progress: (index + random()) / spec.count,
      lane: random(),
      depth: random(),
      side: index % 2 === 0 ? 1 : -1,
      angle: random() * FULL_TURN,
      tint: tones[index % tones.length],
    }));
  }

  get points() {
    return this.cloud.points;
  }

  setVisible(visible: boolean): void {
    this.cloud.points.visible = visible;
  }

  setSize(size: number): void {
    this.material.size = size * this.sizeScale;
  }

  advance(step: number, span: number): void {
    for (const particle of this.particles) {
      particle.progress += step;
      if (particle.progress >= span) particle.progress -= span;
    }
  }

  put(index: number, x: number, y: number, z: number, alpha: number): void {
    const { tint } = this.particles[index];
    this.cloud.setPoint(index, x, y, z);
    this.cloud.setColor(index, tint.r, tint.g, tint.b, alpha);
  }

  commit(): void {
    this.cloud.commit();
  }
}
