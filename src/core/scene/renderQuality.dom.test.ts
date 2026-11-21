import { afterEach, describe, expect, it, vi } from 'vitest';
import { MAX_PIXEL_RATIO, SOFTWARE_MAX_PIXEL_RATIO } from './constants';
import { detectRenderQuality } from './renderQuality';

function stubContext(context: unknown) {
  return vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context as never);
}

describe('detectRenderQuality', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('keeps antialiasing and the full pixel ratio on a hardware context', () => {
    const loseContext = vi.fn();
    const getContext = stubContext({ getExtension: () => ({ loseContext }) });
    expect(detectRenderQuality()).toEqual({ antialias: true, maxPixelRatio: MAX_PIXEL_RATIO });
    expect(getContext).toHaveBeenCalledWith('webgl2', { failIfMajorPerformanceCaveat: true });
    expect(loseContext).toHaveBeenCalledOnce();
  });

  it('drops antialiasing and caps the pixel ratio when WebGL runs in software', () => {
    stubContext(null);
    expect(detectRenderQuality()).toEqual({
      antialias: false,
      maxPixelRatio: SOFTWARE_MAX_PIXEL_RATIO,
    });
  });
});
