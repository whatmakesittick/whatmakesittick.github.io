import { BufferAttribute, BufferGeometry, Mesh, MeshBasicMaterial, Vector2 } from 'three';
import { UNDIMMED_GROUP } from '@core/scene/materials';
import type { FarmSite } from '../../../ids';
import { terrainHeight } from '../../../model';
import { SUN_DIRECTION } from '../../constants';
import { FINISHES } from '../../finishes';
import { registeredMaterial } from '../context';
import type { PartContext } from '../context';
import { CONTACT_SHADOW } from './turbineConstants';

const NAME = 'turbineShadows';
const XYZ = 3;
const UV = 2;
const SHADOW_OFFSET = { polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -4 };

export const SHADOW_HEADING = new Vector2(-SUN_DIRECTION[0], -SUN_DIRECTION[2]).normalize();

interface GridSize {
  readonly along: number;
  readonly across: number;
}

const GRID: GridSize = {
  along: CONTACT_SHADOW.alongSteps + 1,
  across: CONTACT_SHADOW.acrossSteps + 1,
};

function blobPoints(site: FarmSite): { positions: number[]; uvs: number[] } {
  const { length, width, overlap, lift } = CONTACT_SHADOW;
  const reach = length / 2 - overlap;
  const centreX = site.x + SHADOW_HEADING.x * reach;
  const centreZ = site.z + SHADOW_HEADING.y * reach;
  const positions: number[] = [];
  const uvs: number[] = [];
  for (let row = 0; row < GRID.across; row += 1) {
    const v = row / (GRID.across - 1);
    for (let column = 0; column < GRID.along; column += 1) {
      const u = column / (GRID.along - 1);
      const along = (u - 0.5) * length;
      const across = (v - 0.5) * width;
      const x = centreX + SHADOW_HEADING.x * along - SHADOW_HEADING.y * across;
      const z = centreZ + SHADOW_HEADING.y * along + SHADOW_HEADING.x * across;
      positions.push(x, terrainHeight(x, z) + lift, z);
      uvs.push(u, v);
    }
  }
  return { positions, uvs };
}

function blobIndices(first: number): number[] {
  return Array.from({ length: GRID.across - 1 }, (_, row) =>
    Array.from({ length: GRID.along - 1 }, (__, column) => {
      const a = first + row * GRID.along + column;
      const b = a + GRID.along;
      return [a, b, a + 1, a + 1, b, b + 1];
    }).flat(),
  ).flat();
}

export function shadowGeometry(sites: readonly FarmSite[]): BufferGeometry {
  const blobs = sites.map(blobPoints);
  const geometry = new BufferGeometry();
  geometry.setAttribute(
    'position',
    new BufferAttribute(new Float32Array(blobs.flatMap((blob) => blob.positions)), XYZ),
  );
  geometry.setAttribute(
    'uv',
    new BufferAttribute(new Float32Array(blobs.flatMap((blob) => blob.uvs)), UV),
  );
  geometry.setIndex(sites.flatMap((_, index) => blobIndices(index * GRID.along * GRID.across)));
  geometry.computeBoundingSphere();
  return geometry;
}

export class TurbineShadows {
  readonly mesh: Mesh;

  constructor(context: PartContext) {
    const material = registeredMaterial(
      context,
      UNDIMMED_GROUP,
      new MeshBasicMaterial({
        color: FINISHES.shadow.color,
        map: context.textures.shadow,
        transparent: true,
        opacity: CONTACT_SHADOW.opacity,
        depthWrite: false,
        ...SHADOW_OFFSET,
      }),
    );
    this.mesh = new Mesh(new BufferGeometry(), material);
    this.mesh.name = NAME;
    context.tracker.track({ dispose: () => this.mesh.geometry.dispose() });
  }

  place(sites: readonly FarmSite[]): void {
    const previous = this.mesh.geometry;
    this.mesh.geometry = shadowGeometry(sites);
    previous.dispose();
  }
}
