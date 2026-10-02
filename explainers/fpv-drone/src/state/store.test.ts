import { describe, expect, it } from 'vitest';
import { MOMENT_IDS, PRESET_IDS } from '../ids';
import { MOMENTS, SORTIE_SECONDS } from '../model';
import { PRESETS } from './presets';
import { DEFAULT_VIEW, createFpvStore } from './store';

describe('fpv store', () => {
  it('starts on the overview at arming with the chapter defaults', () => {
    expect(createFpvStore().getState()).toMatchObject({
      phase: 0,
      speed: 1,
      preset: 'overview',
      video: 'analogue',
      move: 'hover',
      tilt: 30,
      flightMode: 'acro',
      payload: 300,
      packetRate: 250,
      speedster: 'longRange',
      view: { links: true, track: true, arrows: false, labels: true },
    });
  });

  it('opens with the view the overview chapter asks for', () => {
    expect(DEFAULT_VIEW).toMatchObject(PRESETS.overview.view ?? {});
  });

  it('flies the sortie in real time and stops at the end', () => {
    const store = createFpvStore({ phase: 0, playing: true });
    store.getState().tick(40);
    expect(store.getState().phase).toBeCloseTo(SORTIE_SECONDS / 2, 9);
    store.getState().tick(60);
    expect(store.getState().phase).toBe(SORTIE_SECONDS);
    expect(store.getState().playing).toBe(false);
  });

  it('pauses at each moment', () => {
    const store = createFpvStore({ playing: true });
    MOMENT_IDS.forEach((moment) => {
      store.getState().play();
      store.getState().seekMoment(moment);
      expect(store.getState().playing, moment).toBe(false);
      expect(store.getState().phase, moment).toBeCloseTo(MOMENTS[moment], 9);
    });
  });

  it('keeps the tilt and the payload inside their sliders', () => {
    const store = createFpvStore();
    store.getState().setTilt(90);
    expect(store.getState().tilt).toBe(60);
    store.getState().setTilt(-5);
    expect(store.getState().tilt).toBe(0);
    store.getState().setPayload(5000);
    expect(store.getState().payload).toBe(1500);
    store.getState().setPayload(-100);
    expect(store.getState().payload).toBe(0);
  });

  it('sets the chips', () => {
    const store = createFpvStore();
    store.getState().setVideo('digital');
    store.getState().setMove('yaw');
    store.getState().setFlightMode('angle');
    store.getState().setPacketRate(50);
    store.getState().setSpeedster('record');
    expect(store.getState()).toMatchObject({
      video: 'digital',
      move: 'yaw',
      flightMode: 'angle',
      packetRate: 50,
      speedster: 'record',
    });
  });

  it.each([
    ['flight', 'move', 'roll', 'hover'],
    ['flight', 'tilt', 45, 30],
    ['controller', 'flightMode', 'angle', 'acro'],
    ['link', 'packetRate', 50, 250],
    ['power', 'payload', 900, 300],
    ['limits', 'speedster', 'racer', 'longRange'],
  ] as const)(
    'keeps the %s chapter control %s and resets it elsewhere',
    (chapter, field, value, reset) => {
      const store = createFpvStore();
      PRESET_IDS.forEach((id) => {
        store.getState().applyPreset(chapter);
        store.setState({ [field]: value });
        store.getState().applyPreset(id);
        expect(store.getState()[field], id).toBe(id === chapter ? value : reset);
      });
    },
  );

  it('keeps the video choice through every chapter', () => {
    const store = createFpvStore();
    store.getState().setVideo('digital');
    PRESET_IDS.forEach((id) => {
      store.getState().applyPreset(id);
      expect(store.getState().video, id).toBe('digital');
    });
  });

  it('seeks each chapter without stopping playback at normal speed', () => {
    const store = createFpvStore({ phase: 70, playing: true });
    store.getState().applyPreset('power');
    expect(store.getState()).toMatchObject({ phase: 30, playing: true, speed: 1 });
    store.getState().setSpeed(2);
    store.getState().applyPreset('limits');
    expect(store.getState()).toMatchObject({ phase: 52, playing: true, speed: 1 });
  });

  it('turns the spin arrows on for the flight chapter and off for the controller', () => {
    const store = createFpvStore();
    store.getState().applyPreset('flight');
    expect(store.getState().view.arrows).toBe(true);
    store.getState().applyPreset('controller');
    expect(store.getState().view.arrows).toBe(false);
    expect(store.getState().view.labels).toBe(true);
  });
});
