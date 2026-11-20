import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { PHASE_IDS } from '../ids';
import { createSwimStore } from '../state';
import type { SwimStore } from '../state';
import { armStripSegments, mountArmStrip } from './armStrip';
import { initTestLocale } from './testing';

const CYCLE = 1000;
const HALF_CYCLE = 500;

describe('arm strip segments', () => {
  it('covers one full cycle for each arm', () => {
    for (const arm of ['right', 'left'] as const) {
      const total = armStripSegments('middle', arm).reduce(
        (sum, { start, end }) => sum + end - start,
        0,
      );
      expect(total).toBeCloseTo(CYCLE, 6);
    }
  });

  it('shifts the left arm by half a cycle and wraps it', () => {
    const right = armStripSegments('sprint', 'right');
    const left = armStripSegments('sprint', 'left');
    expect(right).toHaveLength(PHASE_IDS.length);
    expect(left.length).toBeGreaterThan(right.length);
    expect(left[0]?.start).toBe(HALF_CYCLE);
  });
});

describe('arm strip', () => {
  let store: SwimStore;
  let dispose: () => void;

  beforeAll(() => initTestLocale());

  beforeEach(() => {
    document.body.innerHTML = '<div class="gauge"></div>';
    store = createSwimStore();
    dispose = mountArmStrip(document.querySelector<HTMLElement>('.gauge') as HTMLElement, store);
  });

  afterEach(() => dispose());

  it('draws two rows with a caption and removes them on dispose', () => {
    expect(document.querySelectorAll('[data-arm-strip-row]')).toHaveLength(2);
    expect(document.querySelector('.arm-strip__caption')?.textContent).toContain('0.05');
    dispose();
    expect(document.querySelector('[data-arm-strip]')).toBeNull();
  });

  it('moves the playhead and redraws on a pace change', () => {
    store.getState().setPhase(300);
    expect(document.querySelector('.arm-strip__playhead')?.getAttribute('x1')).toBe('300');
    const before = document.querySelector('rect')?.getAttribute('width');
    store.getState().setPace('sprint');
    expect(document.querySelector('rect')?.getAttribute('width')).not.toBe(before);
  });
});
