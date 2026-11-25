import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { mountActions } from '@core/ui/actions';
import { HELD_ELBOW_DEG, MOMENTS } from '../model';
import { createRunStore } from '../state';
import type { RunStore } from '../state';
import { CHAPTER_ACTIONS } from './actions';
import { CHAPTER_FIXTURE, TEST_LOCALE, fill, initTestLocale, isFilled } from './testing';
import { mountRunUi } from '.';

const { units, chapters, controls, timeline } = TEST_LOCALE;

function readout(id: string): string | null | undefined {
  return document.querySelector(`[data-readout="${id}"]`)?.textContent;
}

function click(action: string, value: string, preset = 'stride'): void {
  document
    .querySelector<HTMLElement>(
      `[data-preset="${preset}"] [data-action="${action}"][data-value="${value}"]`,
    )
    ?.click();
}

function slide(id: string, value: number): void {
  const input = document.querySelector<HTMLInputElement>(`#${id}`);
  if (!input) throw new Error('No range');
  input.value = String(value);
  input.dispatchEvent(new Event('input'));
}

describe('chapter widgets', () => {
  let store: RunStore;
  let dispose: () => void;

  beforeAll(() => initTestLocale());

  beforeEach(() => {
    document.body.innerHTML = CHAPTER_FIXTURE;
    store = createRunStore({ playing: false, phase: MOMENTS.peakForce });
    dispose = mountRunUi(document, store) as () => void;
    mountActions(document, store, CHAPTER_ACTIONS);
  });

  afterEach(() => dispose());

  it('fills every readout with a finished text', () => {
    const texts = [...document.querySelectorAll('[data-readout]')].map((node) => node.textContent);
    expect(texts).toHaveLength(38);
    texts.forEach((text) => expect(isFilled(text), text ?? '').toBe(true));
  });

  it('shows the steady pace in the stride chapter', () => {
    expect(readout('strideSpeed')).toBe(fill(units.metersPerSecond, { value: '3.5' }));
    expect(readout('strideCadence')).toBe(fill(units.perMinute, { value: '170' }));
    expect(readout('strideStep')).toBe(fill(units.meters, { value: '1.23' }));
    expect(readout('strideSum')).toBe(
      fill(chapters.stride.sumValue, { cadence: '170', step: '1.23', speed: '3.5' }),
    );
    expect(readout('strideFloat')).toBe(fill(units.percent, { value: '27' }));
    expect(readout('stridePhase')).toBe(timeline.phase.landing);
  });

  it('reacts to the scrubber', () => {
    const before = [readout('springForce'), readout('springKnee'), readout('springPhase')];
    store.getState().setPhase(MOMENTS.toeOff - 20);
    expect(readout('springForce')).not.toBe(before[0]);
    expect(readout('springKnee')).not.toBe(before[1]);
    expect(readout('springPhase')).toBe(timeline.phase.pushOff);
  });

  it('switches pace from the chips in the stride and pace chapters', () => {
    click('pace', 'fast');
    expect(readout('strideSpeed')).toBe(fill(units.metersPerSecond, { value: '4.5' }));
    expect(readout('paceKm')).toBe(fill(units.perKilometer, { value: '3:42' }));
    expect(readout('paceKnee')).toBe(fill(units.degrees, { value: '118' }));
    expect(readout('strideFloat')).toBe(fill(units.percent, { value: '32' }));
    const fastContact = readout('paceContact');
    click('pace', 'easy', 'pace');
    expect(readout('paceKm')).toBe(fill(units.perKilometer, { value: '6:40' }));
    expect(readout('paceContact')).not.toBe(fastContact);
  });

  it('moves the touchdown readouts with the step rate slider', () => {
    expect(readout('landRate')).toBe(fill(units.signedPercent, { value: '0' }));
    expect(readout('landReach')).toBe(chapters.touchdown.reachSame);
    const cadence = readout('landCadence');
    slide('land-step-rate', 10);
    expect(document.querySelector('output[for="land-step-rate"]')?.textContent).toBe(
      fill(units.signedPercent, { value: '+10' }),
    );
    expect(readout('landRate')).toBe(fill(units.signedPercent, { value: '+10' }));
    expect(readout('landCadence')).not.toBe(cadence);
    expect(readout('landReach')).toBe(fill(units.centimetersSigned, { value: '-2.2' }));
    expect(readout('landBrakeImpulse')).toBe(fill(units.signedPercent, { value: '-16' }));
    slide('land-step-rate', -10);
    expect(readout('landReach')).toBe(fill(units.centimetersSigned, { value: '+2.2' }));
  });

  it('shares the step rate with the push-off chapter', () => {
    const bounce = readout('liftBounce');
    slide('lift-step-rate', 10);
    expect(store.getState().stepRate).toBe(10);
    expect(readout('liftBounce')).not.toBe(bounce);
    expect(readout('liftRate')).toBe(fill(units.signedPercent, { value: '+10' }));
    expect(readout('liftFlight')).toMatch(/ ms$/);
  });

  it('shows the arms in the posture chapter', () => {
    const twist = readout('postureTwist');
    expect(readout('postureArms')).toBe(controls.armsOptions.swing);
    click('arms', 'held', 'posture');
    expect(readout('postureArms')).toBe(controls.armsOptions.held);
    expect(readout('postureTwist')).not.toBe(twist);
    expect(readout('postureElbow')).toBe(fill(units.degrees, { value: String(HELD_ELBOW_DEG) }));
    expect(readout('postureArm')).toBe(fill(units.degrees, { value: '0' }));
  });
});
