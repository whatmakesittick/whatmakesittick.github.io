import { Color } from 'three';
import { describe, expect, it } from 'vitest';
import { GROUND_STATION, LOS_MAST, RUNWAY, TARGET } from '../../model/layout';
import { GROUND } from '../constants';
import { flatness, gridLines, groundColour, lakeShare, terrainHeight } from './terrain';

describe('terrain', () => {
  it('lays the airfield, the ground station and the target compound flat', () => {
    for (const x of [RUNWAY.x[0], -60, RUNWAY.x[1]]) expect(terrainHeight(x, RUNWAY.z)).toBe(0);
    expect(terrainHeight(GROUND_STATION[0], GROUND_STATION[2])).toBe(0);
    expect(terrainHeight(LOS_MAST.position[0], LOS_MAST.position[2])).toBe(0);
    expect(terrainHeight(TARGET[0], TARGET[2])).toBe(0);
    expect(flatness(TARGET[0], TARGET[2])).toBe(1);
  });

  it('sinks the dry lake a little and paints it pale', () => {
    const [x, z] = GROUND.lake.centre;
    expect(lakeShare(x, z)).toBe(1);
    expect(terrainHeight(x, z)).toBeCloseTo(GROUND.lake.level);
    const lake = groundColour(x, z, terrainHeight(x, z), new Color());
    const sand = groundColour(600, -400, terrainHeight(600, -400), new Color());
    expect(lake.r + lake.g + lake.b).toBeGreaterThan(sand.r + sand.g + sand.b);
  });

  it('raises dunes out in the open desert', () => {
    const heights = Array.from({ length: 40 }, (_, index) => terrainHeight(400 + index * 13, -420));
    expect(Math.max(...heights)).toBeGreaterThan(0.5);
  });

  it('spaces the grid finely over the diorama and coarsely out to the horizon', () => {
    const lines = gridLines([-1000, 1000], [-100, 100], 10, 1.5);
    expect(lines[0]).toBe(-1000);
    expect(lines[lines.length - 1]).toBe(1000);
    expect(lines).toContain(0);
    const gaps = lines.slice(1).map((value, index) => value - lines[index]);
    expect(Math.min(...gaps)).toBeCloseTo(10);
    expect(Math.max(...gaps)).toBeGreaterThan(100);
    gaps.forEach((gap) => expect(gap).toBeGreaterThan(0));
  });
});
