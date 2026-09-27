import { BufferAttribute, Color, Group, Mesh, MeshStandardMaterial, PlaneGeometry } from 'three';
import type { BufferGeometry, Object3D } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { FIELD } from '../../model';
import { FIELDS, TERRAIN, TERRAIN_COLORS } from '../constants';
import { CREST_HEIGHT, ridgeShare, terrainHeight } from '../terrain';
import { anchorAt } from './context';
import type { PartContext } from './context';

export interface TerrainPart {
  object: Group;
  fieldAnchor: Object3D;
  ridgeAnchor: Object3D;
}

const RGB = 3;
const ROCK_FROM = 0.72;
const FOREST_FROM = 0.04;
const HASH_SEEDS = { x: 12.9898, z: 78.233, scale: 43758.5453 } as const;
const RIDGE_LABEL = { x: -34, z: 34, lift: 1.5 } as const;
const FIELD_LABEL_LIFT = 0.5;

const COLORS = {
  grass: new Color(TERRAIN_COLORS.grass),
  forest: new Color(TERRAIN_COLORS.forest),
  rock: new Color(TERRAIN_COLORS.rock),
  hill: new Color(TERRAIN_COLORS.hill),
} as const;

function hash(i: number, j: number): number {
  const value = Math.sin(i * HASH_SEEDS.x + j * HASH_SEEDS.z) * HASH_SEEDS.scale;
  return value - Math.floor(value);
}

function flatPlane(
  width: number,
  depth: number,
  widthSegments = 1,
  depthSegments = 1,
): PlaneGeometry {
  const geometry = new PlaneGeometry(width, depth, widthSegments, depthSegments);
  geometry.rotateX(-Math.PI / 2);
  return geometry;
}

function groundColor(x: number, height: number, target: Color): Color {
  if (height <= 0) return target.copy(COLORS.grass);
  const share = height / CREST_HEIGHT;
  if (ridgeShare(x) <= 0) return target.copy(COLORS.hill);
  if (share > ROCK_FROM) {
    return target.copy(COLORS.forest).lerp(COLORS.rock, (share - ROCK_FROM) / (1 - ROCK_FROM));
  }
  return target.copy(share > FOREST_FROM ? COLORS.forest : COLORS.grass);
}

function landGeometry(): BufferGeometry {
  const columns = Math.round((TERRAIN.halfWidth * 2) / TERRAIN.cell);
  const rows = Math.round((TERRAIN.halfDepth * 2) / TERRAIN.cell);
  const geometry = flatPlane(TERRAIN.halfWidth * 2, TERRAIN.halfDepth * 2, columns, rows);
  const position = geometry.getAttribute('position');
  const colors = new Float32Array(position.count * RGB);
  const color = new Color();
  for (let index = 0; index < position.count; index++) {
    const x = position.getX(index);
    const height = terrainHeight(x, position.getZ(index));
    position.setY(index, height);
    groundColor(x, height, color).toArray(colors, index * RGB);
  }
  geometry.setAttribute('color', new BufferAttribute(colors, RGB));
  geometry.computeVertexNormals();
  return geometry;
}

interface Cell {
  x: readonly [number, number];
  z: readonly [number, number];
}

function cuts(from: number, to: number, seed: number): number[] {
  const edges = [from];
  for (let index = 0; edges[edges.length - 1] < to; index++) {
    const size = FIELDS.minSize + (FIELDS.maxSize - FIELDS.minSize) * hash(index, seed);
    edges.push(Math.min(to, edges[edges.length - 1] + size));
  }
  return edges;
}

function nearDarkField(cell: Cell): boolean {
  const halfWidth = FIELDS.darkFieldWidth / 2 + FIELDS.darkFieldMargin;
  const halfDepth = FIELDS.darkFieldDepth / 2 + FIELDS.darkFieldMargin;
  return (
    cell.x[1] > FIELD.x - halfWidth &&
    cell.x[0] < FIELD.x + halfWidth &&
    cell.z[1] > FIELD.z - halfDepth &&
    cell.z[0] < FIELD.z + halfDepth
  );
}

function paintedPatch(cell: Cell, color: Color): BufferGeometry {
  const width = cell.x[1] - cell.x[0] - FIELDS.hedge * 2;
  const depth = cell.z[1] - cell.z[0] - FIELDS.hedge * 2;
  const patch = flatPlane(width, depth).toNonIndexed();
  patch.translate((cell.x[0] + cell.x[1]) / 2, FIELDS.lift, (cell.z[0] + cell.z[1]) / 2);
  const count = patch.getAttribute('position').count;
  const colors = new Float32Array(count * RGB);
  for (let index = 0; index < count; index++) color.toArray(colors, index * RGB);
  patch.setAttribute('color', new BufferAttribute(colors, RGB));
  patch.deleteAttribute('uv');
  return patch;
}

function fieldCells(): Cell[] {
  return FIELDS.regions.flatMap((region, regionIndex) => {
    const columns = cuts(region.from, region.to, regionIndex);
    const rows = cuts(-FIELDS.halfDepth, FIELDS.halfDepth, regionIndex + FIELDS.regions.length);
    return columns.slice(1).flatMap((right, column) =>
      rows.slice(1).map((far, row): Cell => ({
        x: [columns[column], right],
        z: [rows[row], far],
      })),
    );
  });
}

function fieldsGeometry(): BufferGeometry {
  const palette = TERRAIN_COLORS.fields.map((color) => new Color(color));
  const patches = fieldCells()
    .filter((cell) => !nearDarkField(cell))
    .map((cell, index) =>
      paintedPatch(cell, palette[Math.floor(hash(index, cell.x[0]) * palette.length)]),
    );
  const merged = mergeGeometries(patches);
  patches.forEach((patch) => patch.dispose());
  return merged;
}

function landMaterial(context: PartContext, color?: string): MeshStandardMaterial {
  return context.tracker.track(
    new MeshStandardMaterial({
      color: color ?? '#ffffff',
      vertexColors: color === undefined,
      flatShading: true,
      metalness: 0,
      roughness: 1,
    }),
  );
}

export function createTerrain(context: PartContext): TerrainPart {
  const object = new Group();
  const painted = landMaterial(context);
  const farGround = context.tracker.track(flatPlane(TERRAIN.farGround, TERRAIN.farGround));
  farGround.translate(0, TERRAIN.sink, 0);
  const darkField = context.tracker.track(flatPlane(FIELDS.darkFieldWidth, FIELDS.darkFieldDepth));
  darkField.translate(FIELD.x, FIELDS.darkFieldLift, FIELD.z);
  object.add(
    new Mesh(context.tracker.track(landGeometry()), painted),
    new Mesh(context.tracker.track(fieldsGeometry()), painted),
    new Mesh(farGround, landMaterial(context, TERRAIN_COLORS.farGround)),
    new Mesh(darkField, landMaterial(context, TERRAIN_COLORS.darkField)),
  );
  const ridgeY = terrainHeight(RIDGE_LABEL.x, RIDGE_LABEL.z) + RIDGE_LABEL.lift;
  return {
    object,
    fieldAnchor: anchorAt(object, FIELD.x, FIELD_LABEL_LIFT, FIELD.z),
    ridgeAnchor: anchorAt(object, RIDGE_LABEL.x, ridgeY, RIDGE_LABEL.z),
  };
}
