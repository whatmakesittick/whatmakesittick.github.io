import { describe, expect, it } from 'vitest';
import { ACTUATORS, INLETS, NOZZLE_EXIT, STREAM_PATHS, plumeShape } from '../../model';
import { notchedDisc } from './engine/mount';
import { coolantLine, coolantReturn, injectorElements, inletOutline } from './engine/powerhead';
import { ignitionFlash } from './engine/preburner';
import { applyShape, diamondCentre, plumeUniforms } from './flame/plume';
import { labelPoint, streamAlpha } from './flow/flowStreams';
import { labelPlacements } from './labels';

describe('engine parts', () => {
  it('notches the thrust mount around the feed lines', () => {
    const outline = notchedDisc(34, 33, 12.5, 180);
    for (const point of outline) {
      expect(point.length()).toBeLessThanOrEqual(34 + 1e-6);
      expect(Math.hypot(point.x - 33, point.y)).toBeGreaterThanOrEqual(12.5 - 1e-6);
    }
  });

  it('shapes the feed line with a flange and bellows', () => {
    const outline = inletOutline(INLETS.oxygen.radius, -29);
    expect(outline[0][0]).toBeGreaterThan(INLETS.oxygen.radius);
    expect(outline[outline.length - 1]).toEqual([INLETS.oxygen.radius, -29]);
  });

  it('runs the coolant line from the pump to the manifold and back to the preburner', () => {
    const line = coolantLine();
    const [path] = STREAM_PATHS.liquidMethane;
    expect(line[0]).toEqual(path[2]);
    expect(line[line.length - 1][1]).toBeLessThan(-290);
    const back = coolantReturn();
    expect(back[back.length - 1]).toEqual(path[path.length - 1]);
  });

  it('spreads the injector elements over rings of growing size', () => {
    const elements = injectorElements();
    expect(elements.length).toBeGreaterThan(60);
    expect(Math.max(...elements.map((element) => element.radius))).toBeLessThan(19);
  });

  it('flashes the preburners once when they light', () => {
    expect(ignitionFlash(-3, -2.2, 0.6)).toBe(0);
    expect(ignitionFlash(-2.2, -2.2, 0.6)).toBe(1);
    expect(ignitionFlash(-1.9, -2.2, 0.6)).toBeCloseTo(0.5);
    expect(ignitionFlash(0, -2.2, 0.6)).toBe(0);
  });

  it('keeps the actuator lower ends in front of the cut', () => {
    for (const strut of ACTUATORS) expect(strut.bottom[2]).toBeGreaterThan(0);
  });
});

describe('flame and flow', () => {
  it('feeds the plume shape into the shader', () => {
    const uniforms = plumeUniforms();
    const shape = plumeShape(1, 101325);
    applyShape(uniforms, shape, 101325);
    expect(uniforms.uLength.value).toBeCloseTo(shape.length);
    expect(uniforms.uWaist.value).toBeCloseTo(shape.waist);
    expect(uniforms.uAir.value).toBeCloseTo(1);
    expect(diamondCentre(shape, 1)).toBeGreaterThan(diamondCentre(shape, 0));
    expect(diamondCentre(shape, 0)).toBeGreaterThan(0);
    applyShape(uniforms, plumeShape(0, 101325), 101325);
    expect(uniforms.uLength.value).toBeGreaterThan(0);
    expect(uniforms.uExitRadius.value).toBeLessThan(NOZZLE_EXIT.radius);
  });

  it('dims the other liquid only when a propellant is chosen', () => {
    expect(streamAlpha('liquidOxygen', null, 0)).toBe(1);
    expect(streamAlpha('liquidOxygen', 'methane', 0)).toBeCloseTo(0.3);
    expect(streamAlpha('liquidMethane', 'methane', 0)).toBe(1);
    expect(streamAlpha('oxygenRichGas', 'methane', 0)).toBe(0);
    expect(streamAlpha('oxygenRichGas', null, 1)).toBe(1);
  });

  it('labels each stream in front of the cut', () => {
    expect(labelPoint('liquidMethane')[2]).toBeGreaterThan(0);
    const placements = labelPlacements();
    expect(placements.coolingChannels.whole).not.toEqual(placements.coolingChannels.cut);
    expect(placements.chamber.cut[2]).toBeGreaterThan(0);
  });
});
