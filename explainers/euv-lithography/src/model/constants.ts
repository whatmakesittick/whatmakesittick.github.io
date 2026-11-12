import type { MachineId, OpticsId } from '../ids';

export const WAVELENGTH_NM = 13.5;
export const DROPLETS_PER_SECOND = 50_000;
export const PULSES_PER_DROPLET = 2;
export const DROPLET_UM = 30;
export const FLATTENED_UM = 100;
export const HAIR_UM = 50;
export const DROPLET_SPEED_MS = 70;
export const DROPLET_FLIGHT_M = 1.4;
export const REFLECTIVITY = 0.7;
export const BOUNCES = 11;
export const LIGHT_SPEED = 299_792_458;
export const SECONDS_PER_HOUR = 3600;

export const PREPULSE_DELAY_S = 2e-6;
export const MAIN_PULSE_S = 20e-9;

export const MACHINE_OPTICS: Readonly<Record<MachineId, OpticsId>> = {
  nxe3600d: 'na033',
  nxe3800e: 'na033',
  exe5000: 'na055',
};

export const MASK_TILT_DEG: Readonly<Record<OpticsId, number>> = { na033: 6, na055: 5.4 };
export const FIELDS_PER_WAFER: Readonly<Record<OpticsId, number>> = { na033: 78, na055: 156 };

export const WAFERS_PER_HOUR: Readonly<Record<MachineId, number>> = {
  nxe3600d: 160,
  nxe3800e: 220,
  exe5000: 150,
};

export const MASK_PLATE_M = 0.152;
export const MASK_PATTERN_M = { width: 0.104, height: 0.132 } as const;
export const WAFER_DIAMETER_M = 0.3;
