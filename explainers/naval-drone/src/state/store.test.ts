import { describe, expect, it } from 'vitest';
import { MOMENT_IDS, PRESET_IDS } from '../ids';
import { HELD_PHASE, MOMENTS, RUN_SECONDS, knotsAtThrottle, speedAt, throttleAt } from '../model';
import { PRESETS } from './presets';
import { CHAPTER_CONTROL_DEFAULTS, DEFAULT_VIEW, createNavalDroneStore } from './store';
import type { NavalDroneStore } from './store';

function heldStore(knots = 30): NavalDroneStore {
  const store = createNavalDroneStore({ phase: 50, playing: true });
  store.getState().setTrialKnots(knots);
  return store;
}

describe('naval drone store', () => {
  it('starts on the overview at the slipway with every chapter control at rest', () => {
    expect(createNavalDroneStore().getState()).toMatchObject({
      phase: 0,
      speed: 1,
      preset: 'overview',
      fit: 'standard',
      trialKnots: null,
      helm: 'straight',
      linkMode: 'satellite',
      videoDelayMs: 250,
      radarHeight: 20,
      seaState: 'smooth',
      view: { cutaway: true, flow: false, links: false, labels: true },
    });
  });

  it('opens with the view the overview chapter asks for', () => {
    expect(DEFAULT_VIEW).toMatchObject(PRESETS.overview.view);
  });

  it('runs the whole route in two minutes and stops at the ship', () => {
    const store = createNavalDroneStore({ phase: 0, playing: true });
    store.getState().tick(60);
    expect(store.getState().phase).toBeCloseTo(60, 9);
    store.getState().tick(90);
    expect(store.getState().phase).toBe(RUN_SECONDS);
    expect(store.getState().playing).toBe(false);
  });

  it('pauses at each moment', () => {
    const store = createNavalDroneStore({ playing: true });
    MOMENT_IDS.forEach((moment) => {
      store.getState().play();
      store.getState().seekMoment(moment);
      expect(store.getState().playing, moment).toBe(false);
      expect(store.getState().phase, moment).toBeCloseTo(MOMENTS[moment], 9);
    });
  });

  it('keeps the delay and the radar height on their sliders', () => {
    const store = createNavalDroneStore();
    store.getState().setVideoDelay(2000);
    expect(store.getState().videoDelayMs).toBe(1000);
    store.getState().setVideoDelay(10);
    expect(store.getState().videoDelayMs).toBe(50);
    store.getState().setVideoDelay(333);
    expect(store.getState().videoDelayMs).toBe(330);
    store.getState().setRadarHeight(80);
    expect(store.getState().radarHeight).toBe(50);
    store.getState().setRadarHeight(1);
    expect(store.getState().radarHeight).toBe(5);
  });
});

