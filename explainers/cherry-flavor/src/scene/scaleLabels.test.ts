import { describe, expect, it, vi } from 'vitest';
import { SCALE_DEFAULT_LABELS } from '../state';
import { ScaleLabelPolicy, highlightForScale, labelsForScale } from './scaleLabels';
import type { ScaleSource } from './scaleLabels';

const MIXED = new Set(['spoon', 'benzaldehyde', 'nostrils']);

describe('labels per scale', () => {
  it('keeps only the parts of the shown scale', () => {
    expect([...labelsForScale(MIXED, { scale: 'head', camera: 'profile' })]).toEqual([
      'spoon',
      'nostrils',
    ]);
  });

  it('shows the scale defaults once the reader flips away from the chapter scale', () => {
    expect([...labelsForScale(MIXED, { scale: 'molecules', camera: 'profile' })]).toEqual([
      ...SCALE_DEFAULT_LABELS.molecules,
    ]);
    expect(labelsForScale(new Set(), { scale: 'molecules', camera: 'profile' }).size).toBe(0);
  });

  it('drops the highlight on the other scale', () => {
    expect(
      highlightForScale(['benzaldehyde'], { scale: 'molecules', camera: 'receptors' }),
    ).toEqual(['benzaldehyde']);
    expect(highlightForScale(['benzaldehyde'], { scale: 'head', camera: 'receptors' })).toEqual([]);
  });

  it('re-applies the wanted labels when the scale changes', () => {
    const setWanted = vi.fn();
    const source: ScaleSource = { scale: 'head', camera: 'profile' };
    const policy = new ScaleLabelPolicy({ setWanted }, () => source);
    policy.setWanted(MIXED, MIXED);
    expect([...(setWanted.mock.lastCall?.[0] ?? [])]).toEqual(['spoon', 'nostrils']);
    source.scale = 'molecules';
    policy.refresh();
    expect([...(setWanted.mock.lastCall?.[1] ?? [])]).toEqual([...SCALE_DEFAULT_LABELS.molecules]);
  });
});
