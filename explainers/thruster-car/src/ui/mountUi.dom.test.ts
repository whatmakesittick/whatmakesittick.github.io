import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { mountActions } from '@core/ui/actions';
import type { MomentId } from '../ids';
import { MOMENTS } from '../model';
import { createThrusterCarStore } from '../state';
import type { ThrusterCarStore } from '../state';
import { CHAPTER_ACTIONS } from './actions';
import { CHAPTER_MARKUP, TEST_LOCALE, fill, initTestLocale, isFilled } from './testing';
import { mountThrusterCarUi } from '.';

const { units, chapters } = TEST_LOCALE;
const { outcomeState } = chapters.limits;
const READOUT_COUNT = 31;
const SCRUBBED_PHASE = 9;
const CHAPTER_MOMENTS: readonly MomentId[] = [
  'inverted',
  'held',
  'leavesRamp',
  'rollComplete',
  'touchdown',
  'liftOff',
  'apex',
  'landed',
];

function readout(id: string): string | null | undefined {
  return document.querySelector(`[data-readout="${id}"]`)?.textContent;
}

function click(action: string, value: string): void {
  document
    .querySelectorAll<HTMLElement>(`[data-action="${action}"][data-value="${value}"]`)[0]
    ?.click();
}

function pressed(action: string, value: string): (string | null)[] {
  return [...document.querySelectorAll(`[data-action="${action}"][data-value="${value}"]`)].map(
    (chip) => chip.getAttribute('aria-pressed'),
  );
}

function slide(id: string, value: number): void {
  const input = document.querySelector<HTMLInputElement>(`#${id}`);
  if (!input) throw new Error(`No ${id} control`);
  input.value = String(value);
  input.dispatchEvent(new Event('input'));
}

function thumb(id: string): { value?: string; step?: string } {
  const input = document.querySelector<HTMLInputElement>(`#${id}`);
  return { value: input?.value, step: input?.step };
}

function output(id: string): string | null | undefined {
  return document.querySelector(`output[for="${id}"]`)?.textContent;
}

function readoutTexts(): (string | null)[] {
  return [...document.querySelectorAll('[data-readout]')].map((node) => node.textContent);
}

