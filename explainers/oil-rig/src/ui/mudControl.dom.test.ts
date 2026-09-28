import { afterEach, describe, expect, it, vi } from 'vitest';
import { createOilRigStore } from '../state';
import { mountMudControl } from './mudControl';
import { DEPTH_BUCKET_M, MudWindowGraph } from './mudWindowGraph';

const MARKUP = `
  <div class="range-widget mud-control">
    <output for="mud-weight"></output>
    <input id="mud-weight" type="range" data-control="mud-weight" />
    <canvas data-view="mud-window" width="640" height="360"></canvas>
    <dd data-readout="mud-pressure"></dd>
    <dd data-readout="pore-pressure"></dd>
    <dd data-readout="fracture-pressure"></dd>
    <dd data-readout="mud-state"></dd>
    <button type="button" class="chip" data-action="mudPlan"></button>
  </div>
`;
const START_M = 2500;

function mountAt(phase: number) {
  document.body.innerHTML = MARKUP;
  const draw = vi.spyOn(MudWindowGraph.prototype, 'draw');
  const store = createOilRigStore({ phase });
  mountMudControl(document, store);
  return { store, draw };
}

describe('mud control', () => {
  afterEach(() => vi.restoreAllMocks());

  it('repaints only when the bit crosses into the next depth bucket', () => {
    const { store, draw } = mountAt(START_M);
    const painted = draw.mock.calls.length;
    store.getState().setPhase(START_M + DEPTH_BUCKET_M / 4);
    expect(draw).toHaveBeenCalledTimes(painted);
    store.getState().setPhase(START_M + DEPTH_BUCKET_M);
    expect(draw).toHaveBeenCalledTimes(painted + 1);
  });

  it('disables the plan chip while the mud follows the plan', () => {
    const { store } = mountAt(START_M);
    const chip = document.querySelector('[data-action="mudPlan"]');
    expect(chip?.getAttribute('aria-disabled')).toBe('true');
    store.getState().setMudWeight(1.5);
    expect(chip?.getAttribute('aria-disabled')).toBe('false');
  });

  it('repaints when the reader changes the mud weight', () => {
    const { store, draw } = mountAt(START_M);
    const painted = draw.mock.calls.length;
    store.getState().setMudWeight(1.5);
    expect(draw).toHaveBeenCalledTimes(painted + 1);
  });
});
