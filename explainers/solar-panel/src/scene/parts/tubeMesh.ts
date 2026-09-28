import { TubeGeometry } from 'three';
import type { Curve, Mesh, Vector3 } from 'three';
import { CABLE } from '../constants';
import type { Finish } from '../finishes';
import { FINISHES } from '../finishes';
import type { EmphasisGroup, PartContext } from './context';
import { SwapMesh } from './swapMesh';

const MIN_SEGMENTS = 8;

export class TubeMesh {
  private readonly slot: SwapMesh;
  private readonly radius: number;

  constructor(context: PartContext, group: EmphasisGroup, finish: Finish, radius: number) {
    this.radius = radius;
    this.slot = new SwapMesh(context, context.materials.get(group, FINISHES[finish]));
  }

  get mesh(): Mesh {
    return this.slot.mesh;
  }

  setPath(path: Curve<Vector3>): void {
    const segments = Math.max(MIN_SEGMENTS, Math.ceil(path.getLength() * CABLE.segmentsPerCm));
    this.slot.swap(new TubeGeometry(path, segments, this.radius, CABLE.radialSegments));
  }
}
