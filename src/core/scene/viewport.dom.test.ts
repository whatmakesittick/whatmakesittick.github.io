import { afterEach, describe, expect, it, vi } from 'vitest';

const calls: string[] = [];

vi.mock('three', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  class FakeRenderer {
    domElement = document.createElement('canvas');
    debug = { checkShaderErrors: false };
    outputColorSpace = '';
    toneMapping = 0;
    toneMappingExposure = 1;
    setPixelRatio = vi.fn();
    setSize = vi.fn();
    render = vi.fn();
    dispose = vi.fn(() => calls.push('dispose'));
    forceContextLoss = vi.fn(() => calls.push('forceContextLoss'));
  }
  return { ...actual, WebGLRenderer: FakeRenderer };
});

import { createViewport } from './viewport';

describe('viewport', () => {
  afterEach(() => {
    calls.length = 0;
    vi.unstubAllGlobals();
  });

  it('releases the WebGL context after disposing the renderer', () => {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe(): void {}
        disconnect(): void {}
      },
    );
    const container = document.createElement('div');
    document.body.append(container);
    const viewport = createViewport(container);
    viewport.dispose();
    expect(calls).toEqual(['dispose', 'forceContextLoss']);
    expect(container.querySelector('.scene-root')).toBeNull();
  });
});
