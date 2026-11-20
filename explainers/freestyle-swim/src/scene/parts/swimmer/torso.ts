import { Mesh } from 'three';
import type { BufferAttribute, Group, Material } from 'three';
import { lerp, smoothstep } from '@core/math';
import { BODY } from '../../rig/constants';
import { ringAt, torsoGrid, torsoPiece } from './geometry';
import type { TorsoGrid } from './geometry';
import { TORSO } from './shapes';

const XYZ = 3;

export interface TorsoMaterials {
  readonly pelvis: Material;
  readonly abdomen: Material;
  readonly chest: Material;
}

export class Torso {
  readonly pelvis: Mesh;
  readonly chest: Mesh;
  private readonly grid: TorsoGrid;
  private readonly pieces: { mesh: Mesh; offset: number }[];

  constructor(
    parent: Group,
    materials: TorsoMaterials,
    track: <T extends { dispose(): void }>(item: T) => T,
  ) {
    this.grid = torsoGrid();
    const rings = this.grid.xs.length / this.grid.ringSize - 1;
    const pelvisEnd = ringAt(this.grid, TORSO.pelvisEnd);
    const chestStart = ringAt(this.grid, TORSO.chestStart);
    const piece = (from: number, to: number, material: Material) => {
      const mesh = new Mesh(track(torsoPiece(this.grid, from, to)), material);
      parent.add(mesh);
      return { mesh, offset: from * this.grid.ringSize };
    };
    this.pieces = [
      piece(0, pelvisEnd, materials.pelvis),
      piece(pelvisEnd, chestStart, materials.abdomen),
      piece(chestStart, rings, materials.chest),
    ];
    this.pelvis = this.pieces[0].mesh;
    this.chest = this.pieces[2].mesh;
  }

  twist(hipRollRad: number, shoulderRollRad: number): void {
    const { positions, normals, xs } = this.grid;
    this.pieces.forEach(({ mesh, offset }) => {
      const position = mesh.geometry.getAttribute('position') as BufferAttribute;
      const normal = mesh.geometry.getAttribute('normal') as BufferAttribute;
      for (let index = 0; index < position.count; index++) {
        const source = (offset + index) * XYZ;
        const x = xs[offset + index];
        const angle = lerp(
          hipRollRad,
          shoulderRollRad,
          smoothstep(x, BODY.hipBlend.from, BODY.hipBlend.to),
        );
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const rotate = (target: BufferAttribute, from: Float32Array) => {
          const y = from[source + 1];
          const z = from[source + 2];
          target.setXYZ(index, from[source], y * cos - z * sin, y * sin + z * cos);
        };
        rotate(position, positions);
        rotate(normal, normals);
      }
      position.needsUpdate = true;
      normal.needsUpdate = true;
    });
  }
}
