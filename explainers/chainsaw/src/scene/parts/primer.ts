import type { StartReading } from '../../ids';

const PRESSED_SHARE = 0.5;
const FUEL_FROM_PRESS = 2;
const BEFORE_PRIMER: ReadonlySet<StartReading['step']> = new Set([
  'brake',
  'choke',
  'decompression',
]);

export class PrimerFill {
  private presses = 0;
  private held = false;

  primed(start: StartReading): boolean {
    this.count(start);
    if (start.engine !== 'stopped') return true;
    if (!start.starting || BEFORE_PRIMER.has(start.step)) return false;
    return start.step !== 'primer' || this.presses >= FUEL_FROM_PRESS;
  }

  private count(start: StartReading): void {
    if (!start.starting || start.step !== 'primer') {
      this.presses = 0;
      this.held = false;
      return;
    }
    const held = start.primerSqueeze >= PRESSED_SHARE;
    if (held && !this.held) this.presses += 1;
    this.held = held;
  }
}
