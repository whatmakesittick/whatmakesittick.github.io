import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mountSafeArea } from './safeArea';

class ManualResizeObserver {
  observe(): void {}

  disconnect(): void {}
}

const STAGE_TOP = 40;
const GAUGE = { top: 100, width: 180, height: 200 };
const DOCK_HEIGHT = 150;

function rect(partial: Partial<DOMRect>): DOMRect {
  return {
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: 0,
    height: 0,
    toJSON() {},
    ...partial,
  };
}

function mountShell(): HTMLElement {
  document.body.innerHTML =
    '<div data-stage><div id="scene"></div><div class="gauge"></div><div data-dock></div></div>';
  const stage = document.querySelector<HTMLElement>('[data-stage]')!;
  vi.spyOn(stage, 'getBoundingClientRect').mockReturnValue(rect({ top: STAGE_TOP }));
  const gauge = document.querySelector<HTMLElement>('.gauge')!;
  vi.spyOn(gauge, 'getBoundingClientRect').mockReturnValue(
    rect({
      top: GAUGE.top,
      bottom: GAUGE.top + GAUGE.height,
      width: GAUGE.width,
      height: GAUGE.height,
    }),
  );
  const dock = document.querySelector<HTMLElement>('[data-dock]')!;
  vi.spyOn(dock, 'getBoundingClientRect').mockReturnValue(rect({ height: DOCK_HEIGHT }));
  return document.querySelector<HTMLElement>('#scene')!;
}

describe('mountSafeArea', () => {
  beforeEach(() => {
    vi.stubGlobal('ResizeObserver', ManualResizeObserver);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
  });

  it('reserves the dock at the bottom and the gauge on the right by default', () => {
    const scene = mountShell();
    mountSafeArea(document);
    expect(scene.style.getPropertyValue('--scene-safe-bottom')).toBe(`${DOCK_HEIGHT}px`);
    expect(scene.style.getPropertyValue('--scene-safe-right')).toBe(`${GAUGE.width}px`);
    expect(scene.style.getPropertyValue('--scene-safe-top')).toBe('');
  });

  it('reserves the strip down to the bottom of the gauge when it sits on top', () => {
    const scene = mountShell();
    mountSafeArea(document, 'top');
    expect(scene.style.getPropertyValue('--scene-safe-top')).toBe(
      `${GAUGE.top + GAUGE.height - STAGE_TOP}px`,
    );
    expect(scene.style.getPropertyValue('--scene-safe-right')).toBe('');
  });

  it('reserves nothing on top while the gauge is hidden', () => {
    const scene = mountShell();
    const gauge = document.querySelector<HTMLElement>('.gauge')!;
    vi.spyOn(gauge, 'getBoundingClientRect').mockReturnValue(rect({}));
    mountSafeArea(document, 'top');
    expect(scene.style.getPropertyValue('--scene-safe-top')).toBe('0px');
  });
});
