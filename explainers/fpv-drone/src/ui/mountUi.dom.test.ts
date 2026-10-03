import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { initI18n } from '@core/i18n';
import { mountActions } from '@core/ui/actions';
import chapters from '../../chapters.html?raw';
import en from '../../locales/en.json';
import {
  FLIGHT_MODE_IDS,
  MOMENT_IDS,
  MOVE_IDS,
  PACKET_RATES,
  SPEEDSTER_IDS,
  VIDEO_IDS,
} from '../ids';
import { MOMENTS, SORTIE_SECONDS, flightMinutes, sortieShareAt } from '../model';
import { createFpvStore } from '../state';
import type { FpvStore } from '../state';
import { CHAPTER_ACTIONS } from './actions';
import { formatMinutes, formatPercent } from './format';
import { FPV_READOUTS } from './readouts';
import { fill, isFilled } from './testing';
import { mountFpvUi } from '.';

const { units } = en;

function readout(id: string): string | null | undefined {
  return document.querySelector(`[data-readout="${id}"]`)?.textContent;
}

function click(action: string, value: string): void {
  document.querySelector<HTMLElement>(`[data-action="${action}"][data-value="${value}"]`)?.click();
}

function pressed(action: string, value: string): string | null | undefined {
  return document
    .querySelector(`[data-action="${action}"][data-value="${value}"]`)
    ?.getAttribute('aria-pressed');
}

function slide(control: string, value: number): void {
  const input = document.querySelector<HTMLInputElement>(`[data-control="${control}"]`);
  if (!input) throw new Error(`No control ${control}`);
  input.value = String(value);
  input.dispatchEvent(new Event('input'));
}

function output(control: string): string | null | undefined {
  return document.querySelector(`output[for="${control}"]`)?.textContent;
}

function expectAllFilled(): void {
  document
    .querySelectorAll('[data-readout]')
    .forEach((element) =>
      expect(isFilled(element.textContent), element.getAttribute('data-readout') ?? '').toBe(true),
    );
}

