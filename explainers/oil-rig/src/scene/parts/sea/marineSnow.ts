import { lerp } from '@core/math';
import { UNDIMMED_GROUP } from '@core/scene/materials';
import { SEABED_Y } from '../../../model/scale';
import { BLOCK, RENDER_ORDER, SNOW } from '../../constants';
import type { PartContext } from '../context';
import { Stream } from '../flows/stream';

export class MarineSnowPart {
  private readonly stream: Stream;
  private readonly spread: Float32Array;

  constructor(context: PartContext) {
    this.stream = new Stream(context, {
      count: SNOW.count,
      group: UNDIMMED_GROUP,
      renderOrder: RENDER_ORDER.particles,
      sizeScale: SNOW.size,
      tones: SNOW.tones,
      seed: SNOW.seed,
    });
    this.spread = Float32Array.from(this.stream.particles, (particle) => particle.angle);
  }

  get points() {
    return this.stream.points;
  }

  setVisible(visible: boolean): void {
    this.stream.setVisible(visible);
  }

  update(deltaSeconds: number, time: number, pointSize: number): void {
    if (!this.stream.points.visible) return;
    const top = -SNOW.surfaceGap;
    const bottom = SEABED_Y + SNOW.seabedGap;
    this.stream.setSize(pointSize);
    this.stream.advance((SNOW.speed * deltaSeconds) / (top - bottom), 1);
    const particles = this.stream.particles;
    for (let index = 0; index < particles.length; index++) {
      const particle = particles[index];
      const sway = Math.sin(time * SNOW.swayRate + this.spread[index]) * SNOW.sway;
      const x = lerp(-BLOCK.halfWidth, BLOCK.halfWidth, particle.lane) + sway;
      const z = lerp(BLOCK.back, BLOCK.cutZ, particle.depth);
      const y = lerp(top, bottom, particle.progress);
      const fade = Math.min(particle.progress, 1 - particle.progress) * SNOW.edgeFade;
      this.stream.put(index, x, y, z, Math.min(fade, 1) * SNOW.alpha);
    }
    this.stream.commit();
  }
}
