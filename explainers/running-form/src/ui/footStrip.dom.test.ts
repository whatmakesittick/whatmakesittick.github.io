import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { GAIT_DATA } from '../model';
import { createRunStore } from '../state';
import type { RunStore } from '../state';
import { footContactSpan, mountFootStrip } from './footStrip';
import { TEST_LOCALE, fill, initTestLocale } from './testing';

describe('foot strip spans', () => {
  it('puts the left foot half a cycle after the right and both on the ground until toe-off', () => {
    const toeOff = GAIT_DATA.steady.toeOffUnits;
    expect(footContactSpan('steady', 'right')).toEqual({ start: 0, end: toeOff });
    expect(footContactSpan('steady', 'left')).toEqual({ start: 500, end: 500 + toeOff });
  });
});

describe('foot strip', () => {
  let store: RunStore;
  let dispose: () => void;

  beforeAll(() => initTestLocale());

  beforeEach(() => {
    document.body.innerHTML = '<div class="gauge"></div>';
    store = createRunStore();
    dispose = mountFootStrip(document.querySelector<HTMLElement>('.gauge') as HTMLElement, store);
  });

  afterEach(() => dispose());

  it('draws two rows with the float share and removes them on dispose', () => {
    expect(document.querySelectorAll('[data-foot-strip-row]')).toHaveLength(2);
    expect(document.querySelector('.foot-strip__caption')?.textContent).toBe(
      fill(TEST_LOCALE.readouts.floatShare, { percent: '27' }),
    );
    dispose();
    expect(document.querySelector('[data-foot-strip]')).toBeNull();
  });

  it('moves the playhead and redraws on a pace change', () => {
    store.getState().setPhase(300);
    expect(document.querySelector('.foot-strip__playhead')?.getAttribute('x1')).toBe('300');
    const before = document.querySelector('rect')?.getAttribute('width');
    store.getState().setPace('fast');
    expect(document.querySelector('rect')?.getAttribute('width')).not.toBe(before);
    expect(document.querySelector('.foot-strip__caption')?.textContent).toContain('32');
  });
});
