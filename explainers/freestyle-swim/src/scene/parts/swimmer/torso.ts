import { Mesh } from 'three';
import type { BufferAttribute, Group, Material } from 'three';
import { lerp, smoothstep } from '@core/math';
import { BODY } from '../../rig/constants';
import { ringAt, torsoGrid, torsoPiece } from './torsoGrid';
import type { TorsoGrid } from './torsoGrid';
import { TORSO } from './shapes';

const XYZ = 3;

export interface TorsoMaterials {
  readonly pelvis: Material;
  readonly abdomen: Material;
  readonly chest: Material;
}

interface Piece {
  readonly mesh: Mesh;
  readonly firstRing: number;
}

export class Torso {
  readonly pelvis: Mesh;
  readonly chest: Mesh;
  private readonly grid: TorsoGrid;
  private readonly pieces: Piece[];

  constructor(
    parent: Group,
    materials: TorsoMaterials,
    track: <T extends { dispose(): void }>(item: T) => T,
  ) {
    this.grid = torsoGrid();
    const rings = this.grid.xs.length / this.grid.ringSize - 1;
    const pelvisEnd = ringAt(this.grid, TORSO.pelvisEnd);
    const chestStart = ringAt(this.grid, TORSO.chestStart);
    const piece = (from: number, to: number, material: Material): Piece => {
      const mesh = new Mesh(track(torsoPiece(this.grid, from, to)), material);
      parent.add(mesh);
      return { mesh, firstRing: from };
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
    const { positions, normals, xs, ringSize } = this.grid;
    this.pieces.forEach(({ mesh, firstRing }) => {
      const position = mesh.geometry.getAttribute('position') as BufferAttribute;
      const normal = mesh.geometry.getAttribute('normal') as BufferAttribute;
      const rings = position.count / ringSize;
      for (let local = 0; local < rings; local++) {
        const first = (firstRing + local) * ringSize;
        const blend = smoothstep(xs[first], BODY.hipBlend.from, BODY.hipBlend.to);
        const angle = lerp(hipRollRad, shoulderRollRad, blend);
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        for (let step = 0; step < ringSize; step++) {
          const source = (first + step) * XYZ;
          const index = local * ringSize + step;
          position.setXYZ(
            index,
            positions[source],
            positions[source + 1] * cos - positions[source + 2] * sin,
            positions[source + 1] * sin + positions[source + 2] * cos,
          );
          normal.setXYZ(
            index,
            normals[source],
            normals[source + 1] * cos - normals[source + 2] * sin,
            normals[source + 1] * sin + normals[source + 2] * cos,
          );
        }
      }
      position.needsUpdate = true;
      normal.needsUpdate = true;
    });
  }
}
