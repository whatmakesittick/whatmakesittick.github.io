import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { initI18n } from '@core/i18n';
import { mountActions } from '@core/ui/actions';
import chapters from '../../chapters.html?raw';
import en from '../../locales/en.json';
import { FIT_IDS, HELM_IDS, LINK_MODES, SEA_STATE_IDS, SPEED_MARK_IDS } from '../ids';
import { HELD_PHASE, MOMENTS, distanceAt, knotsAtThrottle, speedAt, throttleAt } from '../model';
import { createNavalDroneStore } from '../state';
import type { NavalDroneStore } from '../state';
import { CHAPTER_ACTIONS } from './actions';
import {
  formatBoatSpeed,
  formatDistance,
  formatHullRatio,
  formatPercent,
  formatTrialSpeed,
} from './format';
import { fill, isFilled } from './testing';
import { mountNavalDroneUi } from '.';

const { units, hull, jet, link, horizon, fleet } = en;
const PERCENT = 100;

function readout(id: string): string | null | undefined {
  return document.querySelector(`[data-readout="${id}"]`)?.textContent;
}

function allReadouts(): string[] {
  return [...document.querySelectorAll('[data-readout]')].map((node) => node.textContent ?? '');
}

function click(action: string, value: string): void {
  document.querySelector<HTMLElement>(`[data-action="${action}"][data-value="${value}"]`)?.click();
}

function pressed(action: string, value: string): string | null | undefined {
  return document
    .querySelector(`[data-action="${action}"][data-value="${value}"]`)
    ?.getAttribute('aria-pressed');
}

function input(control: string): HTMLInputElement {
  const found = document.querySelector<HTMLInputElement>(`[data-control="${control}"]`);
  if (!found) throw new Error(`No control ${control}`);
  return found;
}

function slide(control: string, value: number): void {
  const range = input(control);
  range.value = String(value);
  range.dispatchEvent(new Event('input'));
}

function output(control: string): string | null | undefined {
  return document.querySelector(`output[for="${control}"]`)?.textContent;
}

