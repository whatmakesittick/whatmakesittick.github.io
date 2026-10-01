export const GRAVITATIONAL_CONSTANT = 6.674e-11;
export const LIGHT_SPEED = 299_792_458;
export const SOLAR_MASS_KG = 1.98847e30;
export const STANDARD_GRAVITY = 9.80665;

export const SGR_A_MASS_SOLAR = 4.297e6;
export const SGR_A_DISTANCE_LIGHT_YEARS = 26_700;

export function schwarzschildRadiusM(massKg: number): number {
  return (2 * GRAVITATIONAL_CONSTANT * massKg) / LIGHT_SPEED ** 2;
}

export const SGR_A_MASS_KG = SGR_A_MASS_SOLAR * SOLAR_MASS_KG;
export const SCHWARZSCHILD_RADIUS_M = schwarzschildRadiusM(SGR_A_MASS_KG);
export const RS_LIGHT_SECONDS = SCHWARZSCHILD_RADIUS_M / LIGHT_SPEED;

export const HORIZON_RADIUS = 1;
export const PHOTON_SPHERE_RADIUS = 1.5;
export const LAST_STABLE_ORBIT_RADIUS = 3;
export const RELEASE_RADIUS = 5;
export const SHIP_RADIUS = 20;
export const DISC_INNER_RADIUS = 3;
export const DISC_OUTER_RADIUS = 13;

export const FLASH_INTERVAL_S = 10;
export const BODY_LENGTH_M = 2;
