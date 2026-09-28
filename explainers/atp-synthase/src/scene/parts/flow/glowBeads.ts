import { AdditiveBlending, Color, Group, IcosahedronGeometry, Matrix4 } from 'three';
import type { InstancedMesh } from 'three';
import type { MaterialFinish } from '@core/scene/materials';
import { PointCloud, createPointMaterial } from '@core/scene/pointCloud';
import { nm } from '../../../model/scale';
import type { BeadPose } from '../../flow/points';
import { instancedMesh } from '../context';
import type { EmphasisGroup, PartContext } from '../context';

export interface GlowStyle {
  readonly radius: number;
  readonly haloSize: number;
  readonly haloAlpha: number;
  readonly color: string;
  readonly finish: MaterialFinish;
}

const BEAD_DETAIL = 1;

export class GlowBeads {
  readonly object = new Group();
  readonly count: number;
  private readonly cores: InstancedMesh;
  private readonly halos: PointCloud;
  private readonly matrix = new Matrix4();
  private readonly tint: Color;
  private readonly haloAlpha: number;

  constructor(context: PartContext, group: EmphasisGroup, count: number, style: GlowStyle) {
    this.count = count;
    this.tint = new Color(style.color);
    this.haloAlpha = style.haloAlpha;
    const bead = new IcosahedronGeometry(style.radius, BEAD_DETAIL);
    this.cores = instancedMesh(context, bead, group, style.finish, count);
    this.cores.frustumCulled = false;
    const halo = createPointMaterial(context.textures.glow, nm(style.haloSize), AdditiveBlending);
    context.materials.register(group, context.tracker.track(halo));
    this.halos = context.tracker.track(new PointCloud(count, halo));
    this.object.add(this.cores, this.halos.points);
    for (let index = 0; index < count; index += 1) this.hide(index);
    this.commit();
  }

  set(index: number, pose: BeadPose): void {
    const { x, y, z } = pose.position;
    const scale = pose.scale;
    this.matrix.makeScale(scale, scale, scale).setPosition(x, y, z);
    this.cores.setMatrixAt(index, this.matrix);
    this.halos.setPoint(index, x, y, z);
    const { r, g, b } = this.tint;
    this.halos.setColor(index, r, g, b, scale * this.haloAlpha);
  }

  hide(index: number): void {
    this.matrix.makeScale(0, 0, 0);
    this.cores.setMatrixAt(index, this.matrix);
    this.halos.setColor(index, 0, 0, 0, 0);
  }

  commit(): void {
    this.cores.instanceMatrix.needsUpdate = true;
    this.halos.commit();
  }
}
