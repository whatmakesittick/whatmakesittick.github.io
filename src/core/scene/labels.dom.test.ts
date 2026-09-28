import { Object3D } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { LabelLayer } from './labels';

const PARTS = {
  wheel: { labelKey: 'parts.wheel', side: 'left' },
  spoke: { labelKey: 'parts.spoke', side: 'right' },
} as const;

describe('LabelLayer', () => {
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
});
