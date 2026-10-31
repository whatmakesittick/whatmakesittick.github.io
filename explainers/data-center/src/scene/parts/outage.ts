import { clamp } from '@core/math';
import type { OutageReading, OutageState } from '../../ids';
import { OUTAGE_DRILL } from '../constants';

export interface OutageSample extends OutageReading {
  readonly elapsed: number;
  readonly active: boolean;
  readonly gensets: number;
}

export const RESTING_OUTAGE: OutageSample = {
  elapsed: 0,
  active: false,
  gensets: 0,
  source: 'grid',
  gridOn: true,
  generatorShare: 0,
  batteryShare: 0,
};

function ramp(seconds: number): number {
  return clamp(seconds / OUTAGE_DRILL.rampSeconds, 0, 1);
}

function gensetsAt(elapsed: number): number {
  return Math.min(ramp(elapsed), ramp(OUTAGE_DRILL.crankSeconds - elapsed));
}

function generatorShareAt(elapsed: number): number {
  const { crankSeconds, gridReturnSeconds, seconds } = OUTAGE_DRILL;
  if (elapsed < crankSeconds) return elapsed / crankSeconds;
  if (elapsed < gridReturnSeconds) return 1;
  return clamp((seconds - elapsed) / (seconds - gridReturnSeconds), 0, 1);
}

export function outageSampleAt(elapsed: number): OutageSample {
  if (elapsed < 0 || elapsed >= OUTAGE_DRILL.seconds) return RESTING_OUTAGE;
  const gridOn = elapsed >= OUTAGE_DRILL.gridReturnSeconds;
  const generatorShare = generatorShareAt(elapsed);
  return {
    elapsed,
    active: true,
    gensets: gensetsAt(elapsed),
    source: gridOn ? 'grid' : elapsed < OUTAGE_DRILL.crankSeconds ? 'battery' : 'generator',
    gridOn,
    generatorShare,
    batteryShare: gridOn ? 0 : 1 - generatorShare,
  };
}

export class OutageClock {
  private token: number;
  private elapsed = -1;

  constructor(state: OutageState) {
    this.token = state.token;
  }

  observe(state: OutageState): void {
    if (state.token === this.token) return;
    this.token = state.token;
    this.elapsed = 0;
  }

  step(deltaSeconds: number): OutageSample {
    if (this.elapsed < 0) return RESTING_OUTAGE;
    this.elapsed += deltaSeconds;
    const sample = outageSampleAt(this.elapsed);
    if (!sample.active) this.elapsed = -1;
    return sample;
  }
}
