import type { CanvasTexture } from 'three';
import { labelTexture as drawLabelTexture } from '@core/figure/body/labelTexture';
import { LABEL_ASPECT } from './label';

export const LABEL_TEXT = 'wmit';

export function labelTexture(): CanvasTexture | undefined {
  return drawLabelTexture({ text: LABEL_TEXT, aspect: LABEL_ASPECT });
}
