import { ODORANT_IDS } from '../ids';
import type { AssemblyState, FlavorReading, OdorantLevels } from '../ids';
import {
  biteTemperature,
  copiesOf,
  emptyLevels,
  firingCount,
  inMouth,
  meltShare,
  mouthAroma,
  noseShare,
  orthoAroma,
  perceptAt,
  phaseIdAt,
  phaseProgress,
  profileOf,
  receptorActivation,
  releasedShare,
  retroAroma,
  secondsAt,
  smellOf,
  swallowShare,
  tasteAt,
} from '../model';
import type { FlavorState } from './store';

export type ReadingSource = Pick<
  FlavorState,
  'phase' | 'flavor' | 'desk' | 'servingC' | 'fatPercent' | 'sniff' | 'view'
>;
export type AssemblySource = ReadingSource & Pick<FlavorState, 'scale' | 'playing'>;

function sumInto(a: OdorantLevels, b: OdorantLevels, out: OdorantLevels): OdorantLevels {
  ODORANT_IDS.forEach((id) => {
    out[id] = a[id] + b[id];
  });
  return out;
}

function silence(levels: OdorantLevels): OdorantLevels {
  ODORANT_IDS.forEach((id) => {
    levels[id] = 0;
  });
  return levels;
}

export function readingAt(source: ReadingSource): FlavorReading {
  const { phase, flavor, desk, servingC, fatPercent, sniff } = source;
  const pinched = source.view.pinched;
  const seconds = secondsAt(phase);
  const profile = profileOf(flavor, desk);
  const settings = { profile, servingC, fatPercent };
  const ortho = orthoAroma(seconds, settings);
  const retro = retroAroma(seconds, settings);
  if (pinched) {
    silence(ortho);
    silence(retro);
  }
  const mouth = mouthAroma(seconds, settings);
  const nose = sumInto(ortho, retro, emptyLevels());
  const atNose = noseShare(nose);
  const taste = tasteAt(seconds, servingC, flavor);
  const receptors = receptorActivation(nose, sniff);
  return {
    seconds,
    phase: phaseIdAt(phase),
    phaseProgress: phaseProgress(phase),
    temperatureC: biteTemperature(seconds, servingC),
    melt: meltShare(seconds, servingC),
    inMouth: inMouth(seconds),
    swallow: swallowShare(seconds),
    flavor,
    smell: smellOf(flavor, desk),
    profile,
    mouth,
    ortho,
    retro,
    nose,
    released: releasedShare(mouth),
    noseShare: atNose,
    taste,
    percept: perceptAt(seconds, atNose, taste.sweet, pinched),
    receptors,
    firing: firingCount(receptors),
  };
}

let lastSource: ReadingSource | null = null;
let lastReading: FlavorReading | null = null;

function sameDesk(a: Readonly<OdorantLevels>, b: Readonly<OdorantLevels>): boolean {
  return a === b || ODORANT_IDS.every((id) => a[id] === b[id]);
}

function sameSource(a: ReadingSource, b: ReadingSource): boolean {
  return (
    a.phase === b.phase &&
    a.flavor === b.flavor &&
    a.servingC === b.servingC &&
    a.fatPercent === b.fatPercent &&
    a.sniff === b.sniff &&
    a.view.pinched === b.view.pinched &&
    sameDesk(a.desk, b.desk)
  );
}

function snapshot(source: ReadingSource): ReadingSource {
  return {
    phase: source.phase,
    flavor: source.flavor,
    desk: source.desk,
    servingC: source.servingC,
    fatPercent: source.fatPercent,
    sniff: source.sniff,
    view: { ...source.view },
  };
}

export function flavorReading(source: ReadingSource): Readonly<FlavorReading> {
  if (lastReading && lastSource && sameSource(lastSource, source)) return lastReading;
  lastSource = snapshot(source);
  lastReading = readingAt(source);
  return lastReading;
}

function copyLevels(target: OdorantLevels, source: Readonly<OdorantLevels>): OdorantLevels {
  return Object.assign(target, source);
}

function writeReading(target: FlavorReading, reading: Readonly<FlavorReading>): void {
  const { profile, mouth, ortho, retro, nose, taste, receptors } = target;
  Object.assign(target, reading);
  target.profile = copyLevels(profile, reading.profile);
  target.mouth = copyLevels(mouth, reading.mouth);
  target.ortho = copyLevels(ortho, reading.ortho);
  target.retro = copyLevels(retro, reading.retro);
  target.nose = copyLevels(nose, reading.nose);
  target.taste = Object.assign(taste, reading.taste);
  receptors.length = reading.receptors.length;
  reading.receptors.forEach((level, index) => {
    receptors[index] = level;
  });
  target.receptors = receptors;
}

export function writeAssemblyState(target: AssemblyState, source: AssemblySource): AssemblyState {
  const reading = flavorReading(source);
  writeReading(target.reading, reading);
  copiesOf(reading.profile, target.copies);
  target.scale = source.scale;
  target.phase = source.phase;
  target.playing = source.playing;
  target.sniff = source.sniff;
  target.fatPercent = source.fatPercent;
  target.view.labels = source.view.labels;
  target.view.pinched = source.view.pinched;
  return target;
}

function detachedReading(source: ReadingSource): FlavorReading {
  const reading = readingAt(source);
  return {
    ...reading,
    profile: { ...reading.profile },
    mouth: { ...reading.mouth },
    ortho: { ...reading.ortho },
    retro: { ...reading.retro },
    nose: { ...reading.nose },
    taste: { ...reading.taste },
    receptors: [...reading.receptors],
  };
}

export function createAssemblyState(source: AssemblySource): AssemblyState {
  const target: AssemblyState = {
    scale: source.scale,
    phase: source.phase,
    playing: source.playing,
    reading: detachedReading(source),
    copies: emptyLevels(),
    sniff: source.sniff,
    fatPercent: source.fatPercent,
    view: { labels: source.view.labels, pinched: source.view.pinched },
  };
  return writeAssemblyState(target, source);
}
