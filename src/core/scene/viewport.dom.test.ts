import { afterEach, describe, expect, it, vi } from 'vitest';

const calls: string[] = [];
const created: { antialias?: boolean }[] = [];
const pixelRatios: number[] = [];
const quality = { antialias: true, maxPixelRatio: 2 };

vi.mock('./renderQuality', () => ({ detectRenderQuality: () => quality }));

vi.mock('three', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  class FakeRenderer {
    constructor(parameters: { antialias?: boolean }) {
      created.push(parameters);
    }
    domElement = document.createElement('canvas');
    debug = { checkShaderErrors: false };
    outputColorSpace = '';
    toneMapping = 0;
    toneMappingExposure = 1;
    setPixelRatio = vi.fn((ratio: number) => pixelRatios.push(ratio));
    setSize = vi.fn();
    render = vi.fn();
    dispose = vi.fn(() => calls.push('dispose'));
    forceContextLoss = vi.fn(() => calls.push('forceContextLoss'));
  }
  return { ...actual, WebGLRenderer: FakeRenderer };
});

import { createViewport } from './viewport';

const HIGH_DENSITY_SCREEN = 3;

function mountViewport() {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe(): void {}
      disconnect(): void {}
    },
  );
  const container = document.createElement('div');
  document.body.append(container);
  return { container, viewport: createViewport(container) };
}

describe('viewport', () => {
  afterEach(() => {
    calls.length = 0;
    created.length = 0;
    pixelRatios.length = 0;
    Object.assign(quality, { antialias: true, maxPixelRatio: 2 });
    vi.unstubAllGlobals();
  });

  it('releases the WebGL context after disposing the renderer', () => {
    const { container, viewport } = mountViewport();
    viewport.dispose();
    expect(calls).toEqual(['dispose', 'forceContextLoss']);
    expect(container.querySelector('.scene-root')).toBeNull();
  });

  it('draws at the detected render quality', () => {
    vi.stubGlobal('devicePixelRatio', HIGH_DENSITY_SCREEN);
    Object.assign(quality, { antialias: false, maxPixelRatio: 1 });
    const { viewport } = mountViewport();
    viewport.dispose();
    expect(created).toEqual([expect.objectContaining({ antialias: false })]);
    expect(pixelRatios).toEqual([1]);
  });
});
