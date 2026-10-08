import { HUB_HEIGHT_M, SHEAR_EXPONENT } from './constants';

export function windAtHeight(hubWind: number, heightM: number): number {
  return hubWind * (heightM / HUB_HEIGHT_M) ** SHEAR_EXPONENT;
}
