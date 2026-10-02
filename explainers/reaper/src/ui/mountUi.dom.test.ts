import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { initI18n } from '@core/i18n';
import { mountActions } from '@core/ui/actions';
import chapters from '../../chapters.html?raw';
import en from '../../locales/en.json';
import { COMPARISON_IDS, LOAD_IDS, MOMENT_IDS, SENSOR_MODE_IDS } from '../ids';
import { MOMENTS, unitsAt } from '../model';
import { createReaperStore } from '../state';
import type { ReaperStore } from '../state';
import { CHAPTER_ACTIONS } from './actions';
import { fill, isFilled } from './testing';
import { mountReaperUi } from '.';

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

describe('chapter widgets', () => {
  let store: ReaperStore;
  let dispose: () => void;

  beforeAll(() => initI18n({ en: () => Promise.resolve(en) }));

  beforeEach(() => {
    document.body.innerHTML = chapters;
    store = createReaperStore({ playing: false, phase: 0 });
    dispose = mountReaperUi(document, store);
    mountActions(document, store, CHAPTER_ACTIONS);
  });

  afterEach(() => dispose());

  it('follows the link, the fuel and the share flown in the overview', () => {
    expect(readout('overview-link')).toBe(en.link.mode.los);
    expect(readout('overview-fuel')).toBe(fill(units.kg, { value: '1,814' }));
    expect(readout('overview-done')).toBe(fill(units.percent, { value: '0' }));
    click('moment', 'onStation');
    expect(pressed('moment', 'onStation')).toBe('true');
    expect(readout('overview-link')).toBe(en.link.mode.sat);
    expect(readout('overview-done')).toBe(fill(units.percent, { value: '14' }));
    click('moment', 'touchdown');
    expect(readout('overview-link')).toBe(en.link.mode.los);
    expect(readout('overview-done')).toBe(fill(units.percent, { value: '99' }));
  });

  it('compares the Reaper with the aircraft the reader picks', () => {
    expect(pressed('comparison', 'predator')).toBe('true');
    ['4,760', '1,020', '4.7'].forEach((value) => expect(readout('flight-weight')).toContain(value));
    click('comparison', 'cessna');
    expect(pressed('comparison', 'cessna')).toBe('true');
    ['20.1', '11', '17', '7.5', '2.3'].forEach((value) =>
      expect(readout('flight-span')).toContain(value),
    );
    expect(readout('flight-engine')).toContain('900');
    ['flight-span', 'flight-weight', 'flight-engine'].forEach((id) =>
      expect(isFilled(readout(id)), id).toBe(true),
    );
  });

  it('hands the aircraft to the satellite and back in the link chapter', () => {
    click('moment', 'liftoff');
    expect(readout('link-mode')).toBe(en.link.mode.los);
    expect(readout('link-crew')).toBe(en.link.crew.los);
    const radioDelay = readout('link-delay');
    click('moment', 'handover');
    expect(readout('link-mode')).toBe(en.link.mode.sat);
    expect(readout('link-crew')).toBe(en.link.crew.sat);
    expect(readout('link-delay')).not.toBe(radioDelay);
    expect(readout('link-delay')).toContain('0.48 s');
    expect(isFilled(readout('link-delay'))).toBe(true);
    click('moment', 'handback');
    expect(readout('link-crew')).toBe(en.link.crew.los);
    expect(readout('link-delay')).toBe(radioDelay);
  });

  it('switches what the sensor ball shows and where it looks', () => {
    expect(readout('sensor-shows')).toBe(en.sensor.shows.day);
    expect(readout('sensor-aim')).toBe(en.sensor.aim.ahead);
    click('sensorMode', 'infrared');
    expect(pressed('sensorMode', 'infrared')).toBe('true');
    expect(readout('sensor-shows')).toBe(en.sensor.shows.infrared);
    store.getState().setPhase(50);
    expect(readout('sensor-aim')).toBe(en.sensor.aim.target);
  });

  it('times the missile with the range slider and follows it to the target', () => {
    expect(output('target-range')).toBe(fill(units.km, { value: '8' }));
    expect(readout('strike-time')).toBe(fill(units.secondsRange, { from: '18', to: '27' }));
    slide('target-range', 4.5);
    expect(store.getState().targetRange).toBe(4.5);
    expect(output('target-range')).toBe(fill(units.km, { value: '4.5' }));
    expect(readout('strike-time')).toBe(fill(units.secondsRange, { from: '10', to: '15' }));
    expect(readout('strike-laser')).toBe(readout('strike-time'));
    expect(readout('strike-missile')).toBe(en.strike.stage.armed);
    click('moment', 'launch');
    store.getState().setPhase(MOMENTS.launch + 1);
    expect(readout('strike-missile')).toBe(en.strike.stage.flying);
    click('moment', 'impact');
    expect(readout('strike-missile')).toBe(en.strike.stage.hit);
    store.getState().setPhase(unitsAt(600));
    expect(readout('strike-missile')).toBe(en.strike.stage.done);
  });

  it('trades hours on station against the distance and the load', () => {
    expect(output('area-distance')).toBe(fill(units.km, { value: '400' }));
    expect(readout('endurance-hours')).toBe(fill(units.hours, { value: '14' }));
    expect(readout('endurance-transit')).toBe(
      fill(units.hoursMinutes, { hours: '1', minutes: '5' }),
    );
    expect(readout('endurance-station')).toBe(
      fill(units.hoursMinutes, { hours: '10', minutes: '50' }),
    );
    click('load', 'clean');
    expect(pressed('load', 'clean')).toBe('true');
    expect(readout('endurance-hours')).toBe(fill(units.hours, { value: '27' }));
    expect(readout('endurance-station')).toBe(
      fill(units.hoursMinutes, { hours: '23', minutes: '50' }),
    );
    slide('area-distance', 1850);
    expect(store.getState().areaDistance).toBe(1850);
    expect(readout('endurance-transit')).toBe(
      fill(units.hoursMinutes, { hours: '5', minutes: '0' }),
    );
    expect(readout('endurance-station')).toBe(
      fill(units.hoursMinutes, { hours: '16', minutes: '0' }),
    );
  });

  it('fills every readout at every moment, comparison, sensor mode and load', () => {
    const readouts = () => [...document.querySelectorAll('[data-readout]')];
    MOMENT_IDS.forEach((moment) =>
      COMPARISON_IDS.forEach((comparison) =>
        SENSOR_MODE_IDS.forEach((sensorMode) =>
          LOAD_IDS.forEach((load) => {
            store.getState().seekMoment(moment);
            store.setState({ comparison, sensorMode, load });
            readouts().forEach((element) =>
              expect(
                isFilled(element.textContent),
                element.getAttribute('data-readout') ?? '',
              ).toBe(true),
            );
          }),
        ),
      ),
    );
  });

  it('stops updating once disposed', () => {
    dispose();
    store.getState().setPhase(50);
    expect(readout('overview-link')).toBe(en.link.mode.los);
  });
});
