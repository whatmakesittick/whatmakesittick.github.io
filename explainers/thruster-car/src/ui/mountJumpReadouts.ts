import type { Disposer } from '@core/ui/disposers';
import { mountRangeWidget } from '@core/ui/rangeWidget';
import type { GasId } from '../ids';
import {
  LEAP_THRUST_N,
  RUN_UP_SPEED_MS,
  airTimeFrom,
  leapAccel,
  leapBurnSeconds,
  leapSpeedFor,
  massFlow,
} from '../model';
import { CALCULATOR_RANGES } from '../state';
import type { ThrusterCarStore } from '../state';
import {
  HUNDREDTHS,
  TENTHS,
  WHOLE,
  formatKilograms,
  formatMetres,
  formatSeconds,
  formatSpeedMs,
} from './format';

const JUMP_HEIGHT_CONTROL = 'jumpHeight';
const LEAP_ACCEL = leapAccel(LEAP_THRUST_N);

type SelectedJump = readonly [jumpHeight: number, gas: GasId];

interface Leap {
  upSpeed: number;
  burnSeconds: number;
  airSeconds: number;
}

function leapFor(height: number): Leap {
  const upSpeed = leapSpeedFor(height, LEAP_ACCEL);
  const burnSeconds = leapBurnSeconds(height, LEAP_ACCEL);
  const burnRise = 0.5 * LEAP_ACCEL * burnSeconds ** 2;
  return { upSpeed, burnSeconds, airSeconds: airTimeFrom(burnRise, upSpeed) };
}

function jumpRange({ burnSeconds, airSeconds }: Leap): number {
  return RUN_UP_SPEED_MS * (burnSeconds + airSeconds);
}

export function mountJumpReadouts(root: Document, store: ThrusterCarStore): Disposer {
  return mountRangeWidget(root, store, {
    control: JUMP_HEIGHT_CONTROL,
    range: CALCULATOR_RANGES.jumpHeight,
    select: (state): SelectedJump => [state.jumpHeight, state.gas],
    value: ([height]) => height,
    format: ([height]) => formatMetres(height, TENTHS),
    set: (state, height) => state.setJumpHeight(height),
    readouts: {
      leapSpeed: ([height]) => formatSpeedMs(leapFor(height).upSpeed, TENTHS),
      leapBurn: ([height]) => formatSeconds(leapFor(height).burnSeconds, HUNDREDTHS),
      leapGas: ([height, gas]) =>
        formatKilograms(massFlow(LEAP_THRUST_N, gas) * leapFor(height).burnSeconds),
      jumpAir: ([height]) => formatSeconds(leapFor(height).airSeconds, TENTHS),
      jumpRange: ([height]) => formatMetres(jumpRange(leapFor(height)), WHOLE),
    },
  });
}