describe('chapter widgets', () => {
  let store: ThrusterCarStore;
  let dispose: () => void;

  beforeAll(() => initTestLocale());

  beforeEach(() => {
    document.body.innerHTML = CHAPTER_MARKUP;
    store = createThrusterCarStore({ playing: false, phase: 0 });
    dispose = mountThrusterCarUi(document, store);
    mountActions(document, store, CHAPTER_ACTIONS);
  });

  afterEach(() => dispose());

  it('fills every readout with a finished text', () => {
    const texts = readoutTexts();
    expect(texts).toHaveLength(READOUT_COUNT);
    texts.forEach((text) => expect(isFilled(text), text ?? '').toBe(true));
  });

  it('shows the model numbers for a full 600 L tank of air', () => {
    expect(output('tank-fill')).toBe(fill(units.percent, { value: '100' }));
    expect(readout('fillMass')).toBe(fill(units.kilograms, { value: '315' }));
    expect(readout('fillWork')).toBe(fill(units.megajoulesPair, { mj: '143', kwh: '39.6' }));
    expect(readout('fillPressure')).toBe(fill(units.bar, { value: '700' }));
    expect(readout('fillTime')).toBe(fill(units.minutes, { value: '48' }));
    expect(readout('tankShell')).toBe(fill(units.kilograms, { value: '429' }));
    expect(output('nozzle-pressure')).toBe(fill(units.bar, { value: '700' }));
    expect(readout('nozzleThrust')).toBe(fill(units.kilonewtons, { value: '10.0' }));
    expect(readout('nozzleFlow')).toBe(fill(units.kgPerSecond, { value: '14.3' }));
    expect(readout('exhaustSpeed')).toBe(fill(units.metresPerSecond, { value: '698' }));
    expect(readout('isp')).toBe(fill(units.seconds, { value: '71' }));
    expect(output('rear-thrust')).toBe(fill(units.kilonewtons, { value: '80' }));
    expect(readout('boostAccel')).toBe(fill(units.gees, { value: '4.8' }));
    expect(readout('zeroToSixty')).toBe(fill(units.seconds, { value: '0.57' }));
    expect(readout('boostFlow')).toBe(fill(units.kgPerSecond, { value: '115' }));
    expect(readout('boostLasts')).toBe(fill(units.seconds, { value: '2.8' }));
    expect(output('entry-speed')).toBe(fill(units.metresPerSecond, { value: '18.0' }));
    expect(thumb('entry-speed')).toEqual({ value: '18', step: '0.5' });
    expect(readout('loopTopSpeed')).toBe(fill(units.metresPerSecond, { value: '11.3' }));
    expect(readout('loopBottomG')).toBe(fill(units.gees, { value: '6.6' }));
    expect(readout('loopTopG')).toBe(fill(units.gees, { value: '1.6' }));
    expect(readout('dropTime')).toBe(fill(units.seconds, { value: '1.43' }));
    expect(output('roll-inertia')).toBe(fill(units.kgm2, { value: '600' }));
    expect(readout('rollTime')).toBe(fill(units.seconds, { value: '0.84' }));
    expect(readout('rollTorque')).toBe(fill(units.kilonewtonMetres, { value: '10.8' }));
    expect(readout('rollRate')).toBe(fill(units.degreesPerSecond, { value: '431' }));
    expect(output('jump-height')).toBe(fill(units.metres, { value: '8.0' }));
    expect(thumb('jump-height')).toEqual({ value: '8', step: '0.5' });
    expect(readout('leapSpeed')).toBe(fill(units.metresPerSecond, { value: '9.6' }));
    expect(readout('leapBurn')).toBe(fill(units.seconds, { value: '0.70' }));
    expect(readout('leapGas')).toBe(fill(units.kilograms, { value: '40' }));
    expect(readout('jumpAir')).toBe(fill(units.seconds, { value: '2.3' }));
    expect(readout('jumpRange')).toBe(fill(units.metres, { value: '44' }));
    expect(readout('hoverFlow')).toBe(fill(units.kgPerSecond, { value: '23.9' }));
    expect(readout('hoverTime')).toBe(fill(units.seconds, { value: '13.2' }));
    expect(readout('jetPower')).toBe(fill(units.megawatts, { value: '5.8' }));
    expect(readout('totalImpulse')).toBe(fill(units.kilonewtonSeconds, { value: '220' }));
    expect(readout('runUsed')).toBe(fill(units.percent, { value: '79' }));
    expect(readout('runOutcome')).toBe(fill(outcomeState.cushioned, { speed: '2.5' }));
  });

  it('works out each calculator as its slider moves', () => {
    slide('tank-fill', 0.5);
    expect(store.getState().fillShare).toBe(0.5);
    expect(output('tank-fill')).toBe(fill(units.percent, { value: '50' }));
    expect(readout('fillMass')).toBe(fill(units.kilograms, { value: '158' }));
    expect(readout('fillPressure')).toBe(fill(units.bar, { value: '257' }));
    expect(readout('fillTime')).toBe(fill(units.minutes, { value: '24' }));
    slide('nozzle-pressure', 350);
    expect(readout('nozzleThrust')).toBe(fill(units.kilonewtons, { value: '5.0' }));
    expect(readout('nozzleFlow')).toBe(fill(units.kgPerSecond, { value: '7.2' }));
    expect(readout('exhaustSpeed')).toBe(fill(units.metresPerSecond, { value: '698' }));
    slide('rear-thrust', 40);
    expect(readout('boostAccel')).toBe(fill(units.gees, { value: '2.4' }));
    expect(readout('zeroToSixty')).toBe(fill(units.seconds, { value: '1.14' }));
    expect(readout('boostLasts')).toBe(fill(units.seconds, { value: '5.5' }));
    slide('entry-speed', 15);
    expect(store.getState().entrySpeed).toBe(15);
    expect(output('entry-speed')).toBe(fill(units.metresPerSecond, { value: '15.0' }));
    expect(readout('loopTopSpeed')).toBe(fill(units.metresPerSecond, { value: '5.4' }));
    expect(readout('loopBottomG')).toBe(fill(units.gees, { value: '4.6' }));
    expect(readout('loopTopG')).toBe(fill(units.gees, { value: '-0.4' }));
    expect(readout('dropTime')).toBe(fill(units.seconds, { value: '1.43' }));
    slide('entry-speed', 24);
    expect(readout('loopTopSpeed')).toBe(fill(units.metresPerSecond, { value: '19.5' }));
    expect(readout('loopTopG')).toBe(fill(units.gees, { value: '6.7' }));
    slide('roll-inertia', 900);
    expect(readout('rollTime')).toBe(fill(units.seconds, { value: '1.02' }));
    expect(readout('rollRate')).toBe(fill(units.degreesPerSecond, { value: '352' }));
    expect(readout('rollTorque')).toBe(fill(units.kilonewtonMetres, { value: '10.8' }));
    slide('jump-height', 12);
    expect(store.getState().jumpHeight).toBe(12);
    expect(output('jump-height')).toBe(fill(units.metres, { value: '12.0' }));
    expect(readout('leapSpeed')).toBe(fill(units.metresPerSecond, { value: '11.7' }));
    expect(readout('leapBurn')).toBe(fill(units.seconds, { value: '0.85' }));
    expect(readout('leapGas')).toBe(fill(units.kilograms, { value: '49' }));
    expect(readout('jumpAir')).toBe(fill(units.seconds, { value: '2.8' }));
    expect(readout('jumpRange')).toBe(fill(units.metres, { value: '54' }));
    slide('jump-height', 4);
    expect(readout('leapSpeed')).toBe(fill(units.metresPerSecond, { value: '6.8' }));
    expect(readout('jumpRange')).toBe(fill(units.metres, { value: '31' }));
  });

  it('puts the calculators back on a chapter change but keeps the gas and the tank', () => {
    slide('tank-fill', 0.5);
    slide('entry-speed', 22);
    slide('jump-height', 11);
    click('gas', 'helium');
    store.getState().applyPreset('nozzle');
    expect(output('tank-fill')).toBe(fill(units.percent, { value: '100' }));
    expect(output('entry-speed')).toBe(fill(units.metresPerSecond, { value: '18.0' }));
    expect(readout('loopTopSpeed')).toBe(fill(units.metresPerSecond, { value: '11.3' }));
    expect(output('jump-height')).toBe(fill(units.metres, { value: '8.0' }));
    expect(readout('leapGas')).toBe(fill(units.kilograms, { value: '15' }));
    expect(readout('fillMass')).toBe(fill(units.kilograms, { value: '51' }));
    expect(pressed('gas', 'helium')).toEqual(['true', 'true', 'true']);
  });

  it('swaps the gas and the tank from the chips on every chapter', () => {
    click('gas', 'helium');
    expect(store.getState().gas).toBe('helium');
    expect(pressed('gas', 'helium')).toEqual(['true', 'true', 'true']);
    expect(pressed('gas', 'air')).toEqual(['false', 'false', 'false']);
    expect(readout('exhaustSpeed')).toBe(fill(units.metresPerSecond, { value: '1,823' }));
    expect(readout('isp')).toBe(fill(units.seconds, { value: '186' }));
    expect(readout('fillWork')).toBe(fill(units.megajoulesPair, { mj: '178', kwh: '49.4' }));
    expect(readout('leapGas')).toBe(fill(units.kilograms, { value: '15' }));
    click('tank', '400');
    expect(store.getState().tankLitres).toBe(400);
    expect(pressed('tank', '400')).toEqual(['true', 'true']);
    expect(readout('tankShell')).toBe(fill(units.kilograms, { value: '286' }));
    expect(readout('hoverFlow')).toBe(fill(units.kgPerSecond, { value: '9.1' }));
    expect(readout('hoverTime')).toBe(fill(units.seconds, { value: '3.7' }));
    expect(readout('jetPower')).toBe(fill(units.megawatts, { value: '15.2' }));
    expect(readout('totalImpulse')).toBe(fill(units.kilonewtonSeconds, { value: '62' }));
    expect(readout('runUsed')).toBe(fill(units.percent, { value: '81' }));
    expect(readout('runOutcome')).toBe(
      fill(outcomeState.ranDry, { seconds: '9.4', speed: '14.0' }),
    );
  });

  it('seeks to each moment chip, pauses there and marks only that chip', () => {
    const chips = [...document.querySelectorAll<HTMLElement>('[data-action="moment"]')];
    expect(chips.map((chip) => chip.dataset.value)).toEqual(CHAPTER_MOMENTS);
    store.getState().play();
    CHAPTER_MOMENTS.forEach((moment) => {
      click('moment', moment);
      expect(store.getState()).toMatchObject({ phase: MOMENTS[moment], playing: false });
      CHAPTER_MOMENTS.forEach((other) =>
        expect(pressed('moment', other), other).toEqual([String(other === moment)]),
      );
    });
  });

  it('replays the run from the start and leaves the calculators alone when scrubbed', () => {
    const before = readoutTexts();
    store.getState().setPhase(SCRUBBED_PHASE);
    expect(readoutTexts()).toEqual(before);
    click('replay', 'run');
    expect(store.getState()).toMatchObject({ phase: 0, playing: true });
    expect(pressed('replay', 'run')).toEqual(['false']);
  });
});
