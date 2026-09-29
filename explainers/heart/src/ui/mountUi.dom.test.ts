import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { initI18n } from '@core/i18n';
import { mountActions } from '@core/ui/actions';
import chapters from '../../chapters.html?raw';
import en from '../../locales/en.json';
import { PHASE_IDS, VALVE_IDS } from '../ids';
import type { ValveId, ValveState } from '../ids';
import { WAVE_MOMENTS } from '../model';
import { createHeartStore, valveStateOf } from '../state';
import type { HeartStore } from '../state';
import { CHAPTER_ACTIONS } from './actions';
import { mountHeartUi } from '.';

function readout(id: string): string | null | undefined {
  return document.querySelector(`[data-readout="${id}"]`)?.textContent;
}

function click(action: string, value: string): void {
  document.querySelector<HTMLElement>(`[data-action="${action}"][data-value="${value}"]`)?.click();
}

function slide(control: string, value: number): void {
  const input = document.querySelector<HTMLInputElement>(`[data-control="${control}"]`);
  if (!input) throw new Error(`No control ${control}`);
  input.value = String(value);
  input.dispatchEvent(new Event('input'));
}

function pressed(action: string, value: string): string | null | undefined {
  return document
    .querySelector(`[data-action="${action}"][data-value="${value}"]`)
    ?.getAttribute('aria-pressed');
}

const OPEN_IN_STATE: Readonly<Record<ValveState, readonly ValveId[]>> = {
  avOpen: ['tricuspid', 'mitral'],
  allClosed: [],
  semilunarOpen: ['pulmonary', 'aortic'],
};

