import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { mountActions } from '@core/ui/actions';
import { MOMENT_IDS } from '../ids';
import { MOMENTS, PHASE_RANGES } from '../model';
import { createMaglevTrainStore } from '../state';
import type { MaglevTrainStore } from '../state';
import { CHAPTER_ACTIONS } from './actions';
import { CHAPTER_MARKUP, TEST_LOCALE, fill, initTestLocale, isFilled } from './testing';
import { mountMaglevTrainUi } from '.';

const { units, chapters } = TEST_LOCALE;
const { ride, float, centre, motor, stop, compare } = chapters;
const READOUT_COUNT = 26;
const LIFTING_PHASE = 30;
const BRAKING_PHASE = 700;
const SETTLING_PHASE = 962;
const POWER_CUT_SETTLING_PHASE = 933;
const POWER_CUT_SKIDDING_PHASE = 936;
const LIVE_READOUTS = ['ghost', 'lift', 'frequency', 'section', 'flow', 'onboard'];

function readout(id: string): string | null | undefined {
  return document.querySelector(`[data-readout="${id}"]`)?.textContent;
}

function click(action: string, value: string): void {
  document.querySelector<HTMLElement>(`[data-action="${action}"][data-value="${value}"]`)?.click();
}

function pressed(action: string, value: string): (string | null)[] {
  return [...document.querySelectorAll(`[data-action="${action}"][data-value="${value}"]`)].map(
    (chip) => chip.getAttribute('aria-pressed'),
  );
}

function readoutTexts(): (string | null)[] {
  return [...document.querySelectorAll('[data-readout]')].map((node) => node.textContent);
}

function liveTexts(): (string | null | undefined)[] {
  return LIVE_READOUTS.map(readout);
}

function tripText(minutes: string, seconds: string): string {
  return fill(ride.tripValue, { time: fill(units.minutesSeconds, { minutes, seconds }) });
}

