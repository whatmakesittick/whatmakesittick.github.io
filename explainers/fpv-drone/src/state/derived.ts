import type { PlaybackState } from '@core/explainer';
import type { BatteryReading, LinkReading, MotorReading } from '../ids';
import { batteryAt, flightAt, linkAt, motorsAt } from '../model';
import type { FlightMotion } from '../model';
import type { FpvFields } from './store';

export type SortieSource = Pick<PlaybackState, 'phase'> & Pick<FpvFields, 'payload'>;

export interface SortieReading {
  flight: FlightMotion;
  motors: MotorReading;
  battery: BatteryReading;
  link: LinkReading;
}

interface Remembered extends SortieSource {
  reading: SortieReading;
}

function readingAt(phase: number, payload: number): SortieReading {
  const flight = flightAt(phase);
  return {
    flight,
    motors: motorsAt(flight, payload),
    battery: batteryAt(phase, payload),
    link: linkAt(flight.position),
  };
}

let last: Remembered | null = null;

function isRemembered({ phase, payload }: SortieSource): boolean {
  return last?.phase === phase && last.payload === payload;
}

export function sortieAt(source: SortieSource): Readonly<SortieReading> {
  if (!last || !isRemembered(source)) {
    const { phase, payload } = source;
    last = { phase, payload, reading: readingAt(phase, payload) };
  }
  return last.reading;
}
