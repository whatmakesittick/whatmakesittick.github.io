import { Object3D, PerspectiveCamera } from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LabelLayer } from './labels';
import { NO_SAFE_AREA } from './lens';

const PARTS = {
  wheel: { labelKey: 'parts.wheel', side: 'left' },
  spoke: { labelKey: 'parts.spoke', side: 'right' },
} as const;
const VIEWPORT = { width: 400, height: 300, safe: NO_SAFE_AREA };
const WIDE_TEXT = { inlineSize: 260, blockSize: 22 };

type Resize = (entries: Partial<ResizeObserverEntry>[]) => void;

function stubResizeObserver(): { resize: Resize; texts: Element[] } {
  const texts: Element[] = [];
  let resize: Resize = () => {};
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(callback: Resize) {
        resize = callback;
      }
      observe(target: Element) {
        texts.push(target);
      }
      disconnect() {}
    },
  );
  return { resize: (entries) => resize(entries), texts };
}

function frontCamera(): PerspectiveCamera {
  const camera = new PerspectiveCamera(50, VIEWPORT.width / VIEWPORT.height, 0.1, 100);
  camera.position.set(0, 0, 10);
  camera.updateMatrixWorld();
  return camera;
}

function sideOf(anchor: Object3D): string | undefined {
  const element = (anchor.children[0] as unknown as { element: HTMLElement }).element;
  return ['left', 'right'].find((side) => element.classList.contains(`scene-label--${side}`));
}

describe('LabelLayer', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reports the anchors its labels are attached to', () => {
    const layer = new LabelLayer(PARTS);
    const wheel = new Object3D();
    layer.attach(
      new Map([
        ['wheel', wheel],
        ['unknown', new Object3D()],
      ]),
    );
    expect([...layer.anchors()]).toEqual([['wheel', wheel]]);
    expect(wheel.children).toHaveLength(1);
    layer.dispose();
  });

  it('forgets anchors that a later attach leaves out', () => {
    const layer = new LabelLayer(PARTS);
    const wheel = new Object3D();
    layer.attach(new Map([['wheel', wheel]]));
    layer.attach(new Map([['spoke', new Object3D()]]));
    expect([...layer.anchors().keys()]).toEqual(['spoke']);
    expect(wheel.children).toHaveLength(0);
    layer.dispose();
  });

  it('hides an occluded label until it is clear again', () => {
    const layer = new LabelLayer(PARTS);
    const visible = (id: string) => layer.anchors().get(id)?.children[0]?.visible;
    layer.attach(
      new Map([
        ['wheel', new Object3D()],
        ['spoke', new Object3D()],
      ]),
    );
    layer.show(new Set(['wheel', 'spoke']));
    layer.setOccluded(new Set(['wheel']));
    expect([visible('wheel'), visible('spoke')]).toEqual([false, true]);
    expect([...layer.wanted()]).toEqual(['wheel', 'spoke']);
    layer.setOccluded(new Set());
    expect(visible('wheel')).toBe(true);
    layer.dispose();
  });

  it('tells its listeners when the labels change', () => {
    const layer = new LabelLayer(PARTS);
    const listener = vi.fn();
    layer.onChange(listener);
    layer.attach(new Map([['wheel', new Object3D()]]));
    layer.show(new Set(['wheel']));
    layer.setOccluded(new Set(['wheel']));
    expect(listener).toHaveBeenCalledTimes(3);
    layer.dispose();
  });

  it('counts every attach and show as a revision', () => {
    const layer = new LabelLayer(PARTS);
    const start = layer.revision;
    layer.attach(new Map([['wheel', new Object3D()]]));
    layer.show(new Set(['wheel']));
    layer.setOccluded(new Set(['wheel']));
    expect(layer.revision - start).toBe(2);
    layer.dispose();
  });

  it('places a label from its projected anchor and its measured text size', () => {
    const { resize, texts } = stubResizeObserver();
    const layer = new LabelLayer(PARTS);
    const spoke = new Object3D();
    spoke.position.set(3.5, 0, 0);
    spoke.updateMatrixWorld();
    layer.attach(new Map([['spoke', spoke]]));
    layer.setViewport(VIEWPORT);
    layer.show(new Set(['spoke']));
    spoke.updateMatrixWorld();
    const camera = frontCamera();
    layer.layout(camera);
    expect(sideOf(spoke)).toBe('right');
    const listener = vi.fn();
    layer.onChange(listener);
    resize([{ target: texts[1], borderBoxSize: [WIDE_TEXT] }]);
    expect(listener).toHaveBeenCalledTimes(1);
    layer.layout(camera);
    expect(sideOf(spoke)).toBe('left');
    layer.dispose();
  });

  it('keeps the last size of a label while it is hidden', () => {
    const { resize, texts } = stubResizeObserver();
    const layer = new LabelLayer(PARTS);
    const listener = vi.fn();
    layer.onChange(listener);
    resize([{ target: texts[0], borderBoxSize: [WIDE_TEXT] }]);
    resize([{ target: texts[0], borderBoxSize: [{ inlineSize: 0, blockSize: 0 }] }]);
    resize([{ target: texts[0], borderBoxSize: [WIDE_TEXT] }]);
    expect(listener).toHaveBeenCalledTimes(1);
    layer.dispose();
  });
});
