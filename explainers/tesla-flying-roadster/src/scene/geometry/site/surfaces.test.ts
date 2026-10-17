import { describe, expect, it } from 'vitest';
import { SITE } from '../../../model/layout';
import { CONCRETE, concreteShade, gritHeight } from './concrete';
import { deckShade, treadHeight } from './deckPlate';
import { wornPaint } from './markings';
import { DECK } from './rampSpec';
import { groundTint, scrubShade } from './scrub';
import { normalPainter } from './textures';

const { length, width } = CONCRETE.tile;
const STEPS = 60;

function concreteAt(x: number, z: number): number {
  const [r, g, b] = concreteShade(x / length, (z + width / 2) / width);
  return (r + g + b) / 3;
}

function average(values: readonly number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function grid<T>(sample: (u: number, v: number) => T): T[] {
  return Array.from({ length: STEPS * STEPS }, (_, index) =>
    sample(((index % STEPS) + 0.5) / STEPS, (Math.floor(index / STEPS) + 0.5) / STEPS),
  );
}

describe('runway concrete', () => {
  it('cuts darker expansion joints every 6 m and along the lanes', () => {
    const joints = [6, 12, 18].map((x) => concreteAt(x, 1.7));
    const slabs = [3.2, 9.1, 15.3].map((x) => concreteAt(x, 1.7));
    expect(average(joints)).toBeLessThan(average(slabs) * 0.8);
    expect(concreteAt(4.3, CONCRETE.laneEdge)).toBeLessThan(concreteAt(4.3, 4.4) * 0.8);
  });

  it('leaves faint tyre marks along the centre line', () => {
    const xs = Array.from({ length: 40 }, (_, index) => 0.3 + index * 0.55);
    const marks = average(xs.map((x) => concreteAt(x, CONCRETE.tyre.track)));
    const clean = average(xs.map((x) => concreteAt(x, 2.2)));
    expect(marks).toBeLessThan(clean);
    expect(marks).toBeGreaterThan(clean * 0.75);
  });

  it('tints each slab slightly differently', () => {
    const tints = [1, 2, 3, 4].map((slab) => concreteAt(slab * 6 - 3, 0.5).toFixed(3));
    expect(new Set(tints).size).toBeGreaterThan(2);
  });

  it('tiles the grit normal map without seams', () => {
    const painter = normalPainter({ width: 32, height: 32 }, gritHeight, 2);
    const [r, g, b] = painter(0.01, 0.99);
    [r, g, b].forEach((channel) => expect(channel).toBeGreaterThanOrEqual(0));
    expect(b).toBeGreaterThan(0.5);
  });
});

describe('scrub ground', () => {
  it('mixes dark scrub, bare dirt and dry straw flecks', () => {
    const samples = grid(scrubShade);
    const warm = samples.filter(([r, , b]) => r - b > 0.12).length / samples.length;
    const dark = samples.filter(([r, g, b]) => r + g + b < 0.5).length / samples.length;
    expect(warm).toBeGreaterThan(0.03);
    expect(dark).toBeGreaterThan(0.2);
  });

  it('dusts the verge next to the runway', () => {
    const [verge] = groundTint(40, SITE.run.z[1] + 0.5);
    const far = average([90, 120, 150].map((z) => groundTint(40, z)[0]));
    expect(verge).toBeGreaterThan(far);
  });
});

describe('ramp deck plate', () => {
  const vAt = (across: number) => (DECK.halfWidth - across) / (DECK.halfWidth * 2);

  it('paints yellow and dark hazard stripes along both edges', () => {
    const edge = Array.from({ length: 40 }, (_, index) => deckShade(index / 40, vAt(1.35)));
    const yellow = edge.filter(([r, , b]) => r - b > 0.3).length;
    const dark = edge.filter(([r, g, b]) => r + g + b < 0.5).length;
    expect(yellow).toBeGreaterThan(10);
    expect(dark).toBeGreaterThan(10);
    const [r, , b] = deckShade(0.5, vAt(0));
    expect(Math.abs(r - b)).toBeLessThan(0.1);
  });

  it('crosses the plate with darker grip strips', () => {
    const strip = deckShade(0.375 / DECK.plateLength, vAt(0.3));
    const plate = deckShade(0.6 / DECK.plateLength, vAt(0.3));
    expect(strip[1]).toBeLessThan(plate[1]);
  });

  it('raises diamond tread lenses inside each cell', () => {
    expect(treadHeight(0.125, 0.125)).toBeGreaterThan(0.9);
    expect(treadHeight(0.01, 0.01)).toBe(0);
  });
});

describe('worn paint', () => {
  it('stays mostly solid with a few worn holes', () => {
    const solid = grid(wornPaint).filter(([, , , alpha]) => alpha > 0.5).length / STEPS ** 2;
    expect(solid).toBeGreaterThan(0.7);
    expect(solid).toBeLessThan(0.97);
  });
});
