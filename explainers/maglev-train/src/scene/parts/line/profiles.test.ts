import { describe, expect, it } from 'vitest';
import { GUIDANCE_RAIL, GUIDEWAY_TOP, SKIDS, STATOR, STATOR_BOTTOM, TRAIN } from '../../../model';
import { DECK, PACKS, RAIL, TRAY } from './constants';
import { GIRDER_HALF, PACK_PROFILE, RAIL_PROFILE, STRIP_PROFILE, VOID_HALF } from './profiles';

const MIN_WALL = 0.2;

function span(points: readonly (readonly [number, number])[], axis: 0 | 1): [number, number] {
  const values = points.map((point) => point[axis]);
  return [Math.min(...values), Math.max(...values)];
}

describe('guideway cross-section', () => {
  it('hangs the stator packs under the deck edges with their bottom at the layout height', () => {
    const [inner, outer] = span(PACK_PROFILE, 0);
    expect(span(PACK_PROFILE, 1)[0]).toBeCloseTo(STATOR_BOTTOM);
    expect((inner + outer) / 2).toBeCloseTo(STATOR.sideZ);
    expect(outer).toBeLessThan(DECK.edge);
    expect(inner).toBeGreaterThan(DECK.concreteEdge);
  });

  it('puts the guidance rail face on the layout plane', () => {
    const [, outer] = span(RAIL_PROFILE, 0);
    const [bottom, top] = span(RAIL_PROFILE, 1);
    expect(outer).toBeCloseTo(GUIDANCE_RAIL.faceZ);
    expect((bottom + top) / 2).toBeCloseTo(GUIDANCE_RAIL.centreY);
    expect(RAIL.inner).toBeGreaterThan(PACKS.outer);
  });

  it('keeps the slide strips on the deck top under the skids', () => {
    const [inner, outer] = span(STRIP_PROFILE, 0);
    expect((inner + outer) / 2).toBeCloseTo(SKIDS.stripZ);
    expect(span(STRIP_PROFILE, 1)[1]).toBeGreaterThanOrEqual(GUIDEWAY_TOP);
  });

  it('leaves solid walls around the hollow box', () => {
    const [, girderTop] = span(GIRDER_HALF, 1);
    const [voidBottom, voidTop] = span(VOID_HALF, 1);
    expect(girderTop - voidTop).toBeGreaterThanOrEqual(MIN_WALL);
    expect(voidBottom - DECK.bottom).toBeGreaterThanOrEqual(MIN_WALL);
    expect(DECK.webFoot.z - DECK.voidFoot.z).toBeGreaterThanOrEqual(MIN_WALL);
  });

  it('keeps the feeder tray below the train arms', () => {
    expect(TRAY.top).toBeLessThan(TRAIN.armBottom);
  });
});
