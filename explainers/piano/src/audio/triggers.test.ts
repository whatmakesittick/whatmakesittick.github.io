import { describe, expect, it } from 'vitest';
import { MOMENTS } from '../model';
import { damperDown, strikeCrossed } from './triggers';
import type { SoundSnapshot } from './triggers';

function snapshot(overrides: Partial<SoundSnapshot> = {}): SoundSnapshot {
  return {
    phase: 0,
    playing: true,
    preset: 'key',
    touch: 'medium',
    pedal: 'none',
    register: 'middle',
    view: { sound: true },
    ...overrides,
  };
}

function playingMove(from: number, to: number): boolean {
  return strikeCrossed(snapshot({ phase: from }), snapshot({ phase: to }));
}

function pausedMove(from: number, to: number): boolean {
  return strikeCrossed(
    snapshot({ phase: from, playing: false }),
    snapshot({ phase: to, playing: false }),
  );
}

describe('strike crossing while playing', () => {
  it('fires on a frame that passes the strike', () => {
    expect(playingMove(395, 405)).toBe(true);
  });

  it('stays quiet on frames before and after the strike', () => {
    expect(playingMove(380, 399)).toBe(false);
    expect(playingMove(401, 420)).toBe(false);
  });

  it('stays quiet across the loop wrap when the strike is not passed', () => {
    expect(playingMove(990, 10)).toBe(false);
  });

  it('fires on a frame that wraps the loop and still passes the strike', () => {
    expect(playingMove(950, 420)).toBe(true);
  });

  it('ignores a forward jump of half a cycle or more', () => {
    expect(playingMove(300, 900)).toBe(false);
    expect(playingMove(MOMENTS.strike - 100, MOMENTS.strike + 400)).toBe(false);
  });

  it('fires when a frame lands exactly on the strike', () => {
    expect(playingMove(390, MOMENTS.strike)).toBe(true);
  });

  it('does not fire again on the frame that leaves the strike', () => {
    expect(playingMove(MOMENTS.strike, 410)).toBe(false);
  });

  it('never fires on a backward move', () => {
    expect(playingMove(410, 390)).toBe(false);
  });
});

describe('strike crossing while paused', () => {
  it('fires on a scrub across the strike in either direction', () => {
    expect(pausedMove(350, 450)).toBe(true);
    expect(pausedMove(450, 350)).toBe(true);
  });

  it('counts the phase it lands on but not the phase it leaves', () => {
    expect(pausedMove(420, MOMENTS.strike)).toBe(true);
    expect(pausedMove(MOMENTS.strike, 380)).toBe(false);
    expect(pausedMove(MOMENTS.strike, 420)).toBe(false);
  });

  it('stays quiet on a step across the loop wrap', () => {
    expect(pausedMove(990, 40)).toBe(false);
    expect(pausedMove(20, 970)).toBe(false);
  });

  it('treats a step that pauses playback as a scrub', () => {
    const prev = snapshot({ phase: 450, playing: true });
    expect(strikeCrossed(prev, snapshot({ phase: 350, playing: false }))).toBe(true);
  });
});

describe('strike crossing on a chapter seek', () => {
  it('never fires when the preset changes in the same update', () => {
    const prev = snapshot({ phase: 390, preset: 'key' });
    expect(strikeCrossed(prev, snapshot({ phase: 410, preset: 'room' }))).toBe(false);
    const paused = { ...prev, playing: false };
    expect(strikeCrossed(paused, snapshot({ phase: 450, preset: 'room', playing: false }))).toBe(
      false,
    );
  });
});

describe('damper down', () => {
  it('lands on the strings at the damped moment', () => {
    expect(damperDown(snapshot({ phase: MOMENTS.damped - 10 }))).toBe(false);
    expect(damperDown(snapshot({ phase: MOMENTS.damped }))).toBe(true);
  });

  it('is off the strings while the key is held', () => {
    expect(damperDown(snapshot({ phase: MOMENTS.strike }))).toBe(false);
    expect(damperDown(snapshot({ phase: MOMENTS.checked }))).toBe(false);
  });

  it('is on the strings when the reader scrubs back early into the press', () => {
    expect(damperDown(snapshot({ phase: 50 }))).toBe(true);
    expect(damperDown(snapshot({ phase: 250 }))).toBe(false);
  });

  it('stays up with sustain past the release', () => {
    expect(damperDown(snapshot({ phase: MOMENTS.damped, pedal: 'sustain' }))).toBe(false);
    expect(damperDown(snapshot({ phase: 50, pedal: 'sustain' }))).toBe(false);
  });

  it('never falls in the treble, which has no damper', () => {
    expect(damperDown(snapshot({ phase: MOMENTS.damped, register: 'treble' }))).toBe(false);
    expect(damperDown(snapshot({ phase: 50, register: 'treble' }))).toBe(false);
  });
});
