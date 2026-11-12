import { Color, InstancedMesh, Matrix4, Quaternion, Vector3 } from 'three';
import { STRUCTURE_GROUP } from '@core/scene/materials';
import { BAY_TONES } from '../../../theme';
import { registeredMaterial } from '../context';
import type { PartContext } from '../context';
import { TOOL, TOOL_HEIGHTS, TOOL_LENGTHS, TOOL_ROWS, TOOL_TINTS } from './dims';
import type { Footprint, ToolRowSpec } from './dims';
import { bakedMaterial } from './finishes';
import type { RowSwitch } from './rows';
import { bakedBoxes } from './surfaces';
import type { BakedBox } from './surfaces';

export const NOMINAL = { length: 5.6, height: 2.9, bodyRight: 0.9, bodyTop: 2.55 } as const;

const SHADE = { body: 1, top: 1.12, module: 0.9, trim: 0.45, pod: 1 } as const;
const HALF_DEPTH = TOOL.depth / 2;

const BODY = BAY_TONES.tool;
const PARTS: readonly BakedBox[] = [
  [[-2.7, 0, -1.3], [2.7, 0.1, 1.3], BODY, SHADE.trim],
  [[-2.8, 0.1, -HALF_DEPTH], [NOMINAL.bodyRight, NOMINAL.bodyTop, HALF_DEPTH], BODY, SHADE.body],
  [[-2.5, NOMINAL.bodyTop, -1.1], [0.5, NOMINAL.height, 1.1], BODY, SHADE.top],
  [[1, 0.1, -1.3], [2.8, 2, 1.3], BODY, SHADE.module],
  [[-2.55, 1.35, HALF_DEPTH], [0.65, 1.95, HALF_DEPTH + 0.03], BAY_TONES.window, 1],
  [[-2.8, 0.1, HALF_DEPTH - 0.02], [NOMINAL.bodyRight, 0.3, HALF_DEPTH + 0.01], BODY, SHADE.trim],
  [[-0.95, 0.35, HALF_DEPTH], [-0.92, 1.25, HALF_DEPTH + 0.02], BODY, SHADE.trim],
  [[1.15, 0.85, 1.3], [1.9, 0.95, 1.6], BODY, SHADE.trim],
  [[1.95, 0.85, 1.3], [2.7, 0.95, 1.6], BODY, SHADE.trim],
  [[1.3, 0.95, 1.33], [1.75, 1.3, 1.55], BAY_TONES.pod, SHADE.pod],
  [[2.1, 0.95, 1.33], [2.55, 1.3, 1.55], BAY_TONES.pod, SHADE.pod],
];

export interface ToolSpot {
  readonly row: number;
  readonly x: number;
  readonly frontZ: number;
  readonly length: number;
  readonly height: number;
  readonly tint: number;
}

function rowSpots(spec: ToolRowSpec, row: number): ToolSpot[] {
  const spots: ToolSpot[] = [];
  let cursor = spec.start;
  for (let index = 0; spec.direction * cursor < TOOL.reach; index += 1) {
    const pick = (index + spec.phase) % TOOL_LENGTHS.length;
    const length = TOOL_LENGTHS[pick];
    const height = TOOL_HEIGHTS[(index * 3 + spec.phase) % TOOL_HEIGHTS.length];
    const tint = TOOL_TINTS[(index + spec.phase * 2) % TOOL_TINTS.length];
    spots.push({
      row,
      x: cursor + (spec.direction * length) / 2,
      frontZ: spec.frontZ,
      length,
      height,
      tint,
    });
    cursor += spec.direction * (length + TOOL.gap);
  }
  return spots;
}

export function toolSpots(): ToolSpot[] {
  return TOOL_ROWS.flatMap(rowSpots);
}

export function rowFootprints(spots: readonly ToolSpot[]): Footprint[] {
  return TOOL_ROWS.map((spec, row) => {
    const members = spots.filter((spot) => spot.row === row);
    return {
      minX: Math.min(...members.map((spot) => spot.x - spot.length / 2)),
      maxX: Math.max(...members.map((spot) => spot.x + spot.length / 2)),
      minZ: spec.frontZ - TOOL.depth,
      maxZ: spec.frontZ,
    };
  });
}

export function toolScale(spot: ToolSpot): Vector3 {
  return new Vector3(spot.length / NOMINAL.length, spot.height / NOMINAL.height, 1);
}

export function buildTools(
  context: PartContext,
  spots: readonly ToolSpot[],
  rows: RowSwitch,
): InstancedMesh {
  const material = registeredMaterial(context, STRUCTURE_GROUP, bakedMaterial());
  const mesh = context.tracker.track(
    new InstancedMesh(
      context.tracker.track(bakedBoxes(PARTS, 'Tool parts')),
      material,
      spots.length,
    ),
  );
  const tint = new Color();
  const turn = new Quaternion();
  spots.forEach((spot, index) => {
    const matrix = new Matrix4().compose(
      new Vector3(spot.x, 0, spot.frontZ - HALF_DEPTH),
      turn,
      toolScale(spot),
    );
    mesh.setMatrixAt(index, matrix);
    mesh.setColorAt(index, tint.setScalar(spot.tint));
    rows.add(mesh, spot.row, index, matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.computeBoundingSphere();
  mesh.name = 'tools';
  return mesh;
}
