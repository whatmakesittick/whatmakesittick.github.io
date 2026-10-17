import { Group, Mesh, Vector3 } from 'three';
import type { BufferGeometry, Material } from 'three';
import { ARROW_EASE, RENDER_ORDER } from './constants';
import type { ArrowStyle } from './constants';
import { EasedLength } from './easedLength';

export interface ArrowShapes {
  shaft: BufferGeometry;
  head: BufferGeometry;
}

const UP = new Vector3(0, 1, 0);
const TINY = 1e-6;

export class ForceArrow {
  readonly object = new Group();
  private readonly body = new Group();
  private readonly shaft: Mesh;
  private readonly head: Mesh;
  private readonly length = new EasedLength();
  private readonly style: ArrowStyle;
  private readonly endsAtOrigin: boolean;

  constructor(shapes: ArrowShapes, material: Material, style: ArrowStyle, endsAtOrigin = false) {
    this.style = style;
    this.endsAtOrigin = endsAtOrigin;
    this.shaft = new Mesh(shapes.shaft, material);
    this.head = new Mesh(shapes.head, material);
    this.shaft.renderOrder = RENDER_ORDER.arrow;
    this.head.renderOrder = RENDER_ORDER.arrow;
    this.body.add(this.shaft, this.head);
    this.object.add(this.body);
    this.draw();
  }

  get settled(): boolean {
    return this.length.settled;
  }

  aim(origin: Vector3, direction: Vector3, length: number): void {
    this.object.position.copy(origin);
    if (direction.lengthSq() > TINY) this.object.quaternion.setFromUnitVectors(UP, direction);
    this.length.aim(length);
  }

  reset(): void {
    this.length.snap(0);
    this.draw();
  }

  advance(deltaSeconds: number): boolean {
    const moving = this.length.advance(deltaSeconds);
    if (moving) this.draw();
    return moving;
  }

  tip(target: Vector3): Vector3 {
    return target
      .set(0, this.endsAtOrigin ? 0 : this.length.value, 0)
      .applyMatrix4(this.object.matrix);
  }

  private draw(): void {
    const length = this.length.value;
    const { shaftRadius, headRadius, headLength, tipGap } = this.style;
    const share = Math.min(1, length / headLength);
    const shaftLength = Math.max(length - headLength, 0);
    this.object.visible = length > ARROW_EASE.shown;
    this.body.position.y = this.endsAtOrigin ? -(length + tipGap) : 0;
    this.shaft.visible = shaftLength > 0;
    this.shaft.scale.set(shaftRadius, Math.max(shaftLength, TINY), shaftRadius);
    this.head.position.y = length;
    this.head.scale.set(headRadius * share, headLength * share, headRadius * share);
  }
}
