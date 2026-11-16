import { AdditiveBlending, Color } from 'three';
import type { Object3D, Texture, Vector3 } from 'three';
import { PointCloud, createPointMaterial } from '@core/scene/pointCloud';
import { anchorAt } from '@core/scene/parts';
import type { PartId } from '../../../ids';
import { registeredMaterial } from '../context';
import type { EmphasisGroup, PartContext } from '../context';
import type { AtomBatch } from './atomBatch';

export class Glows {
  private readonly cloud: PointCloud;
  private readonly colour = new Color();
  private readonly capacity: number;
  private used = 0;

  constructor(
    context: PartContext,
    parent: Object3D,
    group: EmphasisGroup,
    options: { capacity: number; size: number; texture?: Texture; renderOrder?: number },
  ) {
    const shade = registeredMaterial(
      context,
      group,
      createPointMaterial(options.texture ?? context.textures.glow, options.size, AdditiveBlending),
    );
    this.capacity = options.capacity;
    this.cloud = context.tracker.track(
      new PointCloud(options.capacity, shade, options.renderOrder),
    );
    this.cloud.points.name = `${group}Glow`;
    parent.add(this.cloud.points);
  }

  begin(): void {
    this.used = 0;
  }

  add(at: Vector3, colour: string, alpha: number): void {
    if (alpha <= 0 || this.used >= this.capacity) return;
    this.colour.set(colour);
    this.cloud.setPoint(this.used, at.x, at.y, at.z);
    this.cloud.setColor(this.used, this.colour.r, this.colour.g, this.colour.b, Math.min(1, alpha));
    this.used += 1;
  }

  end(): void {
    for (let index = this.used; index < this.capacity; index += 1)
      this.cloud.setColor(index, 0, 0, 0, 0);
    this.cloud.commit();
  }
}

interface Candidate {
  priority: number;
  readonly at: Vector3;
}

export class LabelPicker {
  private readonly anchors = new Map<PartId, Object3D>();
  private readonly best = new Map<PartId, Candidate>();

  constructor(parts: readonly PartId[], parent: Object3D, labels: Map<PartId, Object3D>) {
    parts.forEach((part) => {
      const anchor = anchorAt(parent, 0, 0, 0);
      anchor.name = `${part}Label`;
      this.anchors.set(part, anchor);
      labels.set(part, anchor);
    });
  }

  begin(): void {
    this.best.forEach((candidate) => (candidate.priority = -Infinity));
  }

  offer(part: PartId, at: Vector3, priority: number): void {
    const current = this.best.get(part);
    if (current && current.priority >= priority) return;
    if (current) {
      current.priority = priority;
      current.at.copy(at);
      return;
    }
    this.best.set(part, { priority, at: at.clone() });
  }

  end(): void {
    this.anchors.forEach((anchor, part) => {
      const candidate = this.best.get(part);
      const found = candidate !== undefined && candidate.priority > -Infinity;
      anchor.visible = found;
      if (found) anchor.position.copy(candidate.at);
    });
  }
}

export interface DrawContext {
  readonly batch: AtomBatch;
  readonly halos: Glows;
  readonly flashes: Glows;
  readonly sparkles: Glows;
  readonly labels: LabelPicker;
}
