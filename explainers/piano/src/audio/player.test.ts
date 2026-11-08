import { afterEach, describe, expect, it, vi } from 'vitest';
import { DAMPER_TIME_CONSTANT_S, THUMP, noteSpec } from '../model';
import type { NoteSpec } from '../model';
import {
  FLOOR_GAIN,
  LIMITER_SETTINGS,
  MASTER_GAIN,
  MAX_OSCILLATORS_PER_VOICE,
  PHASE_STEPS,
  RESTRIKE_TIME_CONSTANT_S,
  SOUND_OFF_FADE_S,
  STOP_DELAY_S,
  VOICE_CAP,
  createPianoPlayer,
  decayPoints,
} from './player';
import type { SoundDocument } from './player';

interface ParamCall {
  method: string;
  value: number;
  time: number;
  timeConstant?: number;
}

class FakeParam {
  value: number;
  readonly calls: ParamCall[] = [];

  constructor(value = 0) {
    this.value = value;
  }

  setValueAtTime(value: number, time: number) {
    this.calls.push({ method: 'set', value, time });
  }

  linearRampToValueAtTime(value: number, time: number) {
    this.calls.push({ method: 'linear', value, time });
  }

  exponentialRampToValueAtTime(value: number, time: number) {
    this.calls.push({ method: 'exponential', value, time });
  }

  setTargetAtTime(value: number, time: number, timeConstant: number) {
    this.calls.push({ method: 'target', value, time, timeConstant });
  }

  cancelScheduledValues(time: number) {
    this.calls.push({ method: 'cancel', value: Number.NaN, time });
  }
}

class FakeNode {
  readonly targets: object[] = [];
  connect<T extends object>(target: T): T {
    this.targets.push(target);
    return target;
  }
  disconnect() {}
}

class FakeGain extends FakeNode {
  readonly gain = new FakeParam(1);
}

class FakeSource extends FakeNode {
  stopAt: number | undefined;
  startedAt: number | undefined;
  onended: (() => void) | null = null;
  start(when: number) {
    this.startedAt = when;
  }
  stop(when: number) {
    this.stopAt = when;
  }
}

class FakeOscillator extends FakeSource {
  readonly frequency = new FakeParam();
  readonly detune = new FakeParam();
  wave: object | undefined;
  setPeriodicWave(wave: object) {
    this.wave = wave;
  }
}

class FakeBufferSource extends FakeSource {
  buffer: object | null = null;
}

class FakeFilter extends FakeNode {
  type = 'lowpass';
  readonly frequency = new FakeParam();
}

class FakeCompressor extends FakeNode {
  readonly threshold = new FakeParam();
  readonly knee = new FakeParam();
  readonly ratio = new FakeParam();
  readonly attack = new FakeParam();
  readonly release = new FakeParam();
}

class FakeContext {
  currentTime = 0;
  state: AudioContextState;
  readonly sampleRate = 48000;
  readonly destination = new FakeNode();
  readonly gains: FakeGain[] = [];
  readonly oscillators: FakeOscillator[] = [];
  readonly bufferSources: FakeBufferSource[] = [];
  readonly compressors: FakeCompressor[] = [];
  readonly waveOptions: (PeriodicWaveConstraints | undefined)[] = [];
  readonly resume = vi.fn(async () => {
    if (!this.blocked) this.state = 'running';
  });
  readonly suspend = vi.fn(async () => {
    this.state = 'suspended';
  });
  readonly close = vi.fn(async () => {
    this.state = 'closed';
  });
  blocked: boolean;

  constructor(state: AudioContextState = 'running') {
    this.state = state;
    this.blocked = state === 'suspended';
  }

  createGain() {
    return this.track(this.gains, new FakeGain());
  }
  createOscillator() {
    return this.track(this.oscillators, new FakeOscillator());
  }
  createBufferSource() {
    return this.track(this.bufferSources, new FakeBufferSource());
  }
  createBiquadFilter() {
    return new FakeFilter();
  }
  createDynamicsCompressor() {
    return this.track(this.compressors, new FakeCompressor());
  }
  createPeriodicWave(_real: Float32Array, _imag: Float32Array, options?: PeriodicWaveConstraints) {
    this.waveOptions.push(options);
    return {};
  }
  createBuffer(_channels: number, length: number) {
    const samples = new Float32Array(length);
    return { getChannelData: () => samples };
  }

