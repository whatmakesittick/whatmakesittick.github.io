export const FLIGHT_SPEEDS_MPS = [300, 450] as const;
export const TARGET_RANGE_KM = { min: 8, max: 11, step: 0.5, default: 8 } as const;

const METRES_PER_KM = 1000;

export interface FlightSeconds {
  fast: number;
  slow: number;
}

export function flightSeconds(rangeKm: number): FlightSeconds {
  const metres = rangeKm * METRES_PER_KM;
  const [slowSpeed, fastSpeed] = FLIGHT_SPEEDS_MPS;
  return { fast: metres / fastSpeed, slow: metres / slowSpeed };
}
