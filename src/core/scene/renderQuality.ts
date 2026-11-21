import { MAX_PIXEL_RATIO, SOFTWARE_MAX_PIXEL_RATIO } from './constants';

export interface RenderQuality {
  readonly antialias: boolean;
  readonly maxPixelRatio: number;
}

const HARDWARE_QUALITY: RenderQuality = { antialias: true, maxPixelRatio: MAX_PIXEL_RATIO };
const SOFTWARE_QUALITY: RenderQuality = {
  antialias: false,
  maxPixelRatio: SOFTWARE_MAX_PIXEL_RATIO,
};

function hasHardwareWebgl(): boolean {
  const context = document
    .createElement('canvas')
    .getContext('webgl2', { failIfMajorPerformanceCaveat: true });
  context?.getExtension('WEBGL_lose_context')?.loseContext();
  return context !== null;
}

export function detectRenderQuality(): RenderQuality {
  return hasHardwareWebgl() ? HARDWARE_QUALITY : SOFTWARE_QUALITY;
}