describe('chapter widgets', () => {
  let store: FpvStore;
  let dispose: () => void;

  beforeAll(() => initI18n({ en: () => Promise.resolve(en) }));

  beforeEach(() => {
    document.body.innerHTML = chapters;
    store = createFpvStore({ playing: false, phase: 0 });
    dispose = mountFpvUi(document, store);
    mountActions(document, store, CHAPTER_ACTIONS);
  });

  afterEach(() => dispose());

  it('follows the battery, the distance and the share flown in the overview', () => {
    expect(readout('overview-battery')).toBe(fill(units.battery, { volts: '25.2', share: '100' }));
    expect(readout('overview-distance')).toBe(fill(units.m, { value: '6' }));
    expect(readout('overview-done')).toBe(fill(units.percent, { value: '0' }));
    click('moment', 'onStation');
    expect(pressed('moment', 'onStation')).toBe('true');
    expect(readout('overview-distance')).toBe(fill(units.m, { value: '358' }));
    expect(readout('overview-done')).toBe(formatPercent(sortieShareAt(MOMENTS.onStation)));
    click('moment', 'touchdown');
    expect(readout('overview-distance')).toBe(fill(units.m, { value: '6' }));
    expect(readout('overview-battery')).not.toBe(
      fill(units.battery, { volts: '25.2', share: '100' }),
    );
  });

  it('shows the motor shares and the reason for each move', () => {
    expect(pressed('move', 'hover')).toBe('true');
    expect(readout('flight-mix')).toBe(
      fill(en.flight.mix.hover, { m1: '18', m2: '18', m3: '18', m4: '18' }),
    );
    expect(readout('flight-why')).toBe(en.flight.why.hover);
    click('move', 'forward');
    expect(pressed('move', 'forward')).toBe('true');
    expect(readout('flight-mix')).toBe(
      fill(en.flight.mix.forward, { m1: '22', m2: '12', m3: '22', m4: '12' }),
    );
    expect(readout('flight-why')).toBe(en.flight.why.forward);
  });

  it('turns the tilt slider into push, thrust and sprint time', () => {
    expect(output('tilt')).toBe(fill(units.degrees, { value: '30' }));
    expect(readout('tilt-push')).toBe(fill(units.push, { ms2: '5.7', g: '0.58' }));
    expect(readout('tilt-thrust')).toBe(fill(units.ofHover, { percent: '115' }));
    expect(readout('tilt-sprint')).toBe(fill(units.seconds, { value: '4.9' }));
    slide('tilt', 45);
    expect(store.getState().tilt).toBe(45);
    expect(output('tilt')).toBe(fill(units.degrees, { value: '45' }));
    expect(readout('tilt-push')).toBe(fill(units.push, { ms2: '9.8', g: '1.00' }));
    expect(readout('tilt-thrust')).toBe(fill(units.ofHover, { percent: '141' }));
    expect(readout('tilt-sprint')).toBe(fill(units.seconds, { value: '2.8' }));
    slide('tilt', 0);
    expect(readout('tilt-sprint')).toBe(fill(units.seconds, { value: '∞' }));
  });

  it('describes the stick and the limit of each flight mode', () => {
    expect(pressed('flightMode', 'acro')).toBe('true');
    expect(readout('mode-stick')).toBe(en.mode.stick.acro);
    expect(readout('mode-limit')).toContain('670');
    click('flightMode', 'angle');
    expect(pressed('flightMode', 'angle')).toBe('true');
    expect(readout('mode-stick')).toBe(en.mode.stick.angle);
    expect(readout('mode-limit')).toBe(en.mode.limit.angle);
  });

  it('compares the video systems and the packet rates in the link chapter', () => {
    expect(pressed('video', 'analogue')).toBe('true');
    expect(readout('link-latency')).toBe(en.link.latency.analogue);
    click('video', 'digital');
    expect(store.getState().video).toBe('digital');
    expect(readout('link-picture')).toBe(en.link.picture.digital);
    expect(pressed('packetRate', '250')).toBe('true');
    expect(readout('rate-period')).toBe(fill(units.ms, { value: '4' }));
    expect(readout('rate-sensitivity')).toBe(fill(units.dbm, { value: '−108' }));
    expect(readout('rate-reach')).toBe(fill(units.times, { factor: '1.4' }));
    click('packetRate', '50');
    expect(pressed('packetRate', '50')).toBe('true');
    expect(readout('rate-period')).toBe(fill(units.ms, { value: '20' }));
    expect(readout('rate-sensitivity')).toBe(fill(units.dbm, { value: '−115' }));
    expect(readout('rate-reach')).toBe(fill(units.times, { factor: '3.2' }));
    expect(readout('link-distance')).toBe(fill(units.m, { value: '6' }));
    expect(readout('link-signal')).toBe(en.link.signal.strong);
    click('moment', 'onStation');
    expect(readout('link-distance')).toBe(fill(units.m, { value: '358' }));
    expect(readout('link-signal')).toBe(en.link.signal.strong);
  });

  it('loads the drone with the payload slider and reads the live pack', () => {
    expect(output('payload')).toBe(fill(units.g, { value: '300' }));
    expect(readout('power-weight')).toBe(fill(units.g, { value: '1,400' }));
    expect(readout('power-twr')).toBe(fill(units.ratio, { ratio: '5.7' }));
    expect(readout('power-hover')).toBe(fill(units.hover, { thrust: '18', speed: '42' }));
    expect(readout('power-minutes')).toBe(formatMinutes(flightMinutes(300)));
    expect(readout('power-volts')).toBe(fill(units.volts, { value: '25.2' }));
    expect(readout('power-amps')).toBe(fill(units.amps, { value: '0.0' }));
    slide('payload', 1000);
    expect(store.getState().payload).toBe(1000);
    expect(output('payload')).toBe(fill(units.g, { value: '1,000' }));
    expect(readout('power-weight')).toBe(fill(units.g, { value: '2,100' }));
    expect(readout('power-twr')).toBe(fill(units.ratio, { ratio: '3.8' }));
    expect(readout('power-minutes')).toBe(formatMinutes(flightMinutes(1000)));
    click('moment', 'cruise');
    expect(readout('power-amps')).not.toBe(fill(units.amps, { value: '0.0' }));
    expect(readout('power-volts')).not.toBe(fill(units.volts, { value: '25.2' }));
  });

  it('races the three machines over the field', () => {
    expect(pressed('speedster', 'longRange')).toBe('true');
    expect(readout('limits-speed')).toBe(fill(units.kmh, { value: '140' }));
    expect(readout('limits-field')).toBe(fill(units.seconds, { value: '9' }));
    expect(readout('limits-who')).toBe(en.speeds.who.longRange);
    click('speedster', 'record');
    expect(pressed('speedster', 'record')).toBe('true');
    expect(readout('limits-speed')).toBe(fill(units.kmh, { value: '658' }));
    expect(readout('limits-field')).toBe(fill(units.seconds, { value: '1.9' }));
    expect(readout('limits-who')).toBe(en.speeds.who.record);
  });

  it('fills every readout at every moment and chip', () => {
    MOMENT_IDS.forEach((moment) => {
      store.getState().seekMoment(moment);
      MOVE_IDS.forEach((move) => {
        store.setState({ move });
        expectAllFilled();
      });
      FLIGHT_MODE_IDS.forEach((flightMode) => {
        store.setState({ flightMode });
        expectAllFilled();
      });
      PACKET_RATES.forEach((packetRate) => {
        store.setState({ packetRate });
        expectAllFilled();
      });
      VIDEO_IDS.forEach((video) => {
        store.setState({ video });
        expectAllFilled();
      });
      SPEEDSTER_IDS.forEach((speedster) => {
        store.setState({ speedster });
        expectAllFilled();
      });
    });
  });

  it('fills every gauge readout through the whole sortie', () => {
    for (let phase = 0; phase <= SORTIE_SECONDS; phase += 2) {
      const state = createFpvStore({ phase }).getState();
      FPV_READOUTS.forEach((row) =>
        expect(isFilled(row.value(state)), `${row.id} at ${phase}`).toBe(true),
      );
    }
  });

  it('stops updating once disposed', () => {
    dispose();
    store.getState().setPhase(40);
    expect(readout('overview-done')).toBe(fill(units.percent, { value: '0' }));
  });
});
