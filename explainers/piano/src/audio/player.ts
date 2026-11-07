import { lerp } from '@core/math';
import { dbToGain, toMs } from '../model';
import type { NoteSpec } from '../model';

export const MASTER_GAIN = 0.25;
export const DAMPER_TIME_CONSTANT_S = 0.03;
export const RESTRIKE_TIME_CONSTANT_S = 0.03;
export const STOP_DELAY_S = 0.3;
export const SOUND_OFF_FADE_S = 0.05;
export const FLOOR_GAIN = 0.0001;
export const VOICE_CAP = 2;
export const MAX_OSCILLATORS_PER_VOICE = 36;
export const LIMITER_SETTINGS = {
  thresholdDb: -6,
  kneeDb: 0,
  ratio: 20,
  attackSeconds: 0.003,
  releaseSeconds: 0.25,
} as const;
export const THUMP_SECONDS = 0.02;
export const THUMP_DECAY_S = 0.02;
export const THUMP_CUTOFF_HZ = 700;
export const THUMP_GAIN_SHARE = 0.3;
export const PHASE_STEPS = 16;

const VOICE_LEVEL = 1;
const SILENT = 0;
const DECIBELS_PER_DECADE = 20;
const FULL_TURN = 2 * Math.PI;
const MONO = 1;
const ignore = () => undefined;

export type SoundDocument = Pick<
  Document,
  'addEventListener' | 'removeEventListener' | 'visibilityState'
>;

export interface PlayerOptions {
  createContext?: () => AudioContext;
  root?: SoundDocument;
}

export interface PianoPlayer {
  on(): void;
  off(): void;
  play(spec: NoteSpec): void;
  release(): void;
  dispose(): void;
}

interface Graph {
  context: AudioContext;
  master: GainNode;
  waves: readonly PeriodicWave[];
  noise: AudioBuffer;
}

interface Voice {
  output: GainNode;
  sources: AudioScheduledSourceNode[];
  nodes: AudioNode[];
  endsAt: number;
  fading: boolean;
}

export interface Tone {
  hz: number;
  cents: number;
  peak: number;
  rateScale: number;
}

export interface EnvelopePoint {
  at: number;
  gain: number;
}

const GESTURE_EVENTS = ['pointerdown', 'keydown'] as const;

function gainToDb(gain: number): number {
  return DECIBELS_PER_DECADE * Math.log10(gain);
}

export function voiceTones(spec: NoteSpec): Tone[] {
  const strings = spec.stringDetuneCents.length;
  const partials = spec.partials.slice(0, Math.floor(MAX_OSCILLATORS_PER_VOICE / strings));
  return partials.flatMap(({ n, hz, amplitude }) => {
    const peak = (spec.peakGain * amplitude) / strings;
    if (peak <= FLOOR_GAIN) return [];
    const rateScale = 1 + spec.partialDampingStep * (n - 1);
    return spec.stringDetuneCents.map((cents) => ({ hz, cents, peak, rateScale }));
  });
}

export function decayPoints(peak: number, rateScale: number, spec: NoteSpec): EnvelopePoint[] {
  const promptRate = spec.promptDbPerSecond * rateScale;
  const afterRate = spec.afterDbPerSecond * rateScale;
  const floorDrop = gainToDb(peak / FLOOR_GAIN);
  const switchAt = Math.max(0, spec.afterDb / (promptRate - afterRate));
  const switchDrop = promptRate * switchAt;
  if (floorDrop <= switchDrop) return [{ at: floorDrop / promptRate, gain: FLOOR_GAIN }];
  return [
    { at: switchAt, gain: peak * dbToGain(-switchDrop) },
    { at: switchAt + (floorDrop - switchDrop) / afterRate, gain: FLOOR_GAIN },
  ];
}

function scheduleEnvelope(param: AudioParam, tone: Tone, spec: NoteSpec, now: number): number {
  const decayStart = now + spec.attackSeconds;
  param.setValueAtTime(SILENT, now);
  param.linearRampToValueAtTime(tone.peak, decayStart);
  let endsAt = decayStart;
  for (const point of decayPoints(tone.peak, tone.rateScale, spec)) {
    endsAt = decayStart + point.at;
    param.exponentialRampToValueAtTime(point.gain, endsAt);
  }
  return endsAt;
}

