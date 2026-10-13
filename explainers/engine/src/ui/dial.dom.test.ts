import { describe, expect, it } from 'vitest';
import { createEngineStore } from '../state';
import { mountGaugeDial } from './dial';

const QUARTER_TURN = 90;

function gaugeWithReadouts(): HTMLElement {
  const gauge = document.createElement('aside');
  gauge.append(Object.assign(document.createElement('dl'), { className: 'readouts' }));
  return gauge;
}

const needle = (gauge: HTMLElement) =>
  gauge.querySelector('.dial-needle')?.getAttribute('transform') ?? null;

describe('engine gauge dial', () => {
  it('goes above the readouts and follows the crank', () => {
    const gauge = gaugeWithReadouts();
    const store = createEngineStore();
    const unmount = mountGaugeDial(gauge, store);
    expect(gauge.firstElementChild?.className).toBe('gauge-dial');
    expect(gauge.lastElementChild?.className).toBe('readouts');
    const before = needle(gauge);
    store.getState().setPhase(QUARTER_TURN);
    expect(needle(gauge)).not.toBe(before);
    unmount();
  });

  it('removes itself and stops following the store once unmounted', () => {
    const gauge = gaugeWithReadouts();
    const store = createEngineStore();
    const unmount = mountGaugeDial(gauge, store);
    const dial = gauge.querySelector<HTMLElement>('.gauge-dial');
    const at = needle(gauge);
    unmount();
    expect(gauge.querySelector('.gauge-dial')).toBeNull();
    expect(gauge.childElementCount).toBe(1);
    store.getState().setPhase(QUARTER_TURN);
    expect(dial?.querySelector('.dial-needle')?.getAttribute('transform')).toBe(at);
  });
});