  liveOscillators(): number {
    return this.oscillators.filter(
      (oscillator) => oscillator.stopAt === undefined || oscillator.stopAt > this.currentTime,
    ).length;
  }

  private track<T>(list: T[], node: T): T {
    list.push(node);
    return node;
  }
}

function fakeRoot() {
  const target = new EventTarget();
  return Object.assign(target, { visibilityState: 'visible' as DocumentVisibilityState });
}

function setup(state: AudioContextState = 'running') {
  const context = new FakeContext(state);
  const root = fakeRoot();
  const createContext = vi.fn(() => context as unknown as AudioContext);
  const player = createPianoPlayer({ createContext, root: root as unknown as SoundDocument });
  return { context, root, player, createContext };
}

function voiceOutputs(context: FakeContext): FakeGain[] {
  const master = context.gains.find((gain) => gain.targets.includes(context.compressors[0]));
  return context.gains.filter((gain) => master && gain.targets.includes(master));
}

function wideSpec(): NoteSpec {
  const spec = noteSpec('hard', 'none', 'middle');
  const partials = Array.from({ length: 20 }, (_, index) => ({
    n: index + 1,
    hz: spec.partials[0].hz * (index + 1),
    amplitude: 1 / 20,
  }));
  return { ...spec, partials };
}

function thumpGainCalls(context: FakeContext): ParamCall[][] {
  const filters = context.bufferSources.map((source) => source.targets[0] as FakeNode);
  return filters.map((filter) => (filter.targets[0] as FakeGain).gain.calls);
}

const C4 = noteSpec('medium', 'none', 'middle');

afterEach(() => {
  vi.useRealTimers();
});

describe('piano player context', () => {
  it('creates the context lazily on the first sound on', () => {
    const { player, createContext } = setup();
    player.play(C4);
    expect(createContext).not.toHaveBeenCalled();
    player.on();
    player.on();
    expect(createContext).toHaveBeenCalledTimes(1);
  });

  it('sends the master gain through a limiter to the speakers', () => {
    const { context, player } = setup();
    player.on();
    const [limiter] = context.compressors;
    expect(limiter.threshold.value).toBe(LIMITER_SETTINGS.thresholdDb);
    expect(limiter.knee.value).toBe(0);
    expect(limiter.ratio.value).toBe(20);
    expect(limiter.attack.value).toBe(0.003);
    expect(limiter.release.value).toBe(0.25);
    expect(limiter.targets).toContain(context.destination);
    const master = context.gains.find((gain) => gain.targets.includes(limiter));
    expect(master?.gain.value).toBe(MASTER_GAIN);
  });

  it('resumes a suspended context on the next pointer or key press', () => {
    const { context, root, player } = setup('suspended');
    player.on();
    expect(context.resume).toHaveBeenCalledTimes(1);
    context.blocked = false;
    root.dispatchEvent(new Event('pointerdown'));
    expect(context.resume).toHaveBeenCalledTimes(2);
    root.dispatchEvent(new Event('keydown'));
    expect(context.resume).toHaveBeenCalledTimes(2);
  });

  it('suspends while the page is hidden and resumes when it shows again', () => {
    const { context, root, player } = setup();
    player.on();
    root.visibilityState = 'hidden';
    root.dispatchEvent(new Event('visibilitychange'));
    expect(context.suspend).toHaveBeenCalledTimes(1);
    root.visibilityState = 'visible';
    root.dispatchEvent(new Event('visibilitychange'));
    expect(context.resume).toHaveBeenCalled();
  });

  it('stays suspended when the page shows again with sound off', async () => {
    vi.useFakeTimers();
    const { context, root, player } = setup();
    player.on();
    player.off();
    await vi.advanceTimersByTimeAsync(SOUND_OFF_FADE_S * 1000);
    context.resume.mockClear();
    root.visibilityState = 'visible';
    root.dispatchEvent(new Event('visibilitychange'));
    expect(context.resume).not.toHaveBeenCalled();
  });

  it('fades every voice over 0.05 s on sound off, then suspends', async () => {
    vi.useFakeTimers();
    const { context, player } = setup();
    player.on();
    player.play(C4);
    context.currentTime = 1;
    player.off();
    const [output] = voiceOutputs(context);
    expect(output.gain.calls.at(-1)).toEqual({
      method: 'linear',
      value: 0,
      time: 1 + SOUND_OFF_FADE_S,
    });
    expect(context.oscillators.every((oscillator) => oscillator.stopAt === 1.05)).toBe(true);
    expect(context.suspend).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(SOUND_OFF_FADE_S * 1000);
    expect(context.suspend).toHaveBeenCalledTimes(1);
  });

  it('closes the context and drops its listeners on dispose', () => {
    const { context, root, player } = setup('suspended');
    player.on();
    player.dispose();
    expect(context.close).toHaveBeenCalledTimes(1);
    root.visibilityState = 'hidden';
    root.dispatchEvent(new Event('visibilitychange'));
    root.dispatchEvent(new Event('pointerdown'));
    expect(context.suspend).not.toHaveBeenCalled();
    expect(context.resume).toHaveBeenCalledTimes(1);
  });
});

