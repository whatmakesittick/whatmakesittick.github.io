import { describe, expect, it } from 'vitest';
import type { IodineEvent, LandoltEvent } from '../ids';
import {
  IODINE_EVENT_S,
  LANDOLT_EVENT_S,
  OXYGEN_HOPS,
  writeIodineEvent,
  writeLandoltEvent,
} from './events';

const SWITCH_S = 10;

function landoltAt(seconds: number): LandoltEvent {
  const out: LandoltEvent = { active: false, cycle: 0, hop: 0 };
  writeLandoltEvent(seconds, SWITCH_S, out);
  return out;
}

function iodineAt(seconds: number): IodineEvent {
  const out: IodineEvent = { active: false, cycle: 0, stage: 'meet', progress: 0 };
  writeIodineEvent(seconds, SWITCH_S, out);
  return out;
}

describe('events', () => {
  it('runs both events from the end of the pour to the switch', () => {
    [0.5, SWITCH_S, SWITCH_S + 1].forEach((seconds) => {
      expect(landoltAt(seconds).active).toBe(false);
      expect(iodineAt(seconds).active).toBe(false);
    });
    expect(landoltAt(1).active).toBe(true);
    expect(iodineAt(SWITCH_S - 0.01).active).toBe(true);
  });

  it('hops three oxygen atoms per Landolt cycle', () => {
    expect(landoltAt(LANDOLT_EVENT_S).cycle).toBe(1);
    expect(landoltAt(LANDOLT_EVENT_S * 1.5).hop).toBeCloseTo(OXYGEN_HOPS / 2, 9);
    expect(landoltAt(LANDOLT_EVENT_S * 2 - 1e-6).hop).toBeLessThan(OXYGEN_HOPS);
  });

  it('walks the iodine event through meet, formed and eaten', () => {
    expect(iodineAt(IODINE_EVENT_S * 1.2)).toMatchObject({ cycle: 1, stage: 'meet' });
    expect(iodineAt(IODINE_EVENT_S * 1.2).progress).toBeCloseTo(0.5, 9);
    expect(iodineAt(IODINE_EVENT_S * 1.5)).toMatchObject({ stage: 'formed' });
    expect(iodineAt(IODINE_EVENT_S * 1.5).progress).toBeCloseTo(0.5, 9);
    expect(iodineAt(IODINE_EVENT_S * 1.8)).toMatchObject({ stage: 'eaten' });
    expect(iodineAt(IODINE_EVENT_S * 1.8).progress).toBeCloseTo(0.5, 9);
  });
});
