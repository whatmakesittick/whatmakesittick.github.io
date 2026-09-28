import { smoothstep } from '@core/math';
import { SEABED_Y } from '../../model/scale';
import { RELIEF } from '../constants';

export function seabedRelief(x: number, z: number): number {
  const pad = smoothstep(Math.hypot(x, z), RELIEF.padHalf, RELIEF.padHalf + RELIEF.padBlend);
  const swell = RELIEF.waves.reduce(
    (sum, wave) => sum + wave.weight * Math.sin(wave.x * x + wave.z * z),
    0,
  );
  return RELIEF.amplitude * swell * pad;
}

export function seabedY(x: number, z: number): number {
  return SEABED_Y + seabedRelief(x, z);
}
