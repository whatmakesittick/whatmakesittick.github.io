import type { Mesh } from 'three';
import type { MaterialFinish } from '@core/scene/materials';
import type { EmphasisGroup, PartContext } from '../context';
import { Widening } from './widening';
import type { WideningOptions } from './widening';

export class GlowSwitch {
  private readonly plain: Widening;
  private readonly glowing: Widening;

  constructor(
    context: PartContext,
    group: EmphasisGroup,
    finishes: { readonly plain: MaterialFinish; readonly glowing: MaterialFinish },
    options: WideningOptions,
  ) {
    this.plain = new Widening(context, group, finishes.plain, options);
    this.glowing = new Widening(context, group, finishes.glowing, options);
  }

  get material() {
    return this.plain.material;
  }

  apply(mesh: Mesh, glowing: boolean): void {
    mesh.material = glowing ? this.glowing.material : this.plain.material;
  }

  widen(cameraDistance: number): void {
    this.plain.update(cameraDistance);
    this.glowing.update(cameraDistance);
  }
}
