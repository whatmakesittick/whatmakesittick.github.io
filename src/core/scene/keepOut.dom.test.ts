import { describe, expect, it } from 'vitest';
import { keepOutAreas, keepOutOverlays } from './keepOut';

function rectAt(left: number, top: number, width: number, height: number): DOMRect {
  return new DOMRect(left, top, width, height);
}

function element(rect: DOMRect): Element {
  const node = document.createElement('div');
  node.getBoundingClientRect = () => rect;
  return node;
}

describe('label keep-out areas', () => {
  it('finds the expand button, the gauge and the dock of the stage around the scene', () => {
    document.body.innerHTML = `
      <section data-stage>
        <div id="scene"></div>
        <button class="stage-expand"></button>
        <aside data-gauge></aside>
        <div data-dock></div>
      </section>
      <button class="stage-expand"></button>`;
    const scene = document.getElementById('scene');
    if (!scene) throw new Error('No scene');
    expect(keepOutOverlays(scene).map((node) => node.tagName)).toEqual(['BUTTON', 'ASIDE', 'DIV']);
  });

  it('finds nothing outside a stage', () => {
    expect(keepOutOverlays(document.createElement('div'))).toEqual([]);
  });

  it('measures each overlay from the top left of the label frame and skips hidden ones', () => {
    const frame = rectAt(100, 50, 400, 300);
    const areas = keepOutAreas(frame, [
      element(rectAt(436, 60, 44, 44)),
      element(rectAt(0, 0, 0, 0)),
    ]);
    expect(areas).toEqual([{ left: 336, right: 380, top: 10, bottom: 54 }]);
  });
});
