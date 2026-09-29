import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import {
  closedEdge,
  flapColumns,
  flapIndex,
  flapPoint,
  flapVertexCount,
  hingeAngle,
  openDepth,
  seams,
  writeFlap,
} from './leaflet';
import type { FlapShape, FlapValve } from './leaflet';
import { FLAT, ringFrame } from './valveFrame';

const THIRD = (Math.PI * 2) / 3;
const SHAPE: FlapShape = {
  columnsPerTurn: 48,
  minColumns: 8,
  rows: 10,
  lipRows: 2,
  commissureDepthMm: 4,
  commissureGap: 0.05,
  junction: [0.35, 0],
  smile: 0.25,
  seamBend: 0,
  closedDropMm: 3,
  domeMm: 2,
  lipMm: 3,
  appositionMm: 0.35,
  openTilt: 0.18,
  openBellyMm: 1.5,
  tongue: 0.7,
  cleftDepth: 0.5,
  cleftWidth: 0.05,
};
const FRAME = ringFrame([0, 0, 0], [0, -1, 0], 14);
const MITRAL: FlapValve = {
  frame: FRAME,
  lift: FLAT,
  shape: SHAPE,
  leaflets: [
    { from: Math.PI - THIRD / 2, to: Math.PI + THIRD / 2, depthMm: 24, clefts: [] },
    {
      from: Math.PI + THIRD / 2,
      to: Math.PI + THIRD / 2 + 2 * THIRD,
      depthMm: 13,
      clefts: [0.3, 0.7],
    },
  ],
};
const ANTERIOR = 0;
const POSTERIOR = 1;

function plan(point: Vector3): Vector3 {
  return new Vector3(point.x, 0, point.z);
}

describe('atrioventricular leaflets', () => {
  it('hinges every column on the annulus at every opening', () => {
    for (const opening of [0, 0.4, 1]) {
      const hinge = flapPoint(MITRAL, ANTERIOR, 0.5, 0, opening);
      expect(plan(hinge).length()).toBeCloseTo(14, 5);
    }
    expect(hingeAngle(MITRAL, ANTERIOR, 0)).toBeGreaterThan(MITRAL.leaflets[0].from);
  });

  it('shuts along one curved seam shared by both leaflets and bowed toward the posterior wall', () => {
    const all = seams(MITRAL);
    const anteriorEdge = closedEdge(MITRAL, all, ANTERIOR, 0.5);
    const posteriorEdge = closedEdge(MITRAL, all, POSTERIOR, 0.5);
    expect(anteriorEdge.distanceTo(posteriorEdge)).toBeLessThan(1e-6);
    expect(anteriorEdge.x).toBeCloseTo(14 * 0.35, 5);
    const quarter = closedEdge(MITRAL, all, ANTERIOR, 0.25);
    const chordX = new Vector3(Math.cos(MITRAL.leaflets[0].from), 0, 0).x * 14;
    expect(quarter.x).toBeGreaterThan(chordX);
    expect(
      closedEdge(MITRAL, all, POSTERIOR, 0.25).distanceTo(closedEdge(MITRAL, all, ANTERIOR, 0.75)),
    ).toBeLessThan(1e-6);
  });

  it('closes three leaflets along curved seams that meet off centre', () => {
    const third = (Math.PI * 2) / 3;
    const tricuspid: FlapValve = {
      ...MITRAL,
      shape: { ...SHAPE, junction: [0.15, -0.1], seamBend: 0.1 },
      leaflets: [0, 1, 2].map((index) => ({
        from: index * third,
        to: (index + 1) * third,
        depthMm: 16,
        clefts: [],
      })),
    };
    const all = seams(tricuspid);
    const junction = closedEdge(tricuspid, all, 0, 0.5);
    for (let leaflet = 1; leaflet < 3; leaflet += 1) {
      expect(closedEdge(tricuspid, all, leaflet, 0.5).distanceTo(junction)).toBeLessThan(1e-6);
    }
    expect(plan(junction).length()).toBeGreaterThan(2);
    const middle = closedEdge(tricuspid, all, 0, 0.25);
    const straight = all[0].start.clone().lerp(junction, 0.5);
    expect(plan(middle).distanceTo(plan(straight))).toBeGreaterThan(0.3);
  });

  it('domes the shut leaflets up toward the atrium and drops the seam below the ring', () => {
    const belly = flapPoint(MITRAL, ANTERIOR, 0.5, 4, 0);
    const seam = flapPoint(MITRAL, ANTERIOR, 0.5, SHAPE.rows - SHAPE.lipRows, 0);
    expect(seam.y).toBeLessThan(-2.9);
    expect(belly.y).toBeGreaterThan(seam.y + 1.5);
  });

  it('keeps the apposed lips apart by the tissue thickness', () => {
    const anteriorLip = flapPoint(MITRAL, ANTERIOR, 0.5, SHAPE.rows, 0);
    const posteriorLip = flapPoint(MITRAL, POSTERIOR, 0.5, SHAPE.rows, 0);
    expect(anteriorLip.distanceTo(posteriorLip)).toBeCloseTo(0.7, 2);
  });

  it('opens into a wide oval with the free edges far apart', () => {
    const anterior = flapPoint(MITRAL, ANTERIOR, 0.5, SHAPE.rows, 1);
    const posterior = flapPoint(MITRAL, POSTERIOR, 0.5, SHAPE.rows, 1);
    expect(anterior.distanceTo(posterior)).toBeGreaterThan(20);
    expect(anterior.y).toBeLessThan(-22);
    expect(posterior.y).toBeLessThan(-11);
    expect(posterior.y).toBeGreaterThan(-14);
  });

  it('shapes a tall anterior tongue and a shallow scalloped posterior crescent', () => {
    const [anterior, posterior] = MITRAL.leaflets;
    expect(openDepth(anterior, SHAPE, 0.5)).toBeCloseTo(24, 5);
    expect(openDepth(anterior, SHAPE, 0)).toBeCloseTo(4, 5);
    expect(openDepth(posterior, SHAPE, 0.3)).toBeLessThan(openDepth(posterior, SHAPE, 0.5) * 0.7);
  });

  it('leaves a notch at each commissure', () => {
    const anteriorEnd = flapPoint(MITRAL, ANTERIOR, 1, SHAPE.rows, 1);
    const posteriorStart = flapPoint(MITRAL, POSTERIOR, 0, SHAPE.rows, 1);
    expect(anteriorEnd.y).toBeGreaterThan(-5);
    expect(posteriorStart.y).toBeGreaterThan(-5);
    expect(anteriorEnd.distanceTo(posteriorStart)).toBeGreaterThan(0.3);
  });

  it('writes a sheet of vertices sized to each leaflet', () => {
    expect(flapColumns(MITRAL, POSTERIOR)).toBe(2 * flapColumns(MITRAL, ANTERIOR));
    const target = new Float32Array(flapVertexCount(MITRAL, POSTERIOR) * 3);
    writeFlap(MITRAL, POSTERIOR, 0.5, target);
    expect(target.some((value) => value !== 0)).toBe(true);
    expect(flapIndex(MITRAL, POSTERIOR)).toHaveLength(
      flapColumns(MITRAL, POSTERIOR) * SHAPE.rows * 6,
    );
  });
});