describe('piano player voice', () => {
  it('runs one oscillator per partial and struck string', () => {
    const cases: [NoteSpec, number][] = [
      [C4, 33],
      [noteSpec('medium', 'unaCorda', 'middle'), 22],
      [noteSpec('medium', 'none', 'treble'), 12],
      [noteSpec('medium', 'none', 'bass'), 28],
    ];
    for (const [spec, count] of cases) {
      const { context, player } = setup();
      player.on();
      player.play(spec);
      expect(context.oscillators).toHaveLength(
        spec.partials.length * spec.stringDetuneCents.length,
      );
      expect(context.oscillators).toHaveLength(count);
    }
  });

  it('detunes each string by its own cents with a reused random start phase', () => {
    const { context, player } = setup();
    player.on();
    player.play(C4);
    player.play(C4);
    const cents = context.oscillators.slice(0, 3).map((oscillator) => oscillator.detune.value);
    expect(cents).toEqual(C4.stringDetuneCents);
    expect(context.waveOptions).toHaveLength(PHASE_STEPS);
    expect(context.waveOptions.every((options) => options?.disableNormalization)).toBe(true);
    expect(context.oscillators.every((oscillator) => oscillator.wave)).toBe(true);
  });

  it('caps a voice at 36 oscillators and the player at 72 over three quick strikes', () => {
    const { context, player } = setup();
    player.on();
    for (let strike = 0; strike < 3; strike += 1) {
      player.play(wideSpec());
      context.currentTime += 0.01;
    }
    context.currentTime += SOUND_OFF_FADE_S;
    expect(context.oscillators).toHaveLength(3 * MAX_OSCILLATORS_PER_VOICE);
    expect(context.liveOscillators()).toBe(VOICE_CAP * MAX_OSCILLATORS_PER_VOICE);
    expect(context.liveOscillators()).toBe(72);
  });

  it('fades the oldest voice to silence over 0.05 s when a third strike needs its room', () => {
    const { context, player } = setup();
    player.on();
    player.play(C4);
    context.currentTime = 0.1;
    player.play(C4);
    context.currentTime = 0.2;
    player.play(C4);
    const [oldest] = voiceOutputs(context);
    expect(oldest.gain.calls.at(-1)).toEqual({
      method: 'linear',
      value: 0,
      time: 0.2 + SOUND_OFF_FADE_S,
    });
    const first = context.oscillators.slice(0, C4.partials.length * C4.stringDetuneCents.length);
    expect(first.every((oscillator) => oscillator.stopAt === 0.2 + SOUND_OFF_FADE_S)).toBe(true);
  });

  it('fades the ringing voice on a re-strike', () => {
    const { context, player } = setup();
    player.on();
    player.play(C4);
    context.currentTime = 2;
    player.play(C4);
    const [older, newer] = voiceOutputs(context);
    expect(older.gain.calls.at(-1)).toMatchObject({
      method: 'target',
      time: 2,
      timeConstant: RESTRIKE_TIME_CONSTANT_S,
    });
    expect(newer.gain.calls).toHaveLength(0);
  });

  it('releases the voice with the damper time constant and stops it 0.3 s later', () => {
    const { context, player } = setup();
    player.on();
    player.play(C4);
    context.currentTime = 1;
    player.release();
    player.release();
    const [output] = voiceOutputs(context);
    const fades = output.gain.calls.filter((call) => call.method === 'target');
    expect(fades).toEqual([
      { method: 'target', value: FLOOR_GAIN, time: 1, timeConstant: DAMPER_TIME_CONSTANT_S },
    ]);
    expect(context.oscillators.every((oscillator) => oscillator.stopAt === 1 + STOP_DELAY_S)).toBe(
      true,
    );
  });

  it('never ramps exponentially to or from zero', () => {
    const { context, player } = setup();
    player.on();
    player.play(noteSpec('soft', 'unaCorda', 'bass'));
    player.play(noteSpec('hard', 'sustain', 'treble'));
    for (const { gain } of context.gains) {
      gain.calls.forEach((call, index) => {
        if (call.method !== 'exponential') return;
        expect(call.value).toBeGreaterThan(0);
        expect(gain.calls[index - 1].value).toBeGreaterThan(0);
      });
    }
  });

  it('starts every partial at its peak share and decays it to the floor', () => {
    const { context, player } = setup();
    player.on();
    player.play(C4);
    const fundamental = context.oscillators[0].targets[0] as FakeGain;
    const [silence, attack, ...decay] = fundamental.gain.calls;
    const peak = (C4.peakGain * C4.partials[0].amplitude) / C4.stringDetuneCents.length;
    expect(silence).toEqual({ method: 'set', value: 0, time: 0 });
    expect(attack).toEqual({ method: 'linear', value: peak, time: C4.attackSeconds });
    expect(decay.at(-1)?.value).toBe(FLOOR_GAIN);
    expect(context.oscillators[0].stopAt).toBe(decay.at(-1)?.time);
  });

  it('adds a hammer thump that is louder for a hard touch and gone within 20 ms', () => {
    const { context, player } = setup();
    player.on();
    const soft = noteSpec('soft', 'none', 'middle');
    const hard = noteSpec('hard', 'none', 'middle');
    player.play(soft);
    player.play(hard);
    const [softCalls, hardCalls] = thumpGainCalls(context);
    expect(softCalls[0]).toEqual({ method: 'set', value: soft.thumpGain, time: 0 });
    expect(hardCalls[0].value).toBe(hard.thumpGain);
    expect(hardCalls[0].value).toBeGreaterThan(softCalls[0].value);
    expect(hardCalls[1]).toEqual({ method: 'exponential', value: FLOOR_GAIN, time: THUMP.seconds });
    const filter = context.bufferSources[0].targets[0] as FakeFilter;
    expect(filter.frequency.value).toBe(THUMP.cutoffHz);
  });

  it('keeps the thump as loud with una corda, since only the touch changes it', () => {
    const { context, player } = setup();
    player.on();
    player.play(noteSpec('medium', 'none', 'middle'));
    player.play(noteSpec('medium', 'unaCorda', 'middle'));
    const [full, unaCorda] = thumpGainCalls(context);
    expect(unaCorda[0].value).toBe(full[0].value);
  });
});

describe('partial decay', () => {
  it('follows the prompt line to the switch, then the aftersound line to the floor', () => {
    const peak = 0.1;
    const [switchPoint, floor] = decayPoints(peak, 1, C4);
    const switchAt = C4.afterDb / (C4.promptDbPerSecond - C4.afterDbPerSecond);
    expect(switchPoint.at).toBeCloseTo(switchAt);
    expect(switchPoint.gain).toBeCloseTo(peak * 10 ** ((-C4.promptDbPerSecond * switchAt) / 20));
    expect(floor.gain).toBe(FLOOR_GAIN);
  });

  it('decays higher partials faster', () => {
    const [slowSwitch] = decayPoints(0.1, 1, C4);
    const [fastSwitch] = decayPoints(0.1, 2, C4);
    expect(fastSwitch.at).toBeCloseTo(slowSwitch.at / 2);
  });

  it('reaches the floor on the prompt line when the partial is quiet', () => {
    const points = decayPoints(FLOOR_GAIN * 10, 1, C4);
    expect(points).toEqual([{ at: 20 / C4.promptDbPerSecond, gain: FLOOR_GAIN }]);
  });
});
