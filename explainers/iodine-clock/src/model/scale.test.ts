import { describe, expect, it } from 'vitest';
import type { SpeciesCounts } from '../ids';
import { SPECIES_IDS } from '../ids';
import { BISULFITE_START_M } from './recipe';
import {
  BOND_LENGTH_A,
  HELIX_GEOMETRY,
  HELIX_HEIGHT_A,
  HELIX_RINGS,
  MAX_DRAWN_COUNTS,
  drawnCounts,
} from './scale';

function emptyCounts(): SpeciesCounts {
  return { iodate: 0, bisulfite: 0, sulfate: 0, iodide: 0, hydrogenIon: 0, iodine: 0 };
}

describe('scale', () => {
  it('draws nine bisulfite ions at the start and eighteen iodate', () => {
    const counts = drawnCounts(
      {
        iodateM: 0.025,
        bisulfiteM: BISULFITE_START_M,
        sulfateM: 0,
        iodideM: 0,
        acidM: 0,
        iodineM: 0,
      },
      emptyCounts(),
    );
    expect(counts).toEqual({
      iodate: 18,
      bisulfite: 9,
      sulfate: 0,
      iodide: 0,
      hydrogenIon: 0,
      iodine: 0,
    });
  });

  it('never draws more than the capacity of each species', () => {
    SPECIES_IDS.forEach((id) => expect(MAX_DRAWN_COUNTS[id]).toBeGreaterThan(0));
    expect(MAX_DRAWN_COUNTS.iodate).toBe(36);
    expect(MAX_DRAWN_COUNTS.iodide).toBe(3);
    expect(MAX_DRAWN_COUNTS.iodine).toBe(2);
  });

  it('builds a five-turn helix of thirty rings that holds a twelve-atom chain', () => {
    expect(HELIX_RINGS).toBe(30);
    expect(HELIX_HEIGHT_A).toBe(40);
    const chain = (HELIX_GEOMETRY.maxChainAtoms - 1) * BOND_LENGTH_A.chain;
    expect(chain).toBeLessThan(HELIX_HEIGHT_A);
  });
});
