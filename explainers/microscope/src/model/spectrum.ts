import { clamp } from '@core/math';

export type Rgb = readonly [red: number, green: number, blue: number];

interface Band {
  from: number;
  to: number;
  color(share: number): Rgb;
}

const DISPLAY_GAMMA = 0.8;

const BANDS: readonly Band[] = [
  { from: 380, to: 440, color: (share) => [1 - share, 0, 1] },
  { from: 440, to: 490, color: (share) => [0, share, 1] },
  { from: 490, to: 510, color: (share) => [0, 1, 1 - share] },
  { from: 510, to: 580, color: (share) => [share, 1, 0] },
  { from: 580, to: 645, color: (share) => [1, 1 - share, 0] },
  { from: 645, to: 780, color: () => [1, 0, 0] },
];

export function spectralColor(wavelength: number): Rgb {
  const nanometres = clamp(wavelength, BANDS[0].from, BANDS[BANDS.length - 1].to);
  const band = BANDS.find((candidate) => nanometres <= candidate.to) ?? BANDS[BANDS.length - 1];
  const share = (nanometres - band.from) / (band.to - band.from);
  const [red, green, blue] = band.color(share);
  return [red ** DISPLAY_GAMMA, green ** DISPLAY_GAMMA, blue ** DISPLAY_GAMMA];
}
