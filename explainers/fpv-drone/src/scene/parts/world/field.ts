import { BufferAttribute, BufferGeometry, Color, Group, PlaneGeometry } from 'three';
import type { BufferGeometry as Geometry } from 'three';
import { smoothstep } from '@core/math';
import { STRUCTURE_GROUP, UNDIMMED_GROUP } from '@core/scene/materials';
import { FIELD, ROADS } from '../../constants';
import { PAINT, WORLD_FINISHES, fieldFinish, roadFinish } from '../../finishes';
import { fractalNoise } from '../../geometry/noise';
import { fieldTexture, roadTexture } from '../../geometry/surfaceMaps';
import { mergeParts, partMesh } from '../context';
import type { PartContext } from '../context';

const XYZ = 3;
const RGB = 3;
const UV = 2;
const NOISE_OCTAVES = 4;
const QUARTER_TURN = Math.PI / 2;
const GRASS = new Color(PAINT.grass);
const STRAW = new Color(PAINT.straw);
const EARTH = new Color(PAINT.earth);

interface NoiseLayer {
  scale: number;
  from: number;
  to: number;
  seed: number;
}

function noiseShare(x: number, z: number, layer: NoiseLayer): number {
  const level = fractalNoise(x / layer.scale, z / layer.scale, NOISE_OCTAVES, layer.seed);
  return smoothstep(level, layer.from, layer.to);
}

export function mownBand(z: number): number {
  return Math.sin((Math.PI * z) / FIELD.mown.width);
}

export function fieldColour(x: number, z: number, target: Color): Color {
  const { patches, tufts, tracks, bare, mown } = FIELD;
  target.copy(GRASS).lerp(STRAW, noiseShare(x, z, patches));
  target.lerp(STRAW, noiseShare(x, z, tufts) * tufts.share);
  target.lerp(EARTH, noiseShare(x, z, tracks) * tracks.share);
  target.lerp(EARTH, noiseShare(x, z, bare) * bare.share);
  return target.multiplyScalar(1 + mown.depth * mownBand(z));
}

export function fieldGeometry(): BufferGeometry {
  const { extent, cell, texture } = FIELD;
  const columns = Math.ceil((extent.x[1] - extent.x[0]) / cell) + 1;
  const rows = Math.ceil((extent.z[1] - extent.z[0]) / cell) + 1;
  const count = columns * rows;
  const positions = new Float32Array(count * XYZ);
  const colours = new Float32Array(count * RGB);
  const uvs = new Float32Array(count * UV);
  const colour = new Color();
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const index = row * columns + column;
      const x = Math.min(extent.x[0] + column * cell, extent.x[1]);
      const z = Math.min(extent.z[0] + row * cell, extent.z[1]);
      positions.set([x, 0, z], index * XYZ);
      fieldColour(x, z, colour).toArray(colours, index * RGB);
      uvs.set([x / texture.metres, z / texture.metres], index * UV);
    }
  }
  const indices: number[] = [];
  for (let row = 0; row < rows - 1; row += 1) {
    for (let column = 0; column < columns - 1; column += 1) {
      const a = row * columns + column;
      const b = a + columns;
      indices.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, XYZ));
  geometry.setAttribute('color', new BufferAttribute(colours, RGB));
  geometry.setAttribute('uv', new BufferAttribute(uvs, UV));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function outerGeometry(): Geometry {
  const plane = new PlaneGeometry(FIELD.outer, FIELD.outer);
  plane.rotateX(-QUARTER_TURN);
  plane.translate(0, -FIELD.outerSink, 0);
  return plane;
}

function roadStrip(length: number, alongX: boolean, at: readonly [number, number]): Geometry {
  const width = ROADS.halfWidth * 2;
  const plane = new PlaneGeometry(alongX ? length : width, alongX ? width : length);
  const uv = plane.getAttribute('uv');
  for (let index = 0; index < uv.count; index += 1) {
    const u = uv.getX(index);
    const v = uv.getY(index);
    const alongShare = alongX ? u : v;
    const acrossShare = alongX ? v : u;
    uv.setXY(index, acrossShare, (alongShare * length) / ROADS.texture.metres);
  }
  plane.rotateX(-QUARTER_TURN);
  plane.translate(at[0], ROADS.lift, at[1]);
  return plane;
}

export function roadsGeometry(): Geometry {
  const { along, across } = ROADS;
  const alongLength = along.x[1] - along.x[0];
  const acrossLength = across.z[1] - across.z[0];
  return mergeParts([
    roadStrip(alongLength, true, [(along.x[0] + along.x[1]) / 2, along.z]),
    roadStrip(acrossLength, false, [across.x, (across.z[0] + across.z[1]) / 2]),
  ]);
}

export function createField(context: PartContext): Group {
  const field = new Group();
  const grass = context.tracker.track(fieldTexture(FIELD.texture));
  const dirt = context.tracker.track(roadTexture(ROADS.texture));
  const mown = partMesh(context, fieldGeometry(), UNDIMMED_GROUP, fieldFinish(grass));
  mown.frustumCulled = false;
  const outer = partMesh(context, outerGeometry(), UNDIMMED_GROUP, WORLD_FINISHES.outerField);
  outer.frustumCulled = false;
  field.add(mown, outer, partMesh(context, roadsGeometry(), STRUCTURE_GROUP, roadFinish(dirt)));
  return field;
}
