import { Object3D, PerspectiveCamera } from 'three';
import { describe, expect, it } from 'vitest';
import { LabelVisibility } from './labelVisibility';
import type { LabelLayer } from './labels';
import { NO_SAFE_AREA } from './lens';
import type { ViewportSize } from './lens';

const SIZE: ViewportSize = { width: 200, height: 200, safe: NO_SAFE_AREA };
const CAMERA_DISTANCE = 10;
const RIGHT_ANGLE_FOV = 90;
const PIXELS_PER_UNIT = SIZE.width / 2 / CAMERA_DISTANCE;
const CENTRE_PX = SIZE.width / 2;

interface Harness {
  visibility: LabelVisibility;
  anchors: Map<string, Object3D>;
  shown(): string[];
  moveTo(id: string, xPx: number, yPx?: number): void;
}

function createHarness(ids: readonly string[]): Harness {
  const camera = new PerspectiveCamera(RIGHT_ANGLE_FOV, 1);
  camera.position.set(0, 0, CAMERA_DISTANCE);
  camera.updateMatrixWorld();
  let shown: string[] = [];
  const labels = { show: (visible: ReadonlySet<string>) => (shown = [...visible]) };
  const visibility = new LabelVisibility(labels as unknown as LabelLayer, camera, ids);
  const anchors = new Map(ids.map((id) => [id, new Object3D()]));
  visibility.setAnchors(anchors);
  visibility.setViewport(SIZE);
  const moveTo = (id: string, xPx: number, yPx = CENTRE_PX) => {
    const toWorld = (px: number) => (px - CENTRE_PX) / PIXELS_PER_UNIT;
    anchors.get(id)?.position.set(toWorld(xPx), -toWorld(yPx), 0);
  };
  return { visibility, anchors, shown: () => shown, moveTo };
}

describe('LabelVisibility', () => {
  it('needs a wider margin to enter the screen than to stay on it', () => {
    const { visibility, shown, moveTo } = createHarness(['a']);
    moveTo('a', 190);
    visibility.setWanted(new Set(['a']), new Set());
    expect(shown()).toEqual([]);

    moveTo('a', CENTRE_PX);
    visibility.update();
    expect(shown()).toEqual(['a']);

    moveTo('a', 190);
    visibility.update();
    expect(shown()).toEqual(['a']);

    moveTo('a', 198);
    visibility.update();
    expect(shown()).toEqual([]);
  });

  it('hides a crowded label sooner than it brings it back', () => {
    const { visibility, shown, moveTo } = createHarness(['a', 'b']);
    const recrowd = () => {
      visibility.setViewport(SIZE);
      visibility.update();
    };
    moveTo('a', CENTRE_PX);
    moveTo('b', CENTRE_PX + 40);
    visibility.setWanted(new Set(['a', 'b']), new Set());
    expect(shown()).toEqual(['a']);

    moveTo('b', CENTRE_PX + 60);
    recrowd();
    expect(shown()).toEqual(['a', 'b']);

    moveTo('b', CENTRE_PX + 40);
    recrowd();
    expect(shown()).toEqual(['a', 'b']);

    moveTo('b', CENTRE_PX + 20);
    recrowd();
    expect(shown()).toEqual(['a']);
  });

  it('keeps a pinned label over a crowding label of higher priority', () => {
    const { visibility, shown, moveTo } = createHarness(['a', 'b']);
    moveTo('a', CENTRE_PX);
    moveTo('b', CENTRE_PX + 10);
    visibility.setWanted(new Set(['a', 'b']), new Set(['b']));
    expect(shown()).toEqual(['b']);
  });

  it('hides labels whose anchor or a parent is hidden', () => {
    const { visibility, anchors, shown, moveTo } = createHarness(['a']);
    const parent = new Object3D();
    const anchor = anchors.get('a');
    if (anchor) parent.add(anchor);
    moveTo('a', CENTRE_PX);
    parent.visible = false;
    visibility.setWanted(new Set(['a']), new Set());
    expect(shown()).toEqual([]);
  });
});
