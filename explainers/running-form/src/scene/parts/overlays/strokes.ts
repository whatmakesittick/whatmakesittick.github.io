import {
  BufferAttribute,
  BufferGeometry,
  Color,
  CylinderGeometry,
  Mesh,
  MeshBasicMaterial,
  SphereGeometry,
  Vector3,
} from 'three';
import { UNDIMMED_GROUP } from '@core/scene/materials';
import { LAYER } from '../../constants';
import { registered } from '../context';
import type { PartContext } from '../context';
import { clamp, FULL_TURN } from '@core/math';

const UP = new Vector3(0, 1, 0);
const LINE_SEGMENTS = 8;
const ARC_SEGMENTS = 28;
const ARC_SIDES = 6;
const DOT_SEGMENTS = 12;

export function overlayMaterial(
  context: PartContext,
  colour: string,
  onTop: boolean,
): MeshBasicMaterial {
  return registered(
    context,
    UNDIMMED_GROUP,
    new MeshBasicMaterial({
      color: new Color(colour),
      transparent: true,
      depthWrite: false,
      depthTest: !onTop,
      fog: false,
      toneMapped: false,
    }),
  );
}

export function unitLine(context: PartContext): BufferGeometry {
  return context.tracker.track(
    new CylinderGeometry(1, 1, 1, LINE_SEGMENTS, 1, true).translate(0, 0.5, 0),
  );
}

export function unitDot(context: PartContext): BufferGeometry {
  return context.tracker.track(new SphereGeometry(1, DOT_SEGMENTS, DOT_SEGMENTS / 2));
}

const span = new Vector3();

export function stretch(mesh: Mesh, from: Vector3, to: Vector3, radius: number): void {
  span.subVectors(to, from);
  const length = span.length();
  mesh.visible = length > 1e-4;
  if (!mesh.visible) return;
  mesh.position.copy(from);
  mesh.quaternion.setFromUnitVectors(UP, span.divideScalar(length));
  mesh.scale.set(radius, length, radius);
}

export function overlayMesh(geometry: BufferGeometry, material: MeshBasicMaterial): Mesh {
  const mesh = new Mesh(geometry, material);
  mesh.renderOrder = LAYER.overlay;
  mesh.frustumCulled = false;
  return mesh;
}

const axisU = new Vector3();
const axisV = new Vector3();
const normal = new Vector3();
const point = new Vector3();
const radial = new Vector3();
const vertex = new Vector3();

export class ArcTube {
  readonly mesh: Mesh;
  private readonly positions: Float32Array;
  private readonly attribute: BufferAttribute;
  angleRad = 0;

  constructor(context: PartContext, material: MeshBasicMaterial) {
    const ring = ARC_SIDES + 1;
    this.positions = new Float32Array((ARC_SEGMENTS + 1) * ring * 3);
    this.attribute = new BufferAttribute(this.positions, 3);
    const index: number[] = [];
    for (let segment = 0; segment < ARC_SEGMENTS; segment += 1) {
      for (let side = 0; side < ARC_SIDES; side += 1) {
        const a = segment * ring + side;
        const b = a + ring;
        index.push(a, b, a + 1, a + 1, b, b + 1);
      }
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', this.attribute);
    geometry.setIndex(index);
    this.mesh = overlayMesh(context.tracker.track(geometry), material);
  }

  set(centre: Vector3, from: Vector3, to: Vector3, radius: number, thickness: number): void {
    axisU.copy(from).normalize();
    normal.crossVectors(axisU, to).normalize();
    axisV.crossVectors(normal, axisU).normalize();
    this.angleRad = Math.acos(clamp(axisU.dot(to.clone().normalize()), -1, 1));
    const ring = ARC_SIDES + 1;
    for (let segment = 0; segment <= ARC_SEGMENTS; segment += 1) {
      const angle = (segment / ARC_SEGMENTS) * this.angleRad;
      radial.copy(axisU).multiplyScalar(Math.cos(angle)).addScaledVector(axisV, Math.sin(angle));
      point.copy(centre).addScaledVector(radial, radius);
      for (let side = 0; side <= ARC_SIDES; side += 1) {
        const around = (side / ARC_SIDES) * FULL_TURN;
        vertex
          .copy(point)
          .addScaledVector(radial, Math.cos(around) * thickness)
          .addScaledVector(normal, Math.sin(around) * thickness);
        vertex.toArray(this.positions, (segment * ring + side) * 3);
      }
    }
    this.attribute.needsUpdate = true;
  }

  midpoint(centre: Vector3, radius: number, out: Vector3): Vector3 {
    const half = this.angleRad / 2;
    return out
      .copy(centre)
      .addScaledVector(axisU, Math.cos(half) * radius)
      .addScaledVector(axisV, Math.sin(half) * radius);
  }
}

export class Fade {
  share = 0;
  target = 0;
  private readonly seconds: number;

  constructor(seconds: number) {
    this.seconds = seconds;
  }

  aim(on: boolean): void {
    this.target = on ? 1 : 0;
  }

  step(deltaSeconds: number): boolean {
    if (this.share === this.target) return false;
    const change = deltaSeconds / this.seconds;
    this.share =
      this.target > this.share
        ? Math.min(this.target, this.share + change)
        : Math.max(this.target, this.share - change);
    return true;
  }
}
