import { describe, expect, it } from 'vitest';
import { encodeHalfMesh, type HalfMesh } from '../../../../../../../scripts/swimmer-mesh/encode';
import { decodeSkinMesh, decodeSkinMeshFrom } from './decode';
import {
  BONE_COUNT,
  INFLUENCES,
  MIRRORED_SLOT,
  SLOT_IDS,
  mirrorBone,
  type RestSide,
  type SkinMesh,
  type SlotId,
} from './types';

const MIN_VERTICES = 3000;
const MAX_VERTICES = 4500;
const WEIGHT_TOLERANCE = 1e-5;
const POSITION_TOLERANCE = 0.0003;
const WEIGHT_STEP = 2.01 / 255;

const mesh = decodeSkinMesh();

function vertexAt(index: number, source: SkinMesh = mesh): [number, number, number] {
  return [
    source.positions[index * 3],
    source.positions[index * 3 + 1],
    source.positions[index * 3 + 2],
  ];
}

function trianglesOf(source: SkinMesh, slot: SlotId): number[][] {
  const indices = source.slots[slot];
  return Array.from({ length: indices.length / 3 }, (_, t) =>
    Array.from(indices.subarray(t * 3, t * 3 + 3)),
  );
}

function canonical(triangle: number[]): string {
  const start = triangle.indexOf(Math.min(...triangle));
  return [0, 1, 2].map((k) => triangle[(start + k) % 3]).join(',');
}

function edgeUses(source: SkinMesh): Map<string, number> {
  const uses = new Map<string, number>();
  for (const slot of SLOT_IDS) {
    for (const [a, b, c] of trianglesOf(source, slot)) {
      for (const [from, to] of [
        [a, b],
        [b, c],
        [c, a],
      ]) {
        const key = from < to ? `${from},${to}` : `${to},${from}`;
        uses.set(key, (uses.get(key) ?? 0) + 1);
      }
    }
  }
  return uses;
}

function weightsByBone(source: SkinMesh, vertex: number, mirror: boolean): Map<number, number> {
  const result = new Map<number, number>();
  for (let k = 0; k < INFLUENCES; k++) {
    const raw = source.joints[vertex * INFLUENCES + k];
    const bone = mirror ? mirrorBone(raw) : raw;
    result.set(bone, (result.get(bone) ?? 0) + source.weights[vertex * INFLUENCES + k]);
  }
  return result;
}

function mirrorLookup(): Map<string, number[]> {
  const lookup = new Map<string, number[]>();
  for (let v = 0; v < mesh.vertexCount; v++) {
    const key = vertexAt(v).join(',');
    lookup.set(key, [...(lookup.get(key) ?? []), v]);
  }
  return lookup;
}

function mirroredInfluences(vertex: number, twin: number): boolean {
  const expected = weightsByBone(mesh, vertex, true);
  const actual = weightsByBone(mesh, twin, false);
  return [...new Set([...expected.keys(), ...actual.keys()])].every(
    (bone) => Math.abs((expected.get(bone) ?? 0) - (actual.get(bone) ?? 0)) <= WEIGHT_STEP,
  );
}

describe('decodeSkinMesh', () => {
  it('has a sensible size and consistent array lengths', () => {
    expect(mesh.vertexCount).toBeGreaterThanOrEqual(MIN_VERTICES);
    expect(mesh.vertexCount).toBeLessThanOrEqual(MAX_VERTICES);
    expect(mesh.positions).toHaveLength(mesh.vertexCount * 3);
    expect(mesh.joints).toHaveLength(mesh.vertexCount * INFLUENCES);
    expect(mesh.weights).toHaveLength(mesh.vertexCount * INFLUENCES);
  });

  it('keeps every index in range and every slot non-empty', () => {
    for (const slot of SLOT_IDS) {
      const indices = mesh.slots[slot];
      expect(indices.length, slot).toBeGreaterThan(0);
      expect(indices.length % 3, slot).toBe(0);
      expect(Math.max(...indices), slot).toBeLessThan(mesh.vertexCount);
    }
  });

  it('has weights that sum to one over at most four valid bones', () => {
    for (let v = 0; v < mesh.vertexCount; v++) {
      let sum = 0;
      for (let k = 0; k < INFLUENCES; k++) {
        expect(mesh.joints[v * INFLUENCES + k]).toBeLessThan(BONE_COUNT);
        sum += mesh.weights[v * INFLUENCES + k];
      }
      expect(Math.abs(sum - 1)).toBeLessThan(WEIGHT_TOLERANCE);
    }
  });

  it('is mirror symmetric in positions, bones and weights', () => {
    const lookup = mirrorLookup();
    let midline = 0;
    for (let v = 0; v < mesh.vertexCount; v++) {
      const [x, y, z] = vertexAt(v);
      if (z === 0) midline++;
      const twins = lookup.get([x, y, z === 0 ? 0 : -z].join(','));
      expect(twins, `vertex ${v}`).toBeDefined();
      expect(
        twins!.some((twin) => mirroredInfluences(v, twin)),
        `vertex ${v}`,
      ).toBe(true);
    }
    expect(midline).toBeGreaterThan(0);
  });

  it('is a closed surface without degenerate triangles', () => {
    for (const [edge, uses] of edgeUses(mesh)) expect(uses, edge).toBe(2);
    for (const slot of SLOT_IDS) {
      for (const [a, b, c] of trianglesOf(mesh, slot)) {
        expect(new Set([a, b, c]).size).toBe(3);
      }
    }
  });

  it('keeps the cap stripe on the right side only', () => {
    for (const [a, b, c] of trianglesOf(mesh, 'capStripe')) {
      for (const v of [a, b, c]) expect(vertexAt(v)[2]).toBeGreaterThanOrEqual(0);
      expect(vertexAt(a)[2] + vertexAt(b)[2] + vertexAt(c)[2]).toBeGreaterThan(0);
    }
  });

  it('mirrors the rest sides', () => {
    const { right, left } = mesh.rest;
    for (const key of Object.keys(right) as (keyof RestSide)[]) {
      expect(left[key]).toEqual([right[key][0], right[key][1], -right[key][2]]);
    }
    expect(right.shoulder[2]).toBeGreaterThan(0);
    expect(mesh.rest.strap.length).toBeGreaterThan(8);
  });
});

