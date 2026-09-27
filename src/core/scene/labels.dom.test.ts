import { Object3D } from 'three';
import { describe, expect, it } from 'vitest';
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
});