describe('chapter widgets', () => {
  let store: NavalDroneStore;
  let dispose: () => void;

  beforeAll(() => initI18n({ en: () => Promise.resolve(en) }));

  beforeEach(() => {
    document.body.innerHTML = chapters;
    store = createNavalDroneStore({ playing: false, phase: 0 });
    dispose = mountNavalDroneUi(document, store);
    mountActions(document, store, CHAPTER_ACTIONS);
  });

  afterEach(() => dispose());

  it('offers a chip for every option the chapters switch', () => {
    const values = (action: string) =>
      [...document.querySelectorAll(`[data-action="${action}"]`)].map((node) =>
        node.getAttribute('data-value'),
      );
    expect(values('speedMark')).toEqual([...SPEED_MARK_IDS]);
    expect(values('helm')).toEqual([...HELM_IDS]);
    expect(values('linkMode')).toEqual([...LINK_MODES]);
    expect(values('seaState')).toEqual([...SEA_STATE_IDS]);
    expect(values('fit')).toEqual([...FIT_IDS]);
  });

  it('follows the hull mode, the distance covered and the share of the run in the overview', () => {
    expect(readout('overview-mode')).toBe(en.mode.floating);
    expect(readout('overview-covered')).toBe(fill(units.m, { value: '0' }));
    expect(readout('overview-done')).toBe(fill(units.percent, { value: '0' }));
    click('moment', 'topSpeed');
    expect(pressed('moment', 'topSpeed')).toBe('true');
    expect(readout('overview-mode')).toBe(en.mode.planing);
    expect(readout('overview-covered')).toBe(formatDistance(distanceAt(MOMENTS.topSpeed)));
    expect(readout('overview-done')).toBe(formatPercent(MOMENTS.topSpeed / 120));
    click('moment', 'alongside');
    expect(readout('overview-done')).toBe(fill(units.percent, { value: '100' }));
  });

  it('follows the run on the hull slider until the reader takes the boat over', () => {
    store.getState().setPhase(MOMENTS.humpPeak);
    expect(Number(input('trial-knots').value)).toBeCloseTo(speedAt(MOMENTS.humpPeak), 6);
    expect(output('trial-knots')).toBe(formatTrialSpeed(11));
    expect(readout('hull-mode')).toBe(en.mode.hump);
    expect(pressed('speedMark', 'hump')).toBe('true');
    store.getState().play();
    slide('trial-knots', 42);
    expect(store.getState()).toMatchObject({ trialKnots: 42, playing: false });
    expect(readout('hull-mode')).toBe(en.mode.planing);
    expect(readout('hull-trim')).toBe(fill(units.degrees, { value: '2.5' }));
    expect(readout('hull-wetted')).toBe(fill(hull.wetted, { m: '1.7', rest: '5.1' }));
    expect(readout('hull-ratio')).toBe(formatHullRatio(42));
    expect(readout('hull-lift')).toContain('98');
    expect(pressed('speedMark', 'top')).toBe('true');
    store.getState().play();
    expect(store.getState().trialKnots).toBeNull();
    expect(output('trial-knots')).toBe(formatTrialSpeed(speedAt(store.getState().phase)));
  });

  it('holds the boat at each speed mark', () => {
    click('speedMark', 'hullSpeed');
    expect(output('trial-knots')).toBe(formatTrialSpeed(5.7));
    expect(readout('hull-ratio')).toBe(fill(hull.ratio, { times: '1.0', hullSpeed: '5.7' }));
    click('speedMark', 'planing');
    expect(readout('hull-mode')).toBe(en.mode.planing);
    slide('trial-knots', 0);
    expect(readout('hull-ratio')).toBe(fill(hull.ratioStill, { hullSpeed: '5.7' }));
  });

  it('follows the run throttle on the jet slider and holds the boat when it moves', () => {
    store.getState().setPhase(HELD_PHASE);
    expect(Number(input('throttle').value)).toBe(Math.round(throttleAt(22) * PERCENT));
    expect(readout('jet-boat')).toBe(formatBoatSpeed(22));
    slide('throttle', 100);
    expect(store.getState().trialKnots).toBeCloseTo(knotsAtThrottle(1), 6);
    expect(output('throttle')).toBe(fill(units.percent, { value: '100' }));
    expect(readout('jet-flow')).toBe(fill(jet.flow, { kg: '213', litres: '207' }));
    expect(readout('jet-velocity')).toBe(fill(units.mps, { ms: '32', kmh: '117' }));
    expect(readout('jet-thrust')).toBe(fill(units.kilonewtons, { value: '2.30' }));
    expect(readout('jet-efficiency')).toBe(fill(units.percent, { value: '80' }));
  });

  it('swings the nozzle and backs the boat with the helm chips', () => {
    store.getState().setPhase(HELD_PHASE);
    expect(readout('jet-push')).toBe(jet.push.straight);
    click('helm', 'left');
    expect(pressed('helm', 'left')).toBe('true');
    expect(store.getState().trialKnots).toBe(22);
    expect(readout('jet-push')).toBe(fill(jet.push.left, { angle: '27' }));
    click('helm', 'right');
    expect(readout('jet-push')).toBe(fill(jet.push.right, { angle: '27' }));
    click('helm', 'reverse');
    expect(readout('jet-push')).toBe(jet.push.reverse);
    expect(readout('jet-boat')).toBe(jet.backing);
    expect(readout('jet-thrust')).toBe(jet.astern);
    expect(readout('jet-efficiency')).toBe(jet.noEfficiency);
    expect(output('throttle')).toBe(formatPercent(throttleAt(22)));
  });

  it('turns the video delay into distance and follows the link mode', () => {
    store.getState().setPhase(MOMENTS.topSpeed);
    expect(output('video-delay')).toBe(fill(units.ms, { value: '250' }));
    expect(readout('link-now')).toBe(fill(link.now, { m: '5.4', kn: '42' }));
    expect(readout('link-top')).toBe(fill(link.top, { m: '5.4', lengths: '1.0' }));
    slide('video-delay', 1000);
    expect(readout('link-top')).toBe(fill(link.top, { m: '21.6', lengths: '3.9' }));
    expect(readout('link-carrier')).toBe(link.carrier.satellite);
    click('linkMode', 'backup');
    expect(pressed('linkMode', 'backup')).toBe('true');
    expect(readout('link-boat')).toBe(link.boat.backup);
    click('linkMode', 'lost');
    expect(readout('link-now')).toBe(link.nowLost);
    expect(readout('link-carrier')).toBe(link.carrier.lost);
  });

  it('reads the radar line of sight and the sea state', () => {
    expect(output('radar-height')).toBe(fill(units.m, { value: '20' }));
    expect(readout('horizon-radar')).toBe(fill(units.km, { value: '21.3' }));
    expect(readout('horizon-minutes')).toBe(fill(units.minutes, { value: '16.5' }));
    slide('radar-height', 5);
    expect(readout('horizon-radar')).toBe(fill(units.km, { value: '12.1' }));
    expect(readout('horizon-camera')).toBe(fill(horizon.camera, { km: '3.2', m: '0.7' }));
    expect(readout('horizon-detect')).toBe(fill(horizon.detect, { km: '9.3', min: '7.1' }));
    expect(readout('horizon-hidden')).toBe(horizon.hidden.smooth);
    click('seaState', 'rough');
    expect(pressed('seaState', 'rough')).toBe('true');
    expect(readout('horizon-detect')).toBe(horizon.detectBeyond);
    expect(readout('horizon-waves')).toBe(fill(horizon.waves.rough, { from: '2.5', to: '4' }));
    expect(readout('horizon-hidden')).toBe(horizon.hidden.rough);
  });

  it('quotes the payload for the deck fit, the cost and the ship value', () => {
    expect(readout('fleet-carries')).toBe(fill(fleet.carries.standard, { kg: '320' }));
    expect(readout('fleet-cost')).toBe(fill(fleet.cost, { from: '250,000', to: '273,000' }));
    expect(readout('fleet-ship')).toBe(fill(fleet.ship, { value: '65' }));
    click('fit', 'missile');
    expect(pressed('fit', 'missile')).toBe('true');
    expect(readout('fleet-carries')).toBe(fleet.carries.missile);
  });

  it('fills every readout in every chapter state', () => {
    [0, 28, 60, 100, 120].forEach((phase) => {
      store.getState().setPhase(phase);
      allReadouts().forEach((text) => expect(isFilled(text), `${phase}: ${text}`).toBe(true));
    });
    click('helm', 'reverse');
    click('linkMode', 'lost');
    click('seaState', 'rough');
    allReadouts().forEach((text) => expect(isFilled(text), text).toBe(true));
  });
});
