import { describe, expect, it } from 'vitest';
import { EJECT_MS, motionAt } from './motion';
import { caseStage, hammerStage, lockStage, roundStage } from './stages';

describe('hammer stage', () => {
  it('names each step of the hammer through the cycle', () => {
    expect([0, 4, 11, 15, 50, 91, 95].map((ms) => hammerStage(ms, 'open'))).toEqual([
      'falling',
      'struck',
      'struck',
      'cocking',
      'cocked',
      'falling',
      'held',
    ]);
  });

  it('leaves the hammer down on the pin with the port blocked', () => {
    expect([0, 11, 50, 95].map((ms) => hammerStage(ms, 'blocked'))).toEqual([
      'falling',
      'struck',
      'struck',
      'struck',
    ]);
  });
});

describe('lock, case and round stages', () => {
  const at = (ms: number) => motionAt(ms, 'open');

  it('locks, turns and opens the bolt', () => {
    expect([0, 8, 30, 87, 95].map((ms) => lockStage(at(ms)))).toEqual([
      'locked',
      'turning',
      'open',
      'turning',
      'locked',
    ]);
    expect(lockStage(motionAt(30, 'blocked'))).toBe('locked');
  });

  it('holds, throws and loses the empty case', () => {
    expect([10, EJECT_MS + 5, 60].map((ms) => caseStage(at(ms)))).toEqual([
      'held',
      'flying',
      'gone',
    ]);
    expect(caseStage(motionAt(60, 'blocked'))).toBe('held');
  });

  it('keeps the next round waiting, feeds it and chambers it', () => {
    expect([30, 60, 95].map((ms) => roundStage(at(ms)))).toEqual([
      'waiting',
      'feeding',
      'chambered',
    ]);
    expect(roundStage(motionAt(95, 'blocked'))).toBe('waiting');
  });
});