describe('chapter widgets', () => {
  let store: MaglevTrainStore;
  let dispose: () => void;

  beforeAll(() => initTestLocale());

  beforeEach(() => {
    document.body.innerHTML = CHAPTER_MARKUP;
    store = createMaglevTrainStore({ playing: false, phase: 0 });
    dispose = mountMaglevTrainUi(document, store);
    mountActions(document, store, CHAPTER_ACTIONS);
  });

  afterEach(() => dispose());

  it('fills every readout with a finished text', () => {
    const texts = readoutTexts();
    expect(texts).toHaveLength(READOUT_COUNT);
    texts.forEach((text) => expect(isFilled(text), text ?? '').toBe(true));
  });

  it('shows the fixed numbers of the line, the gap, the guideway and the motor', () => {
    expect(readout('trip')).toBe(tripText('7', '29'));
    expect(readout('top')).toBe(ride.topValue.kmh430);
    expect(readout('line')).toBe(fill(ride.lineValue, { km: '30' }));
    expect(readout('target')).toBe(fill(units.mm, { value: '10' }));
    expect(readout('band')).toBe(fill(units.mmRange, { min: '8', max: '12' }));
    expect(readout('clearance')).toBe(fill(units.mm, { value: '150' }));
    expect(readout('mass')).toBe(fill(float.massValue, { tonnes: '53', sections: '6' }));
    expect(readout('guideGap')).toBe(fill(units.mm, { value: '10' }));
    expect(readout('curves')).toBe(fill(centre.curvesValue, { small: '2,257', large: '4,502' }));
    expect(readout('beam')).toBe(fill(centre.beamValue, { metres: '25', tonnes: '190' }));
    expect(readout('switches')).toBe(fill(centre.switchesValue, { count: '8' }));
    expect(readout('pitch')).toBe(fill(units.mm, { value: '258' }));
    expect(readout('wavelength')).toBe(fill(units.mm, { value: '516' }));
    expect(readout('converter')).toBe(fill(units.hzRange, { min: '0', max: '300' }));
    expect(readout('brakeDistance')).toBe(fill(stop.distanceValue, { km: '11', kmh: '430' }));
    expect(readout('skid')).toBe(fill(stop.skidValue, { kmh: '10' }));
    expect(readout('energy')).toBe(fill(compare.energyFast, { maglev: '52', kmh: '400' }));
  });

  it('starts with the train on its skids, the motor off and the ghost at the platform', () => {
    expect(readout('ghost')).toBe(ride.ghostStanding);
    expect(readout('lift')).toBe(float.liftValue.skids);
    expect(readout('frequency')).toBe(fill(units.hz, { value: '0' }));
    expect(readout('section')).toBe(motor.sectionOff);
    expect(readout('flow')).toBe(stop.flowValue.none);
    expect(readout('onboard')).toBe(stop.onboardValue.rails);
  });

  it('follows the ride as the phase changes', () => {
    store.getState().setPhase(LIFTING_PHASE);
    expect(readout('lift')).toBe(float.liftValue.lifting);
    store.getState().setPhase(MOMENTS.lifted);
    expect(readout('lift')).toBe(float.liftValue.floating);
    const floating = liveTexts();
    store.getState().setPhase(MOMENTS.fullSpeed);
    expect(liveTexts()).not.toEqual(floating);
    expect(readout('ghost')).toBe(fill(ride.ghostValue, { km: '12.4', kmh: '100' }));
    expect(readout('frequency')).toBe(fill(units.hz, { value: '231' }));
    expect(readout('section')).toBe(fill(motor.sectionValue, { index: '13', count: '25' }));
    expect(readout('flow')).toBe(stop.flowValue.drive);
    expect(readout('onboard')).toBe(stop.onboardValue.generator);
    store.getState().setPhase(BRAKING_PHASE);
    expect(readout('flow')).toBe(stop.flowValue.regen);
  });

  it('sets the train down at the platform before it rests on its skids', () => {
    store.getState().setPhase(PHASE_RANGES.settle.start);
    expect(readout('lift')).toBe(float.liftValue.floating);
    store.getState().setPhase(SETTLING_PHASE);
    expect(readout('lift')).toBe(float.liftValue.settling);
    store.getState().setPhase(MOMENTS.touchdown);
    expect(readout('lift')).toBe(float.liftValue.skids);
  });

  it('sets the train down below the skid speed after a power cut', () => {
    store.getState().setPhase(BRAKING_PHASE);
    click('brakeMode', 'eddy');
    expect(readout('lift')).toBe(float.liftValue.floating);
    store.getState().setPhase(POWER_CUT_SETTLING_PHASE);
    expect(readout('lift')).toBe(float.liftValue.settling);
    store.getState().setPhase(POWER_CUT_SKIDDING_PHASE);
    expect(readout('lift')).toBe(float.liftValue.skids);
  });

  it('cuts the motor and runs on batteries after a power cut', () => {
    store.getState().setPhase(BRAKING_PHASE);
    click('brakeMode', 'eddy');
    expect(store.getState().brakeMode).toBe('eddy');
    expect(pressed('brakeMode', 'eddy')).toEqual(['true']);
    expect(pressed('brakeMode', 'regen')).toEqual(['false']);
    expect(readout('flow')).toBe(stop.flowValue.battery);
    expect(readout('onboard')).toBe(stop.onboardValue.battery);
    expect(readout('section')).toBe(motor.sectionOff);
  });

  it('retimes the trip, the braking and the energy at 300 km/h', () => {
    click('topSpeed', 'kmh300');
    expect(store.getState().topSpeed).toBe('kmh300');
    expect(pressed('topSpeed', 'kmh300')).toEqual(['true']);
    expect(pressed('topSpeed', 'kmh430')).toEqual(['false']);
    expect(readout('trip')).toBe(tripText('8', '16'));
    expect(readout('top')).toBe(ride.topValue.kmh300);
    expect(readout('brakeDistance')).toBe(fill(stop.distanceValue, { km: '5.3', kmh: '300' }));
    expect(readout('energy')).toBe(
      fill(compare.energyValue, { maglev: '34', wheel: '51', kmh: '300' }),
    );
  });

  it('reads out each train in the line-up with the year left ungrouped', () => {
    expect(pressed('compare', 'transrapid')).toEqual(['true']);
    expect(readout('cmpGap')).toBe(fill(units.mm, { value: '10' }));
    expect(readout('cmpRecord')).toBe(fill(compare.recordValue, { kmh: '501', year: '2003' }));
    expect(readout('cmpLift')).toBe(compare.liftValue.transrapid);
    click('compare', 'scmaglev');
    expect(pressed('compare', 'scmaglev')).toEqual(['true']);
    expect(pressed('compare', 'transrapid')).toEqual(['false']);
    expect(readout('cmpGap')).toBe(fill(units.mm, { value: '100' }));
    expect(readout('cmpRecord')).toBe(fill(compare.recordValue, { kmh: '603', year: '2015' }));
    expect(readout('cmpLift')).toBe(compare.liftValue.scmaglev);
    click('compare', 'wheelRail');
    expect(readout('cmpGap')).toBe(compare.gapWheels);
    expect(readout('cmpRecord')).toBe(fill(compare.recordValue, { kmh: '574.8', year: '2007' }));
    expect(readout('cmpLift')).toBe(compare.liftValue.wheelRail);
  });

  it('pushes the train from the nudge chips without leaving them pressed', () => {
    click('nudge', 'bump');
    expect(store.getState()).toMatchObject({ nudge: 'bump', nudgeToken: 1 });
    expect(pressed('nudge', 'bump')).toEqual(['false']);
    click('nudge', 'gust');
    expect(store.getState()).toMatchObject({ nudge: 'gust', nudgeToken: 2 });
    expect(pressed('nudge', 'gust')).toEqual(['false']);
  });

  it('seeks to each moment chip, pauses there and marks only that chip', () => {
    const chips = [...document.querySelectorAll<HTMLElement>('[data-action="moment"]')];
    expect(chips.map((chip) => chip.dataset.value)).toEqual([...MOMENT_IDS]);
    store.getState().play();
    MOMENT_IDS.forEach((moment) => {
      click('moment', moment);
      expect(store.getState()).toMatchObject({ phase: MOMENTS[moment], playing: false });
      MOMENT_IDS.forEach((other) =>
        expect(pressed('moment', other), other).toEqual([String(other === moment)]),
      );
    });
    store.getState().play();
    MOMENT_IDS.forEach((moment) => expect(pressed('moment', moment)).toEqual(['false']));
  });
});
