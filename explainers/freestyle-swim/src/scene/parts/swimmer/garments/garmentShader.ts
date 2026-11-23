import { createGarmentPatcher, paintCall } from '@core/figure/body/garmentShader';
import { GARMENT_ROUGHNESS } from '../../../finishes';
import { LABEL_ATTRIBUTE } from './label';
import { BAND, CAP, STRAP } from './regions';

export const GARMENT_ATTRIBUTES = { distances: 'garments', extents: 'garmentExtents' } as const;

const STRAP_GARMENT = 3;
const SUIT = 0;
const CAP_GARMENT = 1;
const STRIPE = 2;
const BAND_GARMENT = 4;

function glsl(value: number): string {
  return value.toFixed(4);
}

const PAINT = [
  paintCall(SUIT, 'vGarments.x'),
  paintCall(CAP_GARMENT, 'vGarments.y'),
  paintCall(STRIPE, `min(${glsl(CAP.stripeHalfWidth)} - abs(vGarments.z), vGarments.y)`),
  paintCall(STRAP_GARMENT, `min(${glsl(STRAP.halfWidth)} - abs(vGarments.w), vGarmentExtents.x)`),
  paintCall(
    BAND_GARMENT,
    `min(${glsl(BAND.halfWidth)} - abs(vGarmentExtents.y), vGarmentExtents.z)`,
  ),
].join('\n');

export const applyGarments = createGarmentPatcher({
  attributes: GARMENT_ATTRIBUTES,
  roughness: GARMENT_ROUGHNESS,
  paint: PAINT,
  label: {
    attribute: LABEL_ATTRIBUTE,
    garment: STRAP_GARMENT,
    coverGap: 'vGarments.y',
    side: 'vGarments.z',
  },
});
