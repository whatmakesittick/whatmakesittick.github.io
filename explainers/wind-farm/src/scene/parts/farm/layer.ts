import { BufferGeometry, Mesh } from 'three';
import type { Group, Material, Object3D } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { anchorAt } from '@core/scene/parts';
import type { PartId, Point, SpacingD } from '../../../ids';
import type { GroundPoint } from '../../../model';
import { namedGroup } from '../context';
import type { PartContext } from '../context';
import { ribbonGeometry } from './ground';
import type { RibbonOptions } from './ground';

export interface LayerShape {
  readonly geometry: BufferGeometry;
  readonly label: Point;
}

export type LayerBuilder = (spacing: SpacingD) => LayerShape;

export interface RibbonSet {
  readonly routes: readonly (readonly GroundPoint[])[];
  readonly options: RibbonOptions;
}

export function ribbons(sets: readonly RibbonSet[]): BufferGeometry {
  const parts = sets.flatMap(({ routes, options }) =>
    routes.map((route) => ribbonGeometry(route, options)),
  );
  const merged = mergeGeometries(parts);
  parts.forEach((part) => part.dispose());
  if (!merged) throw new Error('Farm ribbons do not share attributes');
  return merged;
}

export class SpacingLayer {
  readonly group: Group;
  readonly mesh: Mesh;
  private readonly label: Object3D;
  private readonly context: PartContext;
  private readonly build: LayerBuilder;
  private readonly shapes = new Map<SpacingD, LayerShape>();

  constructor(context: PartContext, part: PartId, material: Material, build: LayerBuilder) {
    this.context = context;
    this.build = build;
    this.group = namedGroup(part);
    this.mesh = new Mesh(context.tracker.track(new BufferGeometry()), material);
    this.mesh.name = part;
    this.group.add(this.mesh);
    this.label = anchorAt(this.group, 0, 0, 0);
    context.labels.set(part, this.label);
  }

  show(spacing: SpacingD): void {
    const shape = this.shapeFor(spacing);
    this.mesh.geometry = shape.geometry;
    this.label.position.set(...shape.label);
  }

  private shapeFor(spacing: SpacingD): LayerShape {
    let shape = this.shapes.get(spacing);
    if (!shape) {
      shape = this.build(spacing);
      this.context.tracker.track(shape.geometry);
      this.shapes.set(spacing, shape);
    }
    return shape;
  }
}
