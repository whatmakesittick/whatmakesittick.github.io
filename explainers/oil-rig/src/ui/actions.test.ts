import { describe, expect, it } from 'vitest';
import { SEABED_DEPTH_M } from '../model';
import { createOilRigStore } from '../state';
import { CHAPTER_ACTIONS } from './actions';

function currentSection(phase: number): string | undefined {
  return CHAPTER_ACTIONS.section.current?.(createOilRigStore({ phase }).getState());
}

describe('chapter actions', () => {
  it('marks no hole section while the bit is on deck or in the water', () => {
    expect(currentSection(0)).toBe('');
    expect(currentSection(SEABED_DEPTH_M - 1)).toBe('');
  });

  it('marks the hole section the bit is drilling', () => {
    expect(currentSection(SEABED_DEPTH_M + 1)).toBe('conductor');
    expect(currentSection(3000)).toBe('intermediate');
  });
});
