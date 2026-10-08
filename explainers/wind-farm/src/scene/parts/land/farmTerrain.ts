import { BufferAttribute, BufferGeometry, Color } from 'three';
import { smoothstep } from '@core/math';
import { FARM_TERRAIN, terrainHeight } from '../../../model/layout';
import { FARM_GROUND, FARM_PATCHWORK } from './constants';
import { RGBA, fadeToHaze, patchColour, weather, writeColour } from './groundColour';
import type { GroundRules } from './groundColour';
import { isClear } from './keepOut';
import type { KeepOut } from './keepOut';

const XYZ = 3;

export function farmEdgeDistance(x: number, z: number): number {
  const { minX, maxX, minZ, maxZ } = FARM_TERRAIN;
  return Math.min(x - minX, maxX - x, z - minZ, maxZ - z);
}

function gridIndices(segments: number): number[] {
  const indices: number[] = [];
  const row = segments + 1;
  for (let j = 0; j < segments; j += 1) {
    for (let i = 0; i < segments; i += 1) {
      const a = j * row + i;
      indices.push(a, a + row, a + 1, a + 1, a + row, a + row + 1);
    }
  }
  return indices;
}

export function farmRules(keepOut: KeepOut): GroundRules {
  return { wooded: (x, z) => isClear(keepOut, x, z), hedged: () => true };
}

export function farmTerrainGeometry(keepOut: KeepOut): BufferGeometry {
  const { segments, hazeFade, alphaFade } = FARM_GROUND;
  const { minX, maxX, minZ, maxZ } = FARM_TERRAIN;
  const stepX = (maxX - minX) / segments;
  const stepZ = (maxZ - minZ) / segments;
  const spacing = Math.max(stepX, stepZ);
  const rules = farmRules(keepOut);
  const count = (segments + 1) ** 2;
  const positions = new Float32Array(count * XYZ);
  const colours = new Float32Array(count * RGBA);
  const colour = new Color();
  for (let index = 0; index < count; index += 1) {
    const x = minX + (index % (segments + 1)) * stepX;
    const z = minZ + Math.floor(index / (segments + 1)) * stepZ;
    const edge = farmEdgeDistance(x, z);
    positions.set([x, terrainHeight(x, z), z], index * XYZ);
    weather(x, z, patchColour(FARM_PATCHWORK, rules, x, z, spacing, colour));
    fadeToHaze(colour, 1 - smoothstep(edge, 0, hazeFade));
    writeColour(colours, index, colour, smoothstep(edge, 0, alphaFade));
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, XYZ));
  geometry.setAttribute('color', new BufferAttribute(colours, RGBA));
  geometry.setIndex(gridIndices(segments));
  geometry.computeVertexNormals();
  return geometry;
}
