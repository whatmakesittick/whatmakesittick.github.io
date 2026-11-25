import { Vector3 } from 'three';
import type { CanvasTexture } from 'three';
import type { Figure } from '@core/figure';
import { labelAspect } from '@core/figure/body/label';
import { labelTexture } from '@core/figure/body/labelTexture';
import type { RestFrame } from '@core/figure/body/restFrame';

export const CAP_LABEL_ATTRIBUTE = 'capLabel';
export const CAP_LABEL_CHANNELS = 2;
const CAP_LABEL_TEXT = 'wmit';

const AXES = 3;
const UNIT_CENTRE = 0.5;

const CAP_LABEL = {
  length: 0.046,
  height: 0.015,
  aboveEyeM: 0.058,
  behindHeadM: 0.004,
} as const;

export function capLabelFields(figure: Figure, frame: RestFrame): Float32Array {
  const centre = new Vector3(
    0,
    frame.joint('r_eye').y + CAP_LABEL.aboveEyeM,
    frame.joint('c_head').z - CAP_LABEL.behindHeadM,
  );
  const fields = new Float32Array(figure.vertexCount * CAP_LABEL_CHANNELS);
  for (let v = 0; v < figure.vertexCount; v++) {
    const z = figure.restPositions[v * AXES + 2];
    const y = figure.restPositions[v * AXES + 1];
    fields[v * CAP_LABEL_CHANNELS] = (z - centre.z) / CAP_LABEL.length + UNIT_CENTRE;
    fields[v * CAP_LABEL_CHANNELS + 1] = (y - centre.y) / CAP_LABEL.height + UNIT_CENTRE;
  }
  return fields;
}

export function capLabelTexture(): CanvasTexture | undefined {
  return labelTexture({
    text: CAP_LABEL_TEXT,
    aspect: labelAspect({ ...CAP_LABEL, clearance: 0 }),
  });
}
