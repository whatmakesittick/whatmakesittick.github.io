import { describe, expect, it, vi } from 'vitest';
import { SCALE_DEFAULT_LABELS } from '../state';
import { ScaleLabelPolicy, highlightForScale, labelsForScale } from './scaleLabels';
import type { ScaleSource } from './scaleLabels';

const MIXED = new Set(['mixture', 'iodate', 'stirBar']);

describe('labels per scale', () => {
  it('keeps only the parts of the shown scale', () => {
    expect([...labelsForScale(MIXED, { scale: 'beaker', camera: 'bench' })]).toEqual([
      'mixture',
      'stirBar',
    ]);
  });

  it('shows the scale defaults once the reader flips away from the chapter scale', () => {
    expect([...labelsForScale(MIXED, { scale: 'molecules', camera: 'bench' })]).toEqual([
      ...SCALE_DEFAULT_LABELS.molecules,
    ]);
    expect(labelsForScale(new Set(), { scale: 'molecules', camera: 'bench' }).size).toBe(0);
  });

  it('drops the highlight on the other scale', () => {
    expect(highlightForScale(['iodate'], { scale: 'molecules', camera: 'landolt' })).toEqual([
      'iodate',
    ]);
    expect(highlightForScale(['iodate'], { scale: 'beaker', camera: 'landolt' })).toEqual([]);
  });

  it('re-applies the wanted labels when the scale changes', () => {
    const setWanted = vi.fn();
    const source: ScaleSource = { scale: 'beaker', camera: 'bench' };
    const policy = new ScaleLabelPolicy({ setWanted }, () => source);
    policy.setWanted(MIXED, MIXED);
    expect([...(setWanted.mock.lastCall?.[0] ?? [])]).toEqual(['mixture', 'stirBar']);
    source.scale = 'molecules';
    policy.refresh();
    expect([...(setWanted.mock.lastCall?.[1] ?? [])]).toEqual([...SCALE_DEFAULT_LABELS.molecules]);
  });
});