describe('encoder round trip', () => {
  const half: HalfMesh = {
    positions: new Float32Array([0, 0, 0, 0, 1, 0, 1, 0, 0.5, 1, 1, 0.5, 2, 0.5, 0]),
    joints: new Uint8Array([6, 7, 0, 0, 3, 4, 5, 0, 15, 2, 2, 2, 0, 1, 2, 3, 9, 9, 9, 9]),
    weights: new Float32Array([
      0.5, 0.5, 0, 0, 0.2, 0.3, 0.5, 0, 1, 0, 0, 0, 0.1, 0.2, 0.3, 0.4, 1, 0, 0, 0,
    ]),
    slots: {
      hand: [0, 2, 1, 1, 2, 3],
      forearm: [],
      upperArm: [],
      chest: [],
      abdomen: [],
      jammers: [],
      legSuit: [],
      leg: [2, 4, 3],
      face: [],
      cap: [],
      capStripe: [0, 2, 3],
    },
    rest: mesh.rest,
  };
  const decoded = decodeSkinMeshFrom(encodeHalfMesh(half));

  it('restores positions within the quantisation step', () => {
    expect(decoded.vertexCount).toBe(5 + 2);
    for (let v = 0; v < 5; v++) {
      vertexAt(v, decoded).forEach((value, k) => {
        expect(Math.abs(value - half.positions[v * 3 + k])).toBeLessThan(POSITION_TOLERANCE);
      });
    }
  });

  it('restores bones and weights, mirroring the bones of the copies', () => {
    for (let v = 0; v < 5; v++) {
      for (let k = 0; k < INFLUENCES; k++) {
        expect(decoded.joints[v * INFLUENCES + k]).toBe(half.joints[v * INFLUENCES + k]);
        expect(
          Math.abs(decoded.weights[v * INFLUENCES + k] - half.weights[v * INFLUENCES + k]),
        ).toBeLessThanOrEqual(WEIGHT_STEP);
      }
    }
    expect(decoded.joints[5 * INFLUENCES]).toBe(mirrorBone(half.joints[2 * INFLUENCES]));
  });

  it('restores triangles and mirrors them with reversed winding into the matching slot', () => {
    const tri = (slot: SlotId): string[] => trianglesOf(decoded, slot).map(canonical).sort();
    const twinOf = [0, 1, 5, 6, 4];
    const mirrored = (triangle: number[]): number[] => [
      twinOf[triangle[0]],
      twinOf[triangle[2]],
      twinOf[triangle[1]],
    ];
    const expected = (slot: SlotId): string[] => {
      const own = trianglesOf(decoded, slot).slice(0, (half.slots[slot].length / 3) | 0);
      const fromMirror = SLOT_IDS.filter((s) => (MIRRORED_SLOT[s] ?? s) === slot).flatMap((s) =>
        Array.from({ length: half.slots[s].length / 3 }, (_, t) =>
          mirrored(Array.from(half.slots[s]).slice(t * 3, t * 3 + 3)),
        ),
      );
      return [...own, ...fromMirror].map(canonical).sort();
    };
    for (const slot of SLOT_IDS) expect(tri(slot), slot).toEqual(expected(slot));
    expect(trianglesOf(decoded, 'hand').slice(0, 2).map(canonical)).toEqual(['0,2,1', '1,2,3']);
    expect(trianglesOf(decoded, 'cap')).toHaveLength(1);
    expect(trianglesOf(decoded, 'capStripe')).toHaveLength(1);
  });
});
