import { describe, expect, it } from 'vitest';
import { VALVES } from '../model';
import { VALVE_DESIGN } from './constants';
import type { FlapValveDesign } from './constants';
import { planAngle, ringFrame } from './geometry/valveFrame';

const FULL_TURN = Math.PI * 2;
const MITRAL = VALVE_DESIGN.mitral as FlapValveDesign;
const TRICUSPID = VALVE_DESIGN.tricuspid as FlapValveDesign;

function span(design: FlapValveDesign, leaflet: number): number {
  const { from, to } = design.leaflets[leaflet];
  return (to - from) / FULL_TURN;
}

describe('valve designs', () => {
  it('gives the mitral a deep anterior leaflet on a third of the ring facing the aorta', () => {
    const [anterior, posterior] = MITRAL.leaflets;
    expect(span(MITRAL, 0)).toBeCloseTo(1 / 3, 2);
    expect(span(MITRAL, 1)).toBeCloseTo(2 / 3, 2);
    expect(anterior.depthMm).toBeGreaterThanOrEqual(22);
    expect(anterior.depthMm).toBeLessThanOrEqual(25);
    expect(posterior.depthMm).toBeGreaterThanOrEqual(12);
    expect(posterior.depthMm).toBeLessThanOrEqual(14);
    expect(posterior.clefts).toHaveLength(2);
    const frame = ringFrame(VALVES.mitral.centre, VALVES.mitral.normal, VALVES.mitral.radius);
    const towardAorta = planAngle(frame, VALVES.aortic.centre);
    expect((anterior.from + anterior.to) / 2).toBeCloseTo(towardAorta, 5);
  });

  it('gives the tricuspid a largest anterior leaflet and three muscles', () => {
    const [anterior, posterior, septal] = TRICUSPID.leaflets;
    expect(anterior.depthMm).toBeGreaterThan(posterior.depthMm);
    expect(anterior.depthMm).toBeGreaterThan(septal.depthMm);
    expect(span(TRICUSPID, 0)).toBeGreaterThan(span(TRICUSPID, 1));
    expect(TRICUSPID.papillaries).toHaveLength(3);
  });

  it('keeps three cusps for each outflow valve', () => {
    for (const id of ['aortic', 'pulmonary'] as const) {
      const design = VALVE_DESIGN[id];
      expect(design.kind).toBe('cusp');
      if (design.kind === 'cusp') expect(design.shape.count).toBe(3);
    }
  });
});
