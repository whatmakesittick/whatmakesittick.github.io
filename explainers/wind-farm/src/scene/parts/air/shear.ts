import { HUB_HEIGHT_M, SHEAR_EXPONENT, TIP_HEIGHT_M } from '../../../model/constants';
import { SHEAR_HEIGHTS_M } from '../../../model/layout';

export function shearSpeed(height: number): number {
  return (height / HUB_HEIGHT_M) ** SHEAR_EXPONENT;
}

export function shearArrowLength(height: number, longest: number): number {
  return (longest * shearSpeed(height)) / shearSpeed(TIP_HEIGHT_M);
}

export function shearArrows(longest: number) {
  return SHEAR_HEIGHTS_M.map((height) => ({
    height,
    length: shearArrowLength(height, longest),
    rate: shearSpeed(height),
  }));
}