function phaseWave(context: AudioContext, phase: number): PeriodicWave {
  const real = new Float32Array([0, Math.sin(phase)]);
  const imag = new Float32Array([0, Math.cos(phase)]);
  return context.createPeriodicWave(real, imag, { disableNormalization: true });
}

function noiseBuffer(context: AudioContext): AudioBuffer {
  const length = Math.ceil(context.sampleRate * THUMP_SECONDS);
  const buffer = context.createBuffer(MONO, length, context.sampleRate);
  const samples = buffer.getChannelData(0);
  for (let index = 0; index < length; index += 1) samples[index] = lerp(-1, 1, Math.random());
  return buffer;
}

function createLimiter(context: AudioContext): DynamicsCompressorNode {
  const limiter = context.createDynamicsCompressor();
  limiter.threshold.value = LIMITER_SETTINGS.thresholdDb;
  limiter.knee.value = LIMITER_SETTINGS.kneeDb;
  limiter.ratio.value = LIMITER_SETTINGS.ratio;
  limiter.attack.value = LIMITER_SETTINGS.attackSeconds;
  limiter.release.value = LIMITER_SETTINGS.releaseSeconds;
  return limiter;
}

function createGraph(context: AudioContext): Graph {
  const limiter = createLimiter(context);
  limiter.connect(context.destination);
  const master = context.createGain();
  master.gain.value = MASTER_GAIN;
  master.connect(limiter);
  const waves = Array.from({ length: PHASE_STEPS }, (_, step) =>
    phaseWave(context, (FULL_TURN * step) / PHASE_STEPS),
  );
  return { context, master, waves, noise: noiseBuffer(context) };
}

function stopSources(voice: Voice, when: number): void {
  const stopAt = Math.min(voice.endsAt, when);
  voice.sources.forEach((source) => source.stop(stopAt));
  voice.endsAt = stopAt;
}

function fadeVoice(voice: Voice, now: number, timeConstant: number): void {
  if (voice.fading) return;
  voice.fading = true;
  const gain = voice.output.gain;
  gain.cancelScheduledValues(now);
  gain.setValueAtTime(VOICE_LEVEL, now);
  gain.setTargetAtTime(FLOOR_GAIN, now, timeConstant);
  stopSources(voice, now + STOP_DELAY_S);
}

function muteVoice(voice: Voice, now: number): void {
  const gain = voice.output.gain;
  gain.cancelScheduledValues(now);
  gain.setValueAtTime(gain.value, now);
  gain.linearRampToValueAtTime(SILENT, now + SOUND_OFF_FADE_S);
  stopSources(voice, now + SOUND_OFF_FADE_S);
}

class WebAudioPianoPlayer implements PianoPlayer {
  private readonly createContext: () => AudioContext;
  private readonly root: SoundDocument;
  private graph: Graph | undefined;
  private voices: Voice[] = [];
  private wanted = false;
  private gestureArmed = false;
  private suspendTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(createContext: () => AudioContext, root: SoundDocument) {
    this.createContext = createContext;
    this.root = root;
  }

  on(): void {
    this.wanted = true;
    this.cancelSuspend();
    this.resume(this.ensureGraph().context);
  }

  off(): void {
    this.wanted = false;
    if (!this.graph) return;
    const now = this.graph.context.currentTime;
    this.voices.forEach((voice) => muteVoice(voice, now));
    this.voices = [];
    this.cancelSuspend();
    this.suspendTimer = setTimeout(() => this.suspendIfOff(), toMs(SOUND_OFF_FADE_S));
  }

  play(spec: NoteSpec): void {
    if (!this.wanted || !this.graph) return;
    const now = this.graph.context.currentTime;
    this.makeRoom(now);
    this.voices.push(this.startVoice(this.graph, spec, now));
  }

  release(): void {
    if (!this.graph) return;
    const now = this.graph.context.currentTime;
    this.voices.forEach((voice) => fadeVoice(voice, now, DAMPER_TIME_CONSTANT_S));
  }

  dispose(): void {
    this.wanted = false;
    this.cancelSuspend();
    this.disarmGestureResume();
    this.root.removeEventListener('visibilitychange', this.onVisibility);
    this.voices = [];
    this.graph?.context.close().catch(ignore);
    this.graph = undefined;
  }

  private ensureGraph(): Graph {
    if (this.graph) return this.graph;
    this.graph = createGraph(this.createContext());
    this.root.addEventListener('visibilitychange', this.onVisibility);
    return this.graph;
  }

