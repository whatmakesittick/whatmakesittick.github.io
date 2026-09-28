import { BufferGeometry, Mesh, TubeGeometry } from 'three';
import type { Curve, Vector3 } from 'three';
import { CABLE } from '../constants';
import type { Finish } from '../finishes';
import { FINISHES } from '../finishes';
import type { EmphasisGroup, PartContext } from './context';

const MIN_SEGMENTS = 8;

export class TubeMesh {
  readonly mesh: Mesh;
  private readonly radius: number;

  constructor(context: PartContext, group: EmphasisGroup, finish: Finish, radius: number) {
    this.radius = radius;
    this.mesh = new Mesh(new BufferGeometry(), context.materials.get(group, FINISHES[finish]));
    context.tracker.track(this);
  }

  setPath(path: Curve<Vector3>): void {
    const segments = Math.max(MIN_SEGMENTS, Math.ceil(path.getLength() * CABLE.segmentsPerCm));
    const previous = this.mesh.geometry;
    this.mesh.geometry = new TubeGeometry(path, segments, this.radius, CABLE.radialSegments);
    previous.dispose();
  }

  dispose(): void {
    this.mesh.geometry.dispose();
  }
}
