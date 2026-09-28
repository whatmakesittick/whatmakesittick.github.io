import { describe, expect, it, vi } from 'vitest';
import { OXYGEN_RANGE } from './ranges';
import type { PresetId } from './presets';
import { atpMadeOf, bladeCountOf, createAtpSynthaseStore, motorCountOf } from './store';

const CHAPTERS: readonly PresetId[] = [
  'overview',
  'gradient',
  'rotor',
  'head',
  'sprint',
  'training',
];

function othersThan(kept: PresetId): PresetId[] {
  return CHAPTERS.filter((id) => id !== kept);
}

describe('ATP synthase store', () => {
  it('starts with the human ring, resting oxygen, the 100 m and an untrained muscle', () => {
    expect(createAtpSynthaseStore().getState()).toMatchObject({
      ring: 'animal',
      oxygen: 0.25,
      event: 'm100',
      training: 'untrained',
      laps: 0,
      speed: 2,
      preset: 'overview',
      view: { membrane: true, cutaway: false, flow: true, labels: false },
    });
  });

  it('turns the rotor 256 times slower than life by default', () => {
    const store = createAtpSynthaseStore({ phase: 0, playing: true });
    store.getState().tick(1);
    expect(store.getState().phase).toBeCloseTo(140.625);
  });

  it('counts a lap each time the rotor passes 0° and takes it back when scrubbed back', () => {
    const store = createAtpSynthaseStore({ phase: 350, speed: 4, playing: true });
    store.getState().tick(0.1);
    expect(store.getState().laps).toBe(1);
    expect(store.getState().phase).toBeCloseTo(46.25);
    store.getState().pause();
    store.getState().setPhase(355);
    expect(store.getState().laps).toBe(0);
    store.getState().setPhase(200);
    expect(store.getState().laps).toBe(0);
  });

  it('counts every lap a real-time frame travels, even more than one', () => {
    const store = createAtpSynthaseStore({ phase: 10, speed: 10, playing: true });
    store.getState().tick(1 / 60);
    expect(store.getState().laps).toBe(1);
    expect(store.getState().phase).toBeCloseTo(250);
    store.getState().tick(0.045);
    expect(store.getState().laps).toBe(6);
    expect(store.getState().phase).toBeCloseTo(70);
  });

  it('keeps a hundred laps a second at real time over many frames', () => {
    const store = createAtpSynthaseStore({ phase: 5, speed: 10, playing: true });
    for (let frame = 0; frame < 50; frame += 1) store.getState().tick(0.02);
    expect(store.getState().laps).toBe(100);
    expect(store.getState().phase).toBeCloseTo(5);
  });

  it('counts nothing while paused', () => {
    const store = createAtpSynthaseStore({ phase: 350, speed: 10, playing: false });
    store.getState().tick(1);
    expect(store.getState()).toMatchObject({ phase: 350, laps: 0 });
  });

  it('notifies subscribers once per frame while the rotor does not pass 0°', () => {
    const store = createAtpSynthaseStore({ phase: 10, speed: 4, playing: true });
    const listener = vi.fn();
    store.subscribe(listener);
    store.getState().tick(0.01);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(store.getState().laps).toBe(0);
  });

  it('pauses at the start of an ATP when jumping to it', () => {
    const store = createAtpSynthaseStore({ playing: true, phase: 30 });
    store.getState().jumpToPhase('thirdAtp');
    expect(store.getState()).toMatchObject({ phase: 240, playing: false });
  });

  it('stays in the same lap when jumping to an ATP, forward or back', () => {
    const store = createAtpSynthaseStore({ phase: 10, laps: 4, playing: true });
    store.getState().jumpToPhase('thirdAtp');
    expect(store.getState()).toMatchObject({ phase: 240, laps: 4 });
    expect(atpMadeOf(store.getState())).toBe(14);
    store.getState().jumpToPhase('firstAtp');
    expect(store.getState()).toMatchObject({ phase: 0, laps: 4 });
    expect(atpMadeOf(store.getState())).toBe(12);
  });

  it('still counts a lap back when stepping or scrubbing back past 0°', () => {
    const store = createAtpSynthaseStore({ phase: 10, laps: 4, playing: false });
    store.getState().step(-20);
    expect(store.getState()).toMatchObject({ phase: 350, laps: 3 });
    store.getState().step(20);
    expect(store.getState()).toMatchObject({ phase: 10, laps: 4 });
    store.getState().setPhase(300);
    expect(store.getState().laps).toBe(3);
    store.getState().setPhase(200);
    expect(store.getState().laps).toBe(3);
    store.getState().setPhase(340);
    expect(store.getState().laps).toBe(3);
    store.getState().setPhase(20);
    expect(store.getState().laps).toBe(4);
  });

  it('counts laps again after a jump', () => {
    const store = createAtpSynthaseStore({ phase: 10, laps: 4, playing: false });
    store.getState().jumpToPhase('thirdAtp');
    store.getState().setPhase(10);
    expect(store.getState().laps).toBe(5);
  });

  it('keeps the oxygen inside its range', () => {
    const store = createAtpSynthaseStore();
    store.getState().setOxygen(12);
    expect(store.getState().oxygen).toBe(OXYGEN_RANGE.max);
    store.getState().setOxygen(0);
    expect(store.getState().oxygen).toBe(OXYGEN_RANGE.min);
    store.getState().setOxygen(3.2);
    expect(store.getState().oxygen).toBe(3.2);
  });

  it('counts the blades of the picked ring', () => {
    const store = createAtpSynthaseStore();
    expect(bladeCountOf(store.getState())).toBe(8);
    store.getState().setRing('yeast');
    expect(bladeCountOf(store.getState())).toBe(10);
    store.getState().setRing('chloroplast');
    expect(bladeCountOf(store.getState())).toBe(14);
  });

  it('draws the extra motors only in the training chapter', () => {
    const store = createAtpSynthaseStore();
    expect(motorCountOf(store.getState())).toBe(1);
    store.getState().applyPreset('training');
    expect(motorCountOf(store.getState())).toBe(4);
    store.getState().setTraining('tenWeeks');
    expect(motorCountOf(store.getState())).toBe(6);
    store.getState().setTraining('years');
    expect(motorCountOf(store.getState())).toBe(10);
    expect(motorCountOf({ preset: 'sprint', training: 'years' })).toBe(1);
    store.getState().applyPreset('sprint');
    expect(motorCountOf(store.getState())).toBe(1);
  });

  it('keeps each chapter control only in its own chapter', () => {
    const store = createAtpSynthaseStore();
    const cases = [
      { chapter: 'rotor', set: () => store.getState().setRing('yeast'), field: 'ring' },
      { chapter: 'gradient', set: () => store.getState().setOxygen(4), field: 'oxygen' },
      { chapter: 'sprint', set: () => store.getState().setEvent('marathon'), field: 'event' },
      { chapter: 'training', set: () => store.getState().setTraining('years'), field: 'training' },
    ] as const;
    const defaults = createAtpSynthaseStore().getState();
    cases.forEach(({ chapter, set, field }) => {
      set();
      store.getState().applyPreset(chapter);
      expect(store.getState()[field], chapter).not.toBe(defaults[field]);
      othersThan(chapter).forEach((other) => {
        set();
        store.getState().applyPreset(other);
        expect(store.getState()[field], `${field} in ${other}`).toBe(defaults[field]);
      });
    });
  });

  it('keeps playing through every chapter', () => {
    const store = createAtpSynthaseStore({ playing: true, phase: 77 });
    CHAPTERS.forEach((id) => {
      store.getState().applyPreset(id);
      expect(store.getState(), id).toMatchObject({ playing: true, phase: 77 });
    });
  });

  it('keeps the labels through the chapters', () => {
    const store = createAtpSynthaseStore();
    store.getState().setView({ labels: true });
    CHAPTERS.forEach((id) => store.getState().applyPreset(id));
    expect(store.getState().view.labels).toBe(true);
  });

  it('shows the membrane again after the rotor chapter hides it', () => {
    const store = createAtpSynthaseStore();
    store.getState().applyPreset('rotor');
    expect(store.getState().view.membrane).toBe(false);
    store.getState().applyPreset('head');
    expect(store.getState().view).toMatchObject({ membrane: true, cutaway: true });
    store.getState().applyPreset('sprint');
    expect(store.getState().view.cutaway).toBe(false);
  });
});
