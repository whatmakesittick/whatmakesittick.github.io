import { describe, expect, it } from 'vitest';
import { TEXT_OFFSET_PX, TEXT_RISE_PX, layoutLabels } from './labelLayout';
import type { LabelBounds, LabelBox, Placement, Rect } from './labelLayout';

const bounds = { width: 400, height: 400, bottomInset: 0 };

function box(id: string, x: number, y: number, preferred: 'left' | 'right' = 'left'): LabelBox {
  return { id, anchor: { x, y }, width: 80, height: 24, preferred };
}

function pill(item: LabelBox, placement: Placement): Rect {
  const left =
    placement.side === 'right'
      ? item.anchor.x + TEXT_OFFSET_PX
      : item.anchor.x - TEXT_OFFSET_PX - item.width;
  const centre = item.anchor.y - TEXT_RISE_PX + placement.shift;
  return {
    left,
    right: left + item.width,
    top: centre - item.height / 2,
    bottom: centre + item.height / 2,
  };
}

function overlaps(a: Rect, b: Rect): boolean {
  return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
}

function shownPills(boxes: readonly LabelBox[], layoutBounds: LabelBounds): Rect[] {
  const placements = layoutLabels(boxes, layoutBounds);
  return boxes.flatMap((item) => {
    const placement = placements.get(item.id);
    return placement && !placement.hidden ? [pill(item, placement)] : [];
  });
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

  it('spreads three overlapping labels on one side without overlap', () => {
    const boxes = [box('c', 330, 104), box('a', 330, 100), box('b', 330, 102)];
    const placements = layoutLabels(boxes, bounds);
    expect(placements.get('a')?.shift).toBe(0);
    expect(placements.get('b')?.shift).toBeGreaterThan(0);
    expect(boxes.every((item) => placements.get(item.id)?.side === 'left')).toBe(true);
    const pills = shownPills(boxes, bounds);
    pills.forEach((one, index) =>
      pills.slice(index + 1).forEach((other) => expect(overlaps(one, other)).toBe(false)),
    );
  });

  it('takes the nearer free spot above when it is closer than the one below', () => {
    const blocker = { left: 60, right: 180, top: 70, bottom: 130 };
    const placements = layoutLabels([box('near', 200, 110, 'left')], {
      ...bounds,
      width: 250,
      keepOut: [blocker],
    });
    const placement = placements.get('near');
    expect(placement?.side).toBe('left');
    expect(placement?.shift).toBeLessThan(0);
  });

  it('flips to the other side when its own nearest free spot is far away', () => {
    const wall = { left: 60, right: 190, top: 0, bottom: 300 };
    const placements = layoutLabels([box('far', 200, 100, 'left')], { ...bounds, keepOut: [wall] });
    expect(placements.get('far')).toEqual({ side: 'right', shift: 0 });
  });

  it('stays on its own side when the other side is only a little nearer', () => {
    const own = { left: 60, right: 190, top: 60, bottom: 90 };
    const other = { left: 210, right: 330, top: 60, bottom: 76 };
    const placements = layoutLabels([box('close', 200, 100, 'left')], {
      ...bounds,
      keepOut: [own, other],
    });
    expect(placements.get('close')?.side).toBe('left');
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

  it('never lets two labels coincide in a crowded stack above the floor', () => {
    const crowded = { width: 390, height: 400, bottomInset: 120 };
    const boxes = [
      box('pump', 150, 170, 'right'),
      box('ducts', 150, 240, 'right'),
      box('gas', 150, 240, 'right'),
      box('burner', 150, 250, 'right'),
      box('stream', 150, 260, 'right'),
      box('manifold', 150, 262, 'right'),
    ];
    const pills = shownPills(boxes, crowded);
    pills.forEach((a, index) =>
      pills.slice(index + 1).forEach((b) => expect(overlaps(a, b)).toBe(false)),
    );
    pills.forEach((rect) => expect(rect.bottom).toBeLessThanOrEqual(400 - 120));
  });

  it('moves a label out of a keep-out area', () => {
    const button = { left: 300, right: 344, top: 10, bottom: 54 };
    const placements = layoutLabels([box('corner', 250, 50, 'right')], {
      ...bounds,
      keepOut: [button],
    });
    const placement = placements.get('corner');
    expect(placement?.hidden).toBeUndefined();
    if (placement)
      expect(overlaps(pill(box('corner', 250, 50, 'right'), placement), button)).toBe(false);
  });

  it('flips a label to its other side when its own side has no room', () => {
    const wall = { left: 220, right: 400, top: 0, bottom: 400 };
    const placements = layoutLabels([box('boxed', 200, 100, 'right')], {
      ...bounds,
      keepOut: [wall],
    });
    expect(placements.get('boxed')).toEqual({ side: 'left', shift: 0 });
  });

  it('hides a label when neither side has room', () => {
    const cover = { left: 0, right: 400, top: 0, bottom: 400 };
    const placements = layoutLabels([box('lost', 200, 100)], { ...bounds, keepOut: [cover] });
    expect(placements.get('lost')?.hidden).toBe(true);
  });

  it('gives the free spot to the higher-ranked label and hides the other', () => {
    const tight = { width: 400, height: 56, bottomInset: 0 };
    const minor = { ...box('minor', 200, 46), rank: 5 };
    const major = { ...box('major', 200, 46), rank: 1 };
    const walls = [{ left: 200, right: 400, top: 0, bottom: 56 }];
    const placements = layoutLabels([minor, major], { ...tight, keepOut: walls });
    expect(placements.get('major')).toEqual({ side: 'left', shift: 0 });
    expect(placements.get('minor')?.hidden).toBe(true);
  });

  it('keeps every shown label clear of the others and of the keep-out areas', () => {
    const keepOut = [
      { left: 330, right: 380, top: 10, bottom: 54 },
      { left: 250, right: 400, top: 60, bottom: 200 },
    ];
    const layoutBounds = { width: 400, height: 500, bottomInset: 100, keepOut };
    const boxes = Array.from({ length: 24 }, (_, index) =>
      box(
        `part${index}`,
        60 + ((index * 67) % 280),
        40 + ((index * 53) % 360),
        index % 2 ? 'left' : 'right',
      ),
    );
    const pills = shownPills(boxes, layoutBounds);
    expect(pills.length).toBeGreaterThan(0);
    pills.forEach((a, index) => {
      keepOut.forEach((area) => expect(overlaps(a, area)).toBe(false));
      pills.slice(index + 1).forEach((b) => expect(overlaps(a, b)).toBe(false));
    });
  });
});
