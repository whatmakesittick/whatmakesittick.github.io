import { describe, expect, it } from 'vitest';
import { SEABED_DEPTH_M } from '../model';
import { createOilRigStore } from '../state';
import { NO_VALUE } from './format';
import { mountRockReadouts } from './rockReadouts';
import { mountSectionReadouts } from './sectionReadouts';

const MARKUP = `
  <dd data-readout="hole-size"></dd>
  <dd data-readout="string-length"></dd>
  <dd data-readout="string-weight"></dd>
  <canvas data-view="pores" width="480" height="240"></canvas>
  <dd data-readout="rock-temperature"></dd>
  <dd data-readout="rock-porosity"></dd>
`;

function readoutsAt(phase: number): Record<string, string | null> {
  document.body.innerHTML = MARKUP;
  const store = createOilRigStore({ phase });
  mountSectionReadouts(document, store);
  mountRockReadouts(document, store);
  const text = (id: string) =>
    document.querySelector(`[data-readout="${id}"]`)?.textContent ?? null;
  return {
    hole: text('hole-size'),
    temperature: text('rock-temperature'),
    porosity: text('rock-porosity'),
  };
}

describe('readouts above the seabed', () => {
  it('shows no hole and no rock while the bit is on deck or in the water', () => {
    [0, SEABED_DEPTH_M - 1].forEach((phase) =>
      expect(readoutsAt(phase)).toEqual({
        hole: NO_VALUE,
        temperature: NO_VALUE,
        porosity: NO_VALUE,
      }),
    );
  });

  it('shows the hole and the rock once the bit is below the seabed', () => {
    Object.values(readoutsAt(SEABED_DEPTH_M + 1)).forEach((text) =>
      expect(text).not.toBe(NO_VALUE),
    );
  });
});
