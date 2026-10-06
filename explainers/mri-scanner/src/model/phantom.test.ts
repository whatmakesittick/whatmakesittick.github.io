import { describe, expect, it } from 'vitest';
import { TISSUE_IDS } from '../ids';
import { MODEL_SIZE } from './constants';
import { phantomImage, phantomTissue } from './phantom';
import { tissueSignals } from './signal';

const MIDDLE = MODEL_SIZE / 2;

function columnThroughCentre(): (string | null)[] {
  return Array.from({ length: MODEL_SIZE }, (_, y) => phantomTissue(MIDDLE, y));
}

describe('phantom head', () => {
  it('leaves the corners as air', () => {
    expect(phantomTissue(0, 0)).toBeNull();
    expect(phantomTissue(MODEL_SIZE - 1, MODEL_SIZE - 1)).toBeNull();
  });

  it('nests scalp, skull, fluid, cortex and white matter from the edge inwards', () => {
    const layers = columnThroughCentre().filter(
      (tissue, index, all) => index === 0 || tissue !== all[index - 1],
    );
    expect(layers.slice(0, 6)).toEqual([null, 'fat', null, 'fluid', 'greyMatter', 'whiteMatter']);
  });

  it('holds two fluid ventricles left and right of the middle', () => {
    expect(phantomTissue(MIDDLE - 4, MIDDLE)).toBe('fluid');
    expect(phantomTissue(MIDDLE + 3, MIDDLE)).toBe('fluid');
    expect(phantomTissue(MIDDLE, MIDDLE)).toBe('whiteMatter');
  });

  it('contains every tissue', () => {
    const tissues = new Set(
      columnThroughCentre().concat(
        Array.from({ length: MODEL_SIZE }, (_, x) => phantomTissue(x, MIDDLE)),
      ),
    );
    for (const tissue of TISSUE_IDS) expect(tissues.has(tissue)).toBe(true);
  });

  it('paints each tissue with its signal', () => {
    const image = phantomImage('field15', 't2');
    const signals = tissueSignals('field15', 't2');
    expect(image).toHaveLength(MODEL_SIZE * MODEL_SIZE);
    expect(image[0]).toBe(0);
    expect(image[MIDDLE * MODEL_SIZE + MIDDLE]).toBeCloseTo(signals.whiteMatter, 6);
  });
});
