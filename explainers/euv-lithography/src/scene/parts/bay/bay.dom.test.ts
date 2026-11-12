import { describe, expect, it } from 'vitest';
import { AdditiveBlending, FrontSide, Matrix4, Mesh, Vector3 } from 'three';
import type { InstancedMesh, Material, Object3D } from 'three';
import { STRUCTURE_GROUP, UNDIMMED_GROUP } from '@core/scene/materials';
import { blocksLabels } from '../../sceneOptions';
import { buildBay } from '../bay';
import { FRAME, buildSection, drawCalls, stateAt, triangles } from '../light/fixtures';
import { CEILING_Y, HALL, RAIL } from './dims';
import { carrierX } from './transport';

const DRAW_BUDGET = 12;
const TRIANGLE_BUDGET = 20_000;
const OVERVIEW_CAMERA = new Vector3(-11.8, 13, 31);
const BEHIND_CAMERA = new Vector3(0, 6, -40);
const SIDE_CAMERA = new Vector3(40, 4, -2);

function named(root: Object3D, name: string): Mesh {
  const found = root.getObjectByName(name);
  if (!(found instanceof Mesh)) throw new Error(`No mesh ${name}`);
  return found;
}

function shownInstances(mesh: InstancedMesh): number {
  const matrix = new Matrix4();
  let shown = 0;
  for (let index = 0; index < mesh.count; index += 1) {
    mesh.getMatrixAt(index, matrix);
    if (matrix.determinant() !== 0) shown += 1;
  }
  return shown;
}

function carrierPositions(mesh: InstancedMesh): number[] {
  const matrix = new Matrix4();
  return Array.from({ length: mesh.count }, (_, index) => {
    mesh.getMatrixAt(index, matrix);
    return new Vector3().setFromMatrixPosition(matrix).x;
  });
}

describe('cleanroom bay', () => {
  const { section, context } = buildSection(buildBay, stateAt(900));
  const { root } = section;

  it('stays inside the draw call and triangle budgets', () => {
    expect(drawCalls(root)).toBeLessThanOrEqual(DRAW_BUDGET);
    expect(triangles(root)).toBeLessThan(TRIANGLE_BUDGET);
    console.info(`bay: ${triangles(root)} triangles, ${drawCalls(root)} draws`);
  });

  it('never registers a backdrop piece as a machine part', () => {
    const groups = new Set<string | undefined>();
    root.traverse((object) => {
      if (object instanceof Mesh)
        groups.add(context.materials.groupOf(object.material as Material));
    });
    expect([...groups].sort()).toEqual([STRUCTURE_GROUP, UNDIMMED_GROUP].sort());
  });

  it('shows the ceiling and the back wall only from inside the hall', () => {
    const ceiling = named(root, 'ceiling');
    const wall = named(root, 'wall');
    const windows = named(root, 'windows');
    [ceiling, wall, windows].forEach((mesh) =>
      expect((mesh.material as Material).side).toBe(FrontSide),
    );
    expect(windows.geometry.getAttribute('normal').getZ(0)).toBe(1);
    expect(ceiling.geometry.getAttribute('normal').getY(0)).toBe(-1);
    expect(ceiling.geometry.getAttribute('position').getY(0)).toBeCloseTo(CEILING_Y);
    expect(wall.geometry.getAttribute('normal').getZ(0)).toBe(1);
    expect(wall.geometry.getAttribute('position').getZ(0)).toBeCloseTo(HALL.minZ);
  });

  it('lets labels show through the light pools', () => {
    const glows = named(root, 'glows');
    expect((glows.material as Material).blending).toBe(AdditiveBlending);
    expect(blocksLabels({ object: glows, distance: 1, point: new Vector3() })).toBe(false);
  });

  it('hides a row of tools that would stand between the camera and the machine', () => {
    const tools = named(root, 'tools') as InstancedMesh;
    const lamps = named(root, 'lamps') as InstancedMesh;
    section.animate?.({ ...FRAME, cameraPosition: OVERVIEW_CAMERA }, stateAt(900));
    const all = shownInstances(tools);
    const allLamps = shownInstances(lamps);
    expect(all).toBe(tools.count);
    expect(section.animate?.({ ...FRAME, cameraPosition: BEHIND_CAMERA }, stateAt(900))).toBe(true);
    expect(shownInstances(tools)).toBeLessThan(all);
    expect(shownInstances(lamps)).toBeLessThan(allLamps);
    section.animate?.({ ...FRAME, cameraPosition: SIDE_CAMERA }, stateAt(900));
    expect(shownInstances(tools)).toBeLessThan(all);
    section.animate?.({ ...FRAME, cameraPosition: OVERVIEW_CAMERA }, stateAt(900));
    expect(shownInstances(tools)).toBe(all);
  });

  it('glides the wafer carriers along the rail only while playing', () => {
    const carriers = named(root, 'carriers') as InstancedMesh;
    const still = { ...FRAME, cameraPosition: OVERVIEW_CAMERA };
    const before = carrierPositions(carriers);
    expect(section.animate?.(still, stateAt(900))).toBe(false);
    expect(carrierPositions(carriers)).toEqual(before);
    expect(section.animate?.(still, stateAt(900, { playing: true }))).toBe(true);
    const after = carrierPositions(carriers);
    after.forEach((x, index) => expect(x).toBeGreaterThan(before[index]));
  });

  it('wraps the carriers around both ends of the rail', () => {
    const length = RAIL.reach * 2;
    [0, 1, 2, 3].forEach((index) => {
      [0, length / 3, length * 5].forEach((travel) => {
        const x = carrierX(index, travel);
        expect(Math.abs(x)).toBeLessThanOrEqual(RAIL.reach);
      });
    });
  });
});
