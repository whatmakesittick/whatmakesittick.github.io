import { Vector3 } from 'three';
import type { Camera } from 'three';
import { TEXT_OFFSET_PX, TEXT_RISE_PX } from '@core/scene/labelLayout';
import type { LabelSide, Point, Rect } from '@core/scene/labelLayout';
import type { ViewportSize } from '@core/scene/lens';
import { isShown } from '@core/scene/parts';
import type { OverlayTag, TagSize } from './tag';

const INSIDE_PX = { top: 28, side: 4, bottom: 4 } as const;
const CLIP_RANGE = 1;
const TAG_GAP_PX = 3;
const OTHER_SIDE: Readonly<Record<LabelSide, LabelSide>> = { left: 'right', right: 'left' };

export function textBox(anchor: Point, size: TagSize, side: LabelSide): Rect {
  const left =
    side === 'right' ? anchor.x + TEXT_OFFSET_PX : anchor.x - TEXT_OFFSET_PX - size.width;
  const top = anchor.y - TEXT_RISE_PX - size.height / 2;
  return { left, right: left + size.width, top, bottom: top + size.height };
}

function framed(box: Rect, frame: ViewportSize): boolean {
  const { width, height, safe } = frame;
  return (
    box.left >= safe.left + INSIDE_PX.side &&
    box.right <= width - safe.right - INSIDE_PX.side &&
    box.top >= safe.top + INSIDE_PX.top &&
    box.bottom <= height - safe.bottom - INSIDE_PX.bottom
  );
}

function overlaps(a: Rect, b: Rect): boolean {
  return (
    a.left < b.right + TAG_GAP_PX &&
    b.left < a.right + TAG_GAP_PX &&
    a.top < b.bottom + TAG_GAP_PX &&
    b.top < a.bottom + TAG_GAP_PX
  );
}

export function fittingSide(
  anchor: Point,
  size: TagSize,
  preferred: LabelSide,
  frame: ViewportSize,
  taken: readonly Rect[] = [],
): LabelSide | null {
  return (
    [preferred, OTHER_SIDE[preferred]].find((side) => {
      const box = textBox(anchor, size, side);
      return framed(box, frame) && !taken.some((rect) => overlaps(box, rect));
    }) ?? null
  );
}

const world = new Vector3();

function screenPoint(tag: OverlayTag, camera: Camera, frame: ViewportSize): Point | null {
  const ndc = tag.object.getWorldPosition(world).project(camera);
  if (Math.abs(ndc.z) > CLIP_RANGE) return null;
  return { x: ((ndc.x + 1) / 2) * frame.width, y: ((1 - ndc.y) / 2) * frame.height };
}

export function fitTags(
  tags: readonly OverlayTag[],
  camera: Camera,
  frame: ViewportSize,
  keepOut: readonly Rect[],
): Rect[] {
  const placed: Rect[] = [];
  tags.forEach((tag) => {
    if (!isShown(tag.object)) return;
    const anchor = screenPoint(tag, camera, frame);
    const taken = [...keepOut, ...placed];
    const side = anchor ? fittingSide(anchor, tag.size, tag.preferred, frame, taken) : null;
    tag.place(side);
    if (anchor && side) placed.push(textBox(anchor, tag.size, side));
  });
  return placed;
}
