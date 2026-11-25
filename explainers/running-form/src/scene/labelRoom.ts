import { keepOutOverlays, watchKeepOut } from '@core/scene/keepOut';
import type { Rect } from '@core/scene/labelLayout';
import type { LabelLayer } from '@core/scene/labels';

const MOVE_TOLERANCE_PX = 1;

function sameRect(a: Rect, b: Rect): boolean {
  return (
    Math.abs(a.left - b.left) <= MOVE_TOLERANCE_PX &&
    Math.abs(a.right - b.right) <= MOVE_TOLERANCE_PX &&
    Math.abs(a.top - b.top) <= MOVE_TOLERANCE_PX &&
    Math.abs(a.bottom - b.bottom) <= MOVE_TOLERANCE_PX
  );
}

function sameRects(a: readonly Rect[], b: readonly Rect[]): boolean {
  return a.length === b.length && a.every((rect, index) => sameRect(rect, b[index]));
}

export class LabelRoom {
  private readonly labels: Pick<LabelLayer, 'setObstacles'>;
  private readonly stopWatching: () => void;
  private overlays: readonly Rect[] = [];
  private tags: readonly Rect[] = [];

  constructor(labels: Pick<LabelLayer, 'setObstacles'>, frame: HTMLElement) {
    this.labels = labels;
    this.stopWatching = watchKeepOut(frame, keepOutOverlays(frame), (areas) => {
      this.overlays = areas;
    });
  }

  get overlayAreas(): readonly Rect[] {
    return this.overlays;
  }

  setTags(boxes: readonly Rect[]): void {
    if (sameRects(boxes, this.tags)) return;
    this.tags = boxes;
    this.labels.setObstacles(boxes);
  }

  dispose(): void {
    this.stopWatching();
  }
}