describe('chapter widgets', () => {
  let store: HeartStore;
  let dispose: () => void;

  beforeAll(() => initI18n({ en: () => Promise.resolve(en) }));

  beforeEach(() => {
    document.body.innerHTML = chapters;
    store = createHeartStore({ playing: false, phase: 340 });
    dispose = mountHeartUi(document, store);
    mountActions(document, store, CHAPTER_ACTIONS);
  });

  it('describes the chamber the reader picks', () => {
    expect(readout('chamber-receives')).toBe(en.chambers.receives.leftVentricle);
    expect(readout('chamber-sends')).toBe(en.chambers.sends.leftVentricle);
    expect(readout('chamber-wall')).toBe(en.chambers.wall.leftVentricle);
    expect(readout('chamber-pressure')).toBe('120 mmHg');
    expect(readout('chamber-role')).toBe(en.chambers.role.leftVentricle);
    click('chamber', 'rightVentricle');
    expect(pressed('chamber', 'rightVentricle')).toBe('true');
    expect(pressed('chamber', 'leftVentricle')).toBe('false');
    expect(readout('chamber-pressure')).toBe('25 mmHg');
    expect(readout('chamber-wall')).toBe(en.chambers.wall.rightVentricle);
    click('chamber', 'rightAtrium');
    expect(readout('chamber-receives')).toBe(en.chambers.receives.rightAtrium);
    expect(readout('chamber-pressure')).toBe('5 mmHg');
  });

  it('follows the valve the reader picks through the beat', () => {
    expect(readout('valve-between')).toBe(en.valves.between.mitral);
    expect(readout('valve-leaflets')).toBe('2');
    expect(readout('valve-opens')).toBe('590 ms');
    expect(readout('valve-closes')).toBe('190 ms');
    expect(readout('valve-now')).toBe(en.valves.now.shut);
    store.getState().setPhase(700);
    expect(readout('valve-now')).toBe(en.valves.now.open);
    store.getState().setPhase(200);
    expect(readout('valve-now')).toBe(en.valves.sound.s1);
    click('valve', 'aortic');
    expect(pressed('valve', 'aortic')).toBe('true');
    expect(readout('valve-leaflets')).toBe('3');
    expect(readout('valve-opens')).toBe('240 ms');
    expect(readout('valve-closes')).toBe('520 ms');
    expect(readout('valve-now')).toBe(en.valves.now.shut);
    store.getState().setPhase(400);
    expect(readout('valve-now')).toBe(en.valves.now.open);
  });

  it('never contradicts the gauge about a valve when a jump chip lands on a phase', () => {
    const shut = [en.valves.now.shut, en.valves.sound.s1, en.valves.sound.s2];
    const open = [en.valves.now.open, en.valves.now.opening];
    PHASE_IDS.forEach((phase) => {
      store.getState().jumpToPhase(phase);
      const gauge = valveStateOf(store.getState());
      VALVE_IDS.forEach((valve) => {
        click('valve', valve);
        const forbidden = OPEN_IN_STATE[gauge].includes(valve) ? shut : open;
        expect(forbidden, `${valve} at ${phase}`).not.toContain(readout('valve-now'));
      });
    });
  });

  it('reads the pressures and the flow off the curves at the moment in the beat', () => {
    expect(readout('cycle-ventricle')).toBe('120 mmHg');
    expect(readout('cycle-aorta')).toBe('120 mmHg');
    expect(readout('cycle-atrium')).toMatch(/^\d mmHg$/);
    expect(readout('cycle-flow')).toMatch(/^\d{3} mL\/s$/);
    store.getState().setPhase(700);
    expect(readout('cycle-flow')).toBe('0 mL/s');
    expect(readout('cycle-ventricle')).toMatch(/^\d mmHg$/);
    expect(readout('cycle-aorta')).toMatch(/^9\d mmHg$/);
  });

  it('shows where the signal is and seeks the waves from the chips', () => {
    store.getState().setPhase(45);
    expect(readout('conduction-where')).toBe(en.signal.atria);
    expect(readout('conduction-since')).toBe('45 ms');
    expect(readout('conduction-trace')).toBe('0.15 mV');
    click('wave', 'qrs');
    expect(store.getState().phase).toBe(WAVE_MOMENTS.qrs);
    expect(pressed('wave', 'qrs')).toBe('true');
    expect(readout('conduction-trace')).toMatch(/^1\.\d\d mV$/);
    click('wave', 't');
    expect(readout('conduction-where')).toBe(en.signal.recovering);
    expect(pressed('wave', 'qrs')).toBe('false');
  });

  it('speeds the heart up with the effort and fills each beat for less time', () => {
    expect(readout('effort')).toBe(en.units.resting);
    expect(readout('effort-rate')).toBe('75 per minute');
    expect(readout('effort-stroke')).toBe('70 mL');
    expect(readout('effort-output')).toBe('5.3 L');
    expect(readout('effort-filling')).toBe('470 ms');
    expect(readout('effort-trip')).toBe('57 s');
    slide('effort', 1);
    expect(store.getState().effort).toBe(1);
    expect(readout('effort')).toBe('100%');
    expect(readout('effort-rate')).toBe('190 per minute');
    expect(readout('effort-stroke')).toBe('110 mL');
    expect(readout('effort-output')).toBe('20.9 L');
    expect(readout('effort-filling')).toBe('108 ms');
    expect(readout('effort-trip')).toBe('14 s');
  });

  it('switches to an athlete who rests slower and pushes out more each beat', () => {
    click('fitness', 'athlete');
    expect(pressed('fitness', 'athlete')).toBe('true');
    expect(readout('effort')).toBe(en.units.resting);
    expect(readout('effort-rate')).toBe('50 per minute');
    expect(readout('effort-stroke')).toBe('100 mL');
    expect(readout('effort-output')).toBe('5.0 L');
    expect(readout('effort-filling')).toBe('796 ms');
    slide('effort', 1);
    expect(readout('effort-rate')).toBe('185 per minute');
    expect(readout('effort-stroke')).toBe('150 mL');
    expect(readout('effort-output')).toBe('27.8 L');
  });

  it('stops updating once disposed', () => {
    dispose();
    store.getState().setChamber('rightAtrium');
    store.getState().setPhase(700);
    expect(readout('chamber-pressure')).toBe('120 mmHg');
    expect(readout('cycle-ventricle')).toBe('120 mmHg');
  });
});
