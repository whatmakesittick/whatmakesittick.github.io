import { Shape, ShapeGeometry } from 'three';
import type { BufferAttribute, BufferGeometry } from 'three';
import { TessellateModifier } from 'three/addons/modifiers/TessellateModifier.js';
import type { SpacingD } from '../../../ids';
import { terrainHeight, windArrowsX } from '../../../model/layout';
import { FINISHES } from '../../finishes';
import { finishMesh, label, namedGroup } from '../context';
import type { PartContext } from '../context';
import { GROUND_ARROW } from './constants';
import { turnedGround } from './bearing';

const XYZ = 3;
const LIE_FLAT = -Math.PI / 2;
const OVERLAY_OFFSET = -2;

const GROUND_ARROW_FINISH = {
  ...FINISHES.wind,
  transparent: true,
  opacity: GROUND_ARROW.opacity,
  depthWrite: false,
  polygonOffset: true,
  polygonOffsetFactor: OVERLAY_OFFSET,
  polygonOffsetUnits: OVERLAY_OFFSET,
};

function outline(points: readonly (readonly [number, number])[]): Shape {
  const shape = new Shape();
  points.forEach(([x, y], index) => (index === 0 ? shape.moveTo(x, y) : shape.lineTo(x, y)));
  shape.closePath();
  return shape;
}

function arrowShape(): Shape {
  const { length, headLength, shaftHalf, headHalf } = GROUND_ARROW;
  const [tail, tip] = [-length / 2, length / 2];
  const neck = tip - headLength;
  return outline([
    [tail, -shaftHalf],
    [neck, -shaftHalf],
    [neck, -headHalf],
    [tip, 0],
    [neck, headHalf],
    [neck, shaftHalf],
    [tail, shaftHalf],
  ]);
}

function chevronShape(index: number): Shape {
  const { length, chevronLead, chevronPitch, chevronDepth, chevronThickness, chevronSpan } =
    GROUND_ARROW;
  const apex = -length / 2 - chevronLead - index * chevronPitch;
  const back = apex - chevronDepth;
  return outline([
    [apex, 0],
    [back, chevronSpan],
    [back - chevronThickness, chevronSpan],
    [apex - chevronThickness, 0],
    [back - chevronThickness, -chevronSpan],
    [back, -chevronSpan],
  ]);
}

function flatArrow(): BufferGeometry {
  const shapes = [
    arrowShape(),
    ...Array.from({ length: GROUND_ARROW.chevrons }, (_, index) => chevronShape(index)),
  ];
  const flat = new ShapeGeometry(shapes).rotateX(LIE_FLAT);
  const modifier = new TessellateModifier(GROUND_ARROW.maxEdge, GROUND_ARROW.tessellateSteps);
  const geometry = modifier.modify(flat);
  flat.dispose();
  return geometry;
}

export class GroundArrowPart {
  readonly group = namedGroup('prevailingWind');
  private readonly geometry: BufferGeometry;
  private readonly flat: Float32Array;

  constructor(context: PartContext) {
    const mesh = finishMesh(context, flatArrow(), 'prevailingWind', GROUND_ARROW_FINISH);
    mesh.name = 'prevailingWind';
    this.geometry = mesh.geometry;
    this.flat = Float32Array.from(this.geometry.getAttribute('position').array);
    this.group.add(mesh);
    label(context, 'prevailingWind', this.group, [0, GROUND_ARROW.labelLift, 0]);
  }

  place(spacing: SpacingD, turn: number): void {
    const centreX = windArrowsX(spacing) - GROUND_ARROW.offsetX;
    const ground = terrainHeight(centreX, 0);
    this.group.position.set(centreX, ground, 0);
    this.group.rotation.y = turn;
    const position = this.geometry.getAttribute('position') as BufferAttribute;
    for (let vertex = 0; vertex < position.count; vertex += 1) {
      const [x, z] = [this.flat[vertex * XYZ], this.flat[vertex * XYZ + 2]];
      const [dx, dz] = turnedGround(x, z, turn);
      const height = terrainHeight(centreX + dx, dz);
      position.setY(vertex, height - ground + GROUND_ARROW.lift);
    }
    position.needsUpdate = true;
    this.geometry.computeBoundingSphere();
  }
}