describe('speed trial', () => {
  it('takes the boat over and pauses the run when the reader sets a speed', () => {
    const store = heldStore(27.04);
    expect(store.getState()).toMatchObject({ trialKnots: 27, playing: false, phase: 50 });
    store.getState().setTrialKnots(60);
    expect(store.getState().trialKnots).toBe(42);
    store.getState().setTrialKnots(-1);
    expect(store.getState().trialKnots).toBe(0);
  });

  it('sets the speed that a throttle setting holds', () => {
    const store = createNavalDroneStore({ playing: true });
    store.getState().setThrottle(55);
    expect(store.getState().playing).toBe(false);
    expect(store.getState().trialKnots).toBeCloseTo(knotsAtThrottle(0.55), 9);
    expect(throttleAt(store.getState().trialKnots ?? 0)).toBeCloseTo(0.55, 6);
    store.getState().setThrottle(150);
    expect(store.getState().trialKnots).toBeCloseTo(42, 6);
  });

  it('jumps to each speed mark', () => {
    const store = createNavalDroneStore({ playing: true });
    store.getState().setSpeedMark('hullSpeed');
    expect(store.getState()).toMatchObject({ trialKnots: 5.7, playing: false });
    store.getState().setSpeedMark('planing');
    expect(store.getState().trialKnots).toBe(16);
  });

  it('holds the run speed of the moment when the helm moves first', () => {
    const store = createNavalDroneStore({ phase: 30, playing: true });
    store.getState().setHelm('left');
    expect(store.getState()).toMatchObject({ helm: 'left', playing: false });
    expect(store.getState().trialKnots).toBeCloseTo(speedAt(30), 1);
    store.getState().setTrialKnots(35);
    store.getState().setHelm('reverse');
    expect(store.getState()).toMatchObject({ helm: 'reverse', trialKnots: 35 });
  });

  it('lets go of the boat and centres the helm on release', () => {
    const store = heldStore();
    store.getState().setHelm('right');
    store.getState().releaseTrial();
    expect(store.getState()).toMatchObject({ trialKnots: null, helm: 'straight' });
  });

  it('lets go of the boat when the run plays again', () => {
    const store = heldStore();
    store.getState().setHelm('reverse');
    store.getState().play();
    expect(store.getState()).toMatchObject({ trialKnots: null, helm: 'straight', playing: true });
  });

  it.each([
    ['the scrubber', (store: NavalDroneStore) => store.getState().setPhase(70)],
    ['a step', (store: NavalDroneStore) => store.getState().step(0.5)],
    ['a phase chip', (store: NavalDroneStore) => store.getState().jumpToPhase('sprint')],
    ['a moment chip', (store: NavalDroneStore) => store.getState().seekMoment('topSpeed')],
  ])('lets go of the boat on %s', (_, seek) => {
    const store = heldStore();
    seek(store);
    expect(store.getState().trialKnots).toBeNull();
    expect(store.getState().playing).toBe(false);
  });

  it('keeps holding the boat while the phase stays put', () => {
    const store = heldStore();
    store.getState().setPhase(50);
    store.getState().setFit('missile');
    store.getState().toggleView('cutaway');
    store.getState().setSpeed(2);
    expect(store.getState().trialKnots).toBe(30);
  });

  it('holds the boat at the hull and jet chapter speeds when the chapter seeks', () => {
    const store = createNavalDroneStore({ phase: 10, playing: true });
    store.getState().applyPreset('hull');
    expect(store.getState()).toMatchObject({
      phase: HELD_PHASE,
      playing: false,
      trialKnots: 11,
      helm: 'straight',
    });
    store.getState().setHelm('left');
    store.getState().applyPreset('jet');
    expect(store.getState()).toMatchObject({ phase: HELD_PHASE, trialKnots: 22, helm: 'straight' });
  });

  it('lets go of the boat and plays on in the chapters without a trial', () => {
    const store = createNavalDroneStore({ phase: 10, playing: true });
    store.getState().applyPreset('jet');
    store.getState().applyPreset('link');
    expect(store.getState()).toMatchObject({
      trialKnots: null,
      helm: 'straight',
      phase: 52,
      playing: true,
    });
  });

  it('plays on after the reader takes the helm in a chapter that paused the run itself', () => {
    const store = createNavalDroneStore({ phase: 10, playing: true });
    store.getState().applyPreset('jet');
    store.getState().setHelm('right');
    store.getState().setTrialKnots(30);
    store.getState().applyPreset('link');
    expect(store.getState()).toMatchObject({ trialKnots: null, helm: 'straight', playing: true });
  });

  it('keeps the pause a trial makes while the run plays', () => {
    const store = createNavalDroneStore({ phase: 10, playing: true });
    store.getState().applyPreset('jet');
    store.getState().play();
    store.getState().setTrialKnots(30);
    store.getState().applyPreset('link');
    expect(store.getState()).toMatchObject({ trialKnots: null, playing: false });
  });
});

describe('chapter controls', () => {
  it.each([
    ['hull', 'trialKnots', 30],
    ['jet', 'helm', 'reverse'],
    ['link', 'linkMode', 'lost'],
    ['link', 'videoDelayMs', 600],
    ['horizon', 'radarHeight', 40],
    ['horizon', 'seaState', 'rough'],
  ] as const)(
    'resets the %s chapter control %s in every other chapter',
    (chapter, field, value) => {
      const store = createNavalDroneStore();
      PRESET_IDS.forEach((id) => {
        store.getState().applyPreset(chapter);
        store.setState({ [field]: value });
        store.getState().applyPreset(id);
        const expected =
          id === chapter ? value : (PRESETS[id].start?.[field] ?? CHAPTER_CONTROL_DEFAULTS[field]);
        expect(store.getState()[field], id).toBe(expected);
      });
    },
  );

  it('keeps every control when the same chapter is applied again', () => {
    const store = createNavalDroneStore();
    store.getState().applyPreset('horizon');
    store.getState().setSeaState('moderate');
    store.getState().setRadarHeight(35);
    store.getState().applyPreset('horizon');
    expect(store.getState()).toMatchObject({ seaState: 'moderate', radarHeight: 35 });
  });

  it('opens the horizon chapter on a slight sea', () => {
    const store = createNavalDroneStore();
    store.getState().applyPreset('horizon');
    expect(store.getState()).toMatchObject({ seaState: 'slight', phase: 62 });
  });

  it('keeps the deck fit and the labels through every chapter', () => {
    const store = createNavalDroneStore();
    store.getState().setFit('missile');
    PRESET_IDS.forEach((id) => {
      store.getState().applyPreset(id);
      expect(store.getState().fit, id).toBe('missile');
      expect(store.getState().view.labels, id).toBe(true);
    });
  });

  it('seeks the chapters without a trial and keeps playing', () => {
    const store = createNavalDroneStore({ phase: 80, playing: true });
    store.getState().applyPreset('fleet');
    expect(store.getState()).toMatchObject({ phase: 96, playing: true, speed: 1 });
    store.getState().applyPreset('horizon');
    expect(store.getState()).toMatchObject({ phase: 62, playing: true });
  });
});
