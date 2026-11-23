import { Object3D, PerspectiveCamera } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { TEXT_OFFSET_PX, TEXT_RISE_PX } from '@core/scene/labelLayout';
import type { LabelSide, Rect } from '@core/scene/labelLayout';
import { NO_SAFE_AREA } from '@core/scene/lens';
import type { ViewportSize } from '@core/scene/lens';
import type { OverlayTag, TagSize } from './tag';
import { fitTags, fittingSide, textBox } from './tagFit';

const FRAME: ViewportSize = { width: 400, height: 300, safe: NO_SAFE_AREA };
const SIZE: TagSize = { width: 80, height: 20 };
const CENTRE = { x: 200, y: 150 };
const EDGE_ANCHOR = { x: 30, y: 150 };
const NEAR_GAP_PX = 2;
const BEHIND_Z = 20;

function camera(): PerspectiveCamera {
  const view = new PerspectiveCamera(50, FRAME.width / FRAME.height, 0.1, 100);
  view.position.set(0, 0, 10);
  view.updateMatrixWorld();
  return view;
}

function fakeTag(z: number, preferred: LabelSide = 'right') {
  const object = new Object3D();
  object.position.set(0, 0, z);
  object.updateMatrixWorld();
  const place = vi.fn();
  const tag = { object, size: SIZE, preferred, place } as unknown as OverlayTag;
  return { tag, place };
}

describe('text box', () => {
  it('sits right of the anchor', () => {
    const box = textBox(CENTRE, SIZE, 'right');
    expect(box.left).toBe(CENTRE.x + TEXT_OFFSET_PX);
    expect(box.right).toBe(box.left + SIZE.width);
    expect(box.top).toBe(CENTRE.y - TEXT_RISE_PX - SIZE.height / 2);
    expect(box.bottom).toBe(box.top + SIZE.height);
  });

  it('sits left of the anchor', () => {
    const box = textBox(CENTRE, SIZE, 'left');
    expect(box.right).toBe(CENTRE.x - TEXT_OFFSET_PX);
    expect(box.left).toBe(box.right - SIZE.width);
  });
});

describe('fitting side', () => {
  it('keeps the preferred side when it fits', () => {
    expect(fittingSide(CENTRE, SIZE, 'left', FRAME)).toBe('left');
    expect(fittingSide(CENTRE, SIZE, 'right', FRAME)).toBe('right');
  });

  it('flips when the preferred box leaves the frame', () => {
    expect(fittingSide(EDGE_ANCHOR, SIZE, 'left', FRAME)).toBe('right');
  });

  it('flips when the preferred box leaves the safe area', () => {
    const frame = { ...FRAME, safe: { ...NO_SAFE_AREA, right: 150 } };
    expect(fittingSide(CENTRE, SIZE, 'right', frame)).toBe('left');
  });

  it('flips when the preferred box meets a keep-out or placed rect', () => {
    const right = textBox(CENTRE, SIZE, 'right');
    expect(fittingSide(CENTRE, SIZE, 'right', FRAME, [right])).toBe('left');
    expect(fittingSide(CENTRE, SIZE, 'right', FRAME, [], [right])).toBe('left');
  });

  it('treats a rect inside the gap as overlapping', () => {
    const right = textBox(CENTRE, SIZE, 'right');
    const near: Rect = { ...right, left: right.right + NEAR_GAP_PX, right: right.right + 40 };
    expect(fittingSide(CENTRE, SIZE, 'right', FRAME, [near])).toBe('left');
  });

  it('returns null when neither side fits', () => {
    const both = [textBox(CENTRE, SIZE, 'left'), textBox(CENTRE, SIZE, 'right')];
    expect(fittingSide(CENTRE, SIZE, 'right', FRAME, both)).toBeNull();
  });
});

describe('fit tags', () => {
  it('skips hidden tags', () => {
    const { tag, place } = fakeTag(0);
    tag.object.visible = false;
    expect(fitTags([tag], camera(), FRAME, [])).toEqual([]);
    expect(place).not.toHaveBeenCalled();
  });

  it('hides a tag behind the clip range', () => {
    const { tag, place } = fakeTag(BEHIND_Z);
    expect(fitTags([tag], camera(), FRAME, [])).toEqual([]);
    expect(place).toHaveBeenCalledWith(null);
  });

  it('keeps a later tag clear of an earlier one', () => {
    const first = fakeTag(0);
    const second = fakeTag(0);
    const placed = fitTags([first.tag, second.tag], camera(), FRAME, []);
    expect(first.place).toHaveBeenCalledWith('right');
    expect(second.place).toHaveBeenCalledWith('left');
    expect(placed).toHaveLength(2);
  });
});
