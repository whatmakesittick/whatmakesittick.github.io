import { AdditiveBlending, Color } from 'three';
import type { Curve, PointsMaterial, Vector3 } from 'three';
import { clamp } from '@core/math';
import { PointCloud, createPointMaterial } from '@core/scene/pointCloud';
import { FLOW, RENDER_ORDER } from '../constants';
import { seededRandom } from '../geometry/random';
import { registered } from './context';
import type { EmphasisGroup, PartContext } from './context';

const XYZ = 3;
const JITTER = 0.35;

export class FlowDots {
  readonly cloud: PointCloud;
  private readonly material: PointsMaterial;
  private readonly offsets: number[];
  private readonly tint = new Color(FLOW.color);
  private samples = new Float32Array(0);
  private travelled = 0;
  private speed = 0;
  private length = 1;
  private shown = true;

  constructor(context: PartContext, group: EmphasisGroup, count: number, seed: number) {
    this.material = registered(
      context,
      group,
      createPointMaterial(context.textures.glow, 1, AdditiveBlending),
    );
    this.cloud = context.tracker.track(
      new PointCloud(count, this.material, RENDER_ORDER.particles),
    );
    const random = seededRandom(seed);
    this.offsets = Array.from({ length: count }, (_, index) => (index + random() * JITTER) / count);
  }

  get points() {
    return this.cloud.points;
  }

  setRoute(path: Curve<Vector3>): void {
    const points = path.getSpacedPoints(FLOW.samples - 1);
    this.samples = new Float32Array(points.length * XYZ);
    points.forEach((point, index) => point.toArray(this.samples, index * XYZ));
    this.length = Math.max(path.getLength(), 1);
    this.place();
  }

  setShare(share: number): void {
    const level = clamp(share, 0, 1);
    this.speed = level > 0 ? FLOW.minSpeed + (FLOW.maxSpeed - FLOW.minSpeed) * level : 0;
    this.refresh();
  }

  setShown(shown: boolean): void {
    this.shown = shown;
    this.refresh();
  }

  update(deltaSeconds: number, pointSize: number): boolean {
    if (!this.cloud.points.visible || this.speed === 0) return false;
    this.material.size = pointSize;
    this.travelled = (this.travelled + (this.speed * deltaSeconds) / this.length) % 1;
    this.place();
    return true;
  }

  private refresh(): void {
    this.cloud.points.visible = this.shown && this.speed > 0;
  }

  private place(): void {
    const last = this.samples.length / XYZ - 1;
    if (last < 1) return;
    this.offsets.forEach((offset, index) => {
      const progress = (offset + this.travelled) % 1;
      const position = progress * last;
      const from = Math.floor(position);
      const to = Math.min(from + 1, last);
      const share = position - from;
      const read = (sample: number, axis: number) => this.samples[sample * XYZ + axis];
      this.cloud.setPoint(
        index,
        read(from, 0) + (read(to, 0) - read(from, 0)) * share,
        read(from, 1) + (read(to, 1) - read(from, 1)) * share,
        read(from, 2) + (read(to, 2) - read(from, 2)) * share,
      );
      const fade = Math.min(1, progress / FLOW.fadeShare, (1 - progress) / FLOW.fadeShare);
      this.cloud.setColor(index, this.tint.r, this.tint.g, this.tint.b, fade);
    });
    this.cloud.commit();
  }
}
