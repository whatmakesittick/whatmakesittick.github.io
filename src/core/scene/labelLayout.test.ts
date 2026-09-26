import { describe, expect, it } from 'vitest';
import { layoutLabels } from './labelLayout';
import type { LabelBox } from './labelLayout';

const bounds = { width: 400, height: 400, bottomInset: 0 };

function box(id: string, x: number, y: number, preferred: 'left' | 'right' = 'left'): LabelBox {
  return { id, anchor: { x, y }, width: 80, height: 24, preferred };
}

describe('layoutLabels', () => {
  it('leaves labels alone when they do not touch', () => {
    const placements = layoutLabels([box('a', 200, 100), box('b', 200, 200)], bounds);
    expect(placements.get('a')).toEqual({ side: 'left', shift: 0 });
    expect(placements.get('b')).toEqual({ side: 'left', shift: 0 });
  });

  it('pushes a lower label below the one above it', () => {
    const placements = layoutLabels([box('valve', 200, 100), box('piston', 200, 110)], bounds);
    expect(placements.get('valve')?.shift).toBe(0);
    expect(placements.get('piston')?.shift).toBe(18);
  });

  it('stacks three overlapping labels in anchor order', () => {
    const placements = layoutLabels(
      [box('c', 200, 104), box('a', 200, 100), box('b', 200, 102)],
      bounds,
    );
    const shifts = ['a', 'b', 'c'].map((id) => placements.get(id)?.shift);
    expect(shifts[0]).toBe(0);
    expect(shifts[1]).toBeGreaterThan(0);
    expect(shifts[2]).toBeGreaterThan(shifts[1] ?? 0);
  });

  it('moves a label up instead when pushing down would cross the floor', () => {
    const floor = { ...bounds, bottomInset: 300 };
    const placements = layoutLabels([box('a', 200, 100), box('b', 200, 110)], floor);
    expect(placements.get('b')?.shift).toBeLessThan(0);
  });

  it('ignores labels on the other side of their anchors', () => {
    const placements = layoutLabels(
      [box('a', 200, 100, 'left'), box('b', 200, 100, 'right')],
      bounds,
    );
    expect(placements.get('a')?.shift).toBe(0);
    expect(placements.get('b')?.shift).toBe(0);
  });

  it('flips a label that would leave the viewport', () => {
    const placements = layoutLabels([box('edge', 40, 100, 'left')], bounds);
    expect(placements.get('edge')?.side).toBe('right');
  });
});
