import type { Disposer } from '@core/ui/disposers';
import { mountLiveReadouts } from '@core/ui/liveReadouts';
import { GEAR_RATIO, GENERATOR_VOLTS, generatorRpm } from '../model';
import { liveReading } from '../state';
import type { WindFarmStore } from '../state';
import {
  formatBrake,
  formatDegrees,
  formatGearRatio,
  formatGeneratorRpm,
  formatRpm,
  formatVolts,
} from './format';

export function mountNacelleReadouts(root: Document, store: WindFarmStore): Disposer {
  return mountLiveReadouts(root, store, {
    shaftRpm: (state) => formatRpm(liveReading(state).operating.rpm),
    generatorRpm: (state) => formatGeneratorRpm(generatorRpm(liveReading(state).operating.rpm)),
    gearRatio: () => formatGearRatio(GEAR_RATIO),
    pitchAngle: (state) => formatDegrees(liveReading(state).operating.pitchDeg),
    brake: (state) => formatBrake(liveReading(state).operating.braked),
    generatorVolts: () => formatVolts(GENERATOR_VOLTS),
  });
}
