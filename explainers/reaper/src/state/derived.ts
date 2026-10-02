import type { PlaybackState } from '@core/explainer';
import type {
  FlightReading,
  LinkMode,
  LoadId,
  SensorModeId,
  SensorReading,
  StrikeReading,
} from '../ids';
import { flightAt, fuelAt, linkAt, minutesAt, sensorAt, strikeAt } from '../model';
import type { FuelReading } from '../model';
import type { ReaperFields } from './store';

type MissionSource = Pick<PlaybackState, 'phase'> & Pick<ReaperFields, 'sensorMode' | 'load'>;

export interface MissionReading {
  clock: number;
  flight: FlightReading;
  strike: StrikeReading;
  sensor: SensorReading;
  link: LinkMode;
  fuel: FuelReading;
}

interface Remembered {
  phase: number;
  sensorMode: SensorModeId;
  load: LoadId;
  reading: MissionReading;
}

function readingAt(phase: number, sensorMode: SensorModeId, load: LoadId): MissionReading {
  const clock = minutesAt(phase);
  return {
    clock,
    flight: flightAt(phase),
    strike: strikeAt(phase, load),
    sensor: sensorAt(phase, sensorMode, load),
    link: linkAt(clock),
    fuel: fuelAt(phase, load),
  };
}

let last: Remembered | null = null;

function isRemembered({ phase, sensorMode, load }: MissionSource): boolean {
  return last?.phase === phase && last.sensorMode === sensorMode && last.load === load;
}

export function missionAt(source: MissionSource): Readonly<MissionReading> {
  if (!last || !isRemembered(source)) {
    const { phase, sensorMode, load } = source;
    last = { phase, sensorMode, load, reading: readingAt(phase, sensorMode, load) };
  }
  return last.reading;
}
