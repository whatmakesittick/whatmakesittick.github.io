import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Group,
  Matrix4,
  Points,
  PointsMaterial,
  SphereGeometry,
} from 'three';
import { clamp } from '@core/math';
import { UNDIMMED_GROUP } from '@core/scene/materials';
import { BALANCE_CENTRE, PALLET_STAFF, WHEEL_CENTRES } from '../../../model/layout';
import { mm } from '../../../model/scale';
import { ENERGY_FLOW } from '../../constants';
import { PAINT } from '../../finishes';
import { Polyline } from '../../geometry/polyline';
import { instancedMesh } from '../context';
import type { PartContext } from '../context';

const SPHERE_SEGMENTS = 12;
const XYZ = 3;

const PATH = new Polyline([
  WHEEL_CENTRES.barrel,
  WHEEL_CENTRES.centreWheel,
  WHEEL_CENTRES.thirdWheel,
  WHEEL_CENTRES.fourthWheel,
  WHEEL_CENTRES.escapeWheel,
  PALLET_STAFF,
  BALANCE_CENTRE,
]);

export class EnergyPathPart {
  readonly object = new Group();
  private readonly dots;
  private readonly glow: BufferAttribute;
  private readonly matrix = new Matrix4();
  private travelled = 0;
  private scale = 1;

  constructor(context: PartContext) {
    const sphere = new SphereGeometry(ENERGY_FLOW.radius, SPHERE_SEGMENTS, SPHERE_SEGMENTS / 2);
    this.dots = instancedMesh(context, sphere, UNDIMMED_GROUP, 'energy', ENERGY_FLOW.dots);
    this.dots.frustumCulled = false;
    const halo = new BufferGeometry();
    this.glow = new BufferAttribute(new Float32Array(ENERGY_FLOW.dots * XYZ), XYZ);
    halo.setAttribute('position', this.glow);
    const material = new PointsMaterial({
      map: context.textures.glow,
      color: PAINT.energyGlow,
      size: mm(ENERGY_FLOW.glowSize),
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    });
    context.materials.register(UNDIMMED_GROUP, context.tracker.track(material));
    const points = new Points(context.tracker.track(halo), material);
    points.frustumCulled = false;
    this.object.add(this.dots, points);
    this.place();
  }

  setVisible(visible: boolean): void {
    this.object.visible = visible;
  }

  update(deltaSeconds: number, cameraDistance: number): void {
    if (!this.object.visible) return;
    this.travelled += deltaSeconds * ENERGY_FLOW.speedMmPerSecond;
    this.scale = clamp(cameraDistance / ENERGY_FLOW.referenceDistance, 1, ENERGY_FLOW.maxScale);
    this.place();
  }

  private place(): void {
    const spacing = PATH.length / ENERGY_FLOW.dots;
    for (let index = 0; index < ENERGY_FLOW.dots; index += 1) {
      const at = PATH.at(this.travelled + index * spacing);
      this.matrix
        .makeScale(this.scale, this.scale, this.scale)
        .setPosition(at.x, at.y, ENERGY_FLOW.z);
      this.dots.setMatrixAt(index, this.matrix);
      this.glow.setXYZ(index, at.x, at.y, ENERGY_FLOW.z);
    }
    this.dots.instanceMatrix.needsUpdate = true;
    this.glow.needsUpdate = true;
  }
}