  private makeRoom(now: number): void {
    while (this.voices.length >= VOICE_CAP) {
      const oldest = this.voices.shift();
      if (oldest) stopSources(oldest, now);
    }
    this.voices.forEach((voice) => fadeVoice(voice, now, RESTRIKE_TIME_CONSTANT_S));
  }

  private startVoice(graph: Graph, spec: NoteSpec, now: number): Voice {
    const { context } = graph;
    const output = context.createGain();
    output.gain.value = VOICE_LEVEL;
    output.connect(graph.master);
    const voice: Voice = { output, sources: [], nodes: [output], endsAt: now, fading: false };
    for (const tone of voiceTones(spec)) this.startTone(graph, voice, tone, spec, now);
    this.startThump(graph, voice, spec, now);
    this.cleanUpWhenEnded(voice);
    return voice;
  }

  private startTone(graph: Graph, voice: Voice, tone: Tone, spec: NoteSpec, now: number): void {
    const { context, waves } = graph;
    const oscillator = context.createOscillator();
    oscillator.setPeriodicWave(waves[Math.floor(Math.random() * waves.length)]);
    oscillator.frequency.value = tone.hz;
    oscillator.detune.value = tone.cents;
    const gain = context.createGain();
    const endsAt = scheduleEnvelope(gain.gain, tone, spec, now);
    oscillator.connect(gain).connect(voice.output);
    oscillator.start(now);
    oscillator.stop(endsAt);
    voice.sources.push(oscillator);
    voice.nodes.push(oscillator, gain);
    voice.endsAt = Math.max(voice.endsAt, endsAt);
  }

  private startThump(graph: Graph, voice: Voice, spec: NoteSpec, now: number): void {
    const { context, noise } = graph;
    const source = context.createBufferSource();
    source.buffer = noise;
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = THUMP_CUTOFF_HZ;
    const gain = context.createGain();
    gain.gain.setValueAtTime(spec.peakGain * THUMP_GAIN_SHARE, now);
    gain.gain.exponentialRampToValueAtTime(FLOOR_GAIN, now + THUMP_DECAY_S);
    source.connect(filter).connect(gain).connect(voice.output);
    source.start(now);
    voice.sources.push(source);
    voice.nodes.push(source, filter, gain);
  }

  private cleanUpWhenEnded(voice: Voice): void {
    let playing = voice.sources.length;
    const onEnded = () => {
      playing -= 1;
      if (playing > 0) return;
      voice.nodes.forEach((node) => node.disconnect());
      this.voices = this.voices.filter((candidate) => candidate !== voice);
    };
    voice.sources.forEach((source) => (source.onended = onEnded));
  }

  private resume(context: AudioContext): void {
    if (context.state === 'running') return;
    context.resume().catch(ignore);
    this.armGestureResume();
  }

  private suspendIfOff(): void {
    this.suspendTimer = undefined;
    if (!this.wanted) this.graph?.context.suspend().catch(ignore);
  }

  private cancelSuspend(): void {
    if (this.suspendTimer !== undefined) clearTimeout(this.suspendTimer);
    this.suspendTimer = undefined;
  }

  private armGestureResume(): void {
    if (this.gestureArmed) return;
    this.gestureArmed = true;
    GESTURE_EVENTS.forEach((type) => this.root.addEventListener(type, this.onGesture));
  }

  private disarmGestureResume(): void {
    if (!this.gestureArmed) return;
    this.gestureArmed = false;
    GESTURE_EVENTS.forEach((type) => this.root.removeEventListener(type, this.onGesture));
  }

  private readonly onGesture = () => {
    this.disarmGestureResume();
    const context = this.graph?.context;
    if (this.wanted && context?.state === 'suspended') context.resume().catch(ignore);
  };

  private readonly onVisibility = () => {
    const context = this.graph?.context;
    if (!context) return;
    if (this.root.visibilityState === 'hidden') context.suspend().catch(ignore);
    else if (this.wanted) this.resume(context);
  };
}

function createAudioContext(): AudioContext {
  return new AudioContext();
}

export function createPianoPlayer(options: PlayerOptions = {}): PianoPlayer {
  const { createContext = createAudioContext, root = document } = options;
  return new WebAudioPianoPlayer(createContext, root);
}
