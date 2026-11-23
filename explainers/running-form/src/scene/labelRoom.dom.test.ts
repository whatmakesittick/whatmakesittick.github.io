import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Rect } from '@core/scene/labelLayout';
import { LabelRoom } from './labelRoom';

const BOX: Rect = { left: 10, right: 60, top: 20, bottom: 40 };
const NUDGE_PX = 1;
const SHIFT_PX = 5;

function shifted(rect: Rect, by: number): Rect {
  return { ...rect, left: rect.left + by, right: rect.right + by };
}

function build() {
  const setObstacles = vi.fn();
  const room = new LabelRoom({ setObstacles }, document.createElement('div'));
  return { room, setObstacles };
}

describe('label room', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('forwards the tag boxes as obstacles', () => {
    const { room, setObstacles } = build();
    room.setTags([BOX]);
    expect(setObstacles).toHaveBeenCalledTimes(1);
    expect(setObstacles).toHaveBeenCalledWith([BOX]);
    room.dispose();
  });

  it('ignores a move within one pixel', () => {
    const { room, setObstacles } = build();
    room.setTags([BOX]);
    room.setTags([shifted(BOX, NUDGE_PX)]);
    expect(setObstacles).toHaveBeenCalledTimes(1);
    room.dispose();
  });

  it('forwards a larger move', () => {
    const { room, setObstacles } = build();
    room.setTags([BOX]);
    room.setTags([shifted(BOX, SHIFT_PX)]);
    expect(setObstacles).toHaveBeenCalledTimes(2);
    room.dispose();
  });
});
