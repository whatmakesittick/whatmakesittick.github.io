import type { NudgeState } from '../../ids';
import { NUDGE } from '../constants';
import type { NudgeSample } from './context';

const TURN = Math.PI * 2;

export const RESTING_NUDGE: NudgeSample = { id: null, gapMm: 0, lateralMm: 0, active: false };

export class NudgeResponse {
  private token: number;
  private id: NudgeState['id'] = null;
  private elapsed: number = NUDGE.settleSeconds;

  constructor(nudge: NudgeState) {
    this.token = nudge.token;
  }

  get running(): boolean {
    return this.elapsed < NUDGE.settleSeconds;
  }

  observe(nudge: NudgeState): void {
    if (nudge.token === this.token) return;
    this.token = nudge.token;
    this.id = nudge.id;
    this.elapsed = nudge.id ? 0 : NUDGE.settleSeconds;
  }

  step(deltaSeconds: number): NudgeSample {
    if (!this.running) return RESTING_NUDGE;
    this.elapsed = Math.min(NUDGE.settleSeconds, this.elapsed + deltaSeconds);
    if (!this.running) return RESTING_NUDGE;
    const swing =
      Math.exp(-this.elapsed / NUDGE.decaySeconds) *
      Math.sin(TURN * NUDGE.frequencyHz * this.elapsed);
    return {
      id: this.id,
      gapMm: this.id === 'bump' ? swing * NUDGE.bumpGapMm : 0,
      lateralMm: this.id === 'gust' ? swing * NUDGE.gustLateralMm : 0,
      active: true,
    };
  }
}
