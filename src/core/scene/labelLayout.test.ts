import { describe, expect, it } from 'vitest';
import { MAX_SHIFT_PX, TEXT_OFFSET_PX, TEXT_RISE_PX, layoutLabels } from './labelLayout';
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

  it('hides a label instead of pushing it far from its dot', () => {
    const wall = { left: 60, right: 190, top: 0, bottom: 300 };
    const narrow = { ...bounds, width: 250, keepOut: [wall] };
    const placements = layoutLabels([box('far', 200, 100, 'left')], narrow);
    expect(placements.get('far')?.hidden).toBe(true);
  });

  it('still shifts a label as far as the cap allows', () => {
    const wall = { left: 60, right: 190, top: 0, bottom: 150 };
    const narrow = { ...bounds, width: 250, keepOut: [wall] };
    const placements = layoutLabels([box('near', 200, 100, 'left')], narrow);
    expect(placements.get('near')?.hidden).toBeUndefined();
    expect(Math.abs(placements.get('near')?.shift ?? 0)).toBeLessThanOrEqual(MAX_SHIFT_PX);
  });

  describe('with earlier placements', () => {
    const previous = (id: string, placement: Placement) => new Map([[id, placement]]);

    it('keeps the side it already holds when the other side is only a little nearer', () => {
      const own = { left: 228, right: 308, top: 60, bottom: 96 };
      const other = { left: 60, right: 190, top: 80, bottom: 96 };
      const placements = layoutLabels(
        [box('held', 200, 100, 'left')],
        { ...bounds, keepOut: [own, other] },
        previous('held', { side: 'right', shift: 0 }),
      );
      expect(placements.get('held')?.side).toBe('right');
    });

    it('goes back to its preferred side once that is clearly free', () => {
      const placements = layoutLabels(
        [box('home', 200, 100, 'left')],
        bounds,
        previous('home', { side: 'right', shift: 30 }),
      );
      expect(placements.get('home')).toEqual({ side: 'left', shift: 0 });
    });

    it('keeps its shift while that spot stays free and home is taken', () => {
      const blocker = { left: 60, right: 190, top: 70, bottom: 96 };
      const placements = layoutLabels(
        [box('kept', 200, 100)],
        { ...bounds, keepOut: [blocker] },
        previous('kept', { side: 'left', shift: 40 }),
      );
      expect(placements.get('kept')).toEqual({ side: 'left', shift: 40 });
    });

    it('stays shifted while home is free only barely', () => {
      const blocker = { left: 60, right: 190, top: 40, bottom: 64 };
      const placements = layoutLabels(
        [box('wary', 200, 100)],
        { ...bounds, keepOut: [blocker] },
        previous('wary', { side: 'left', shift: 40 }),
      );
      expect(placements.get('wary')?.shift).toBe(40);
    });

    it('settles back home once there is clear room', () => {
      const blocker = { left: 60, right: 190, top: 40, bottom: 52 };
      const placements = layoutLabels(
        [box('calm', 200, 100)],
        { ...bounds, keepOut: [blocker] },
        previous('calm', { side: 'left', shift: 40 }),
      );
      expect(placements.get('calm')).toEqual({ side: 'left', shift: 0 });
    });

    it('moves to the nearest free spot when the held spot is taken', () => {
      const blockers = [
        { left: 60, right: 190, top: 70, bottom: 96 },
        { left: 60, right: 190, top: 110, bottom: 140 },
      ];
      const placements = layoutLabels(
        [box('moved', 200, 100)],
        { ...bounds, keepOut: blockers },
        previous('moved', { side: 'left', shift: 40 }),
      );
      const placement = placements.get('moved');
      expect(placement?.hidden).toBeUndefined();
      expect(placement?.shift).not.toBe(40);
      if (placement)
        blockers.forEach((area) =>
          expect(overlaps(pill(box('moved', 200, 100), placement), area)).toBe(false),
        );
    });

    it('ignores a hidden earlier placement', () => {
      const blocker = { left: 60, right: 190, top: 70, bottom: 96 };
      const fresh = layoutLabels([box('back', 200, 100)], { ...bounds, keepOut: [blocker] });
      const after = layoutLabels(
        [box('back', 200, 100)],
        { ...bounds, keepOut: [blocker] },
        previous('back', { side: 'left', shift: 0, hidden: true }),
      );
      expect(after.get('back')).toEqual(fresh.get('back'));
    });
  });
});
