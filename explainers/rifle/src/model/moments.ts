import type { MomentId } from '../ids';
import { EJECT_MS } from './motion';
import {
  EXIT_MS,
  LOCKED_MS,
  PEAK_MS,
  PORT_MS,
  START_MS,
  STRIKE_MS,
  STRIP_MS,
  UNLOCKED_MS,
} from './timing';

export const MOMENTS: Readonly<Record<MomentId, number>> = {
  strike: STRIKE_MS,
  start: START_MS,
  peak: PEAK_MS,
  port: PORT_MS,
  exit: EXIT_MS,
  unlock: UNLOCKED_MS,
  eject: EJECT_MS,
  strip: STRIP_MS,
  lock: LOCKED_MS,
};
