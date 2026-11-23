import type { Figure } from '@core/figure';
import {
  labelAspect,
  labelFields as fieldsOf,
  labelLayout as layoutOf,
} from '@core/figure/body/label';
import type { LabelLayout } from '@core/figure/body/label';
import type { RestFrame } from '@core/figure/body/restFrame';
import { CAP, CHANNELS, STRAP, hemsOf } from './regions';
import type { GarmentFields } from './regions';

const CAP_CHANNEL = 1;
const STRAP_CHANNEL = 3;

export { LABEL_CHANNELS } from '@core/figure/body/label';
export type { LabelLayout } from '@core/figure/body/label';

export const LABEL_ATTRIBUTE = 'garmentLabel';

export const LABEL = {
  length: 0.085,
  height: 0.028,
  clearance: 0.008,
} as const;

export const LABEL_ASPECT = labelAspect(LABEL);

export function labelLayout(figure: Figure, fields: GarmentFields, frame: RestFrame): LabelLayout {
  const { head } = hemsOf(frame);
  return layoutOf(figure, {
    head,
    dimensions: LABEL,
    stripeHalfWidth: CAP.stripeHalfWidth,
    coverAt: (blend) => {
      const distance = (channel: number) =>
        blend((corner) => fields.distances[corner * CHANNELS + channel]);
      const strapAlong = blend((corner) => fields.extents[corner * CHANNELS]);
      const strapEdge = Math.min(STRAP.halfWidth - Math.abs(distance(STRAP_CHANNEL)), strapAlong);
      return { capped: distance(CAP_CHANNEL) > 0, strapped: strapEdge > 0 };
    },
  });
}

export function labelFields(figure: Figure, frame: RestFrame, layout: LabelLayout): Float32Array {
  return fieldsOf(figure, hemsOf(frame).head, layout);
}
