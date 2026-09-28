import { describe, expect, it } from 'vitest';
import { PATH_CYCLE, WAVELENGTH } from '../model';
import { MICROSCOPE_TIMELINE } from '../timeline';
import { PRESETS } from './presets';
import { createMicroscopeStore } from './store';

describe('microscope store', () => {
  it('moves the light 80 mm along the path per second by default', () => {
    const store = createMicroscopeStore({ phase: 0, playing: true });
    store.getState().tick(0.5);
    expect(store.getState().phase).toBeCloseTo(40);
  });

  it('loops from the retina back to the lamp', () => {
    const store = createMicroscopeStore({ speed: 80, phase: PATH_CYCLE - 10, playing: true });
    store.getState().tick(0.25);
    expect(store.getState()).toMatchObject({ playing: true });
    expect(store.getState().phase).toBeCloseTo(10);
  });

  it('pauses at the start of a station when jumping to it', () => {
    const store = createMicroscopeStore({ playing: true, phase: 30 });
    store.getState().jumpToPhase('tube');
    expect(store.getState()).toMatchObject({ phase: 181, playing: false });
  });

  it('starts on the 10x objective and eyepiece in green light, in focus, cut away', () => {
    expect(createMicroscopeStore().getState()).toMatchObject({
      objective: 'x10',
      eyepiece: 'x10',
      wavelength: 550,
      focus: 0,
      speed: 80,
      view: { rays: true, labels: false, cutaway: true },
    });
  });

  it('keeps the wavelength and the focus within their sliders', () => {
    const store = createMicroscopeStore();
    store.getState().setWavelength(900);
    store.getState().setFocus(-50);
    expect(store.getState()).toMatchObject({ wavelength: WAVELENGTH.max, focus: -20 });
    store.getState().setWavelength(450);
    store.getState().setFocus(7);
    expect(store.getState()).toMatchObject({ wavelength: 450, focus: 7 });
  });

  it('swaps the objective and the eyepiece', () => {
    const store = createMicroscopeStore();
    store.getState().setObjective('x100');
    store.getState().setEyepiece('x15');
    expect(store.getState()).toMatchObject({ objective: 'x100', eyepiece: 'x15' });
  });

  it('pauses with the light in the eye and resumes at the next chapter', () => {
    const store = createMicroscopeStore({ playing: true });
    store.getState().applyPreset('eyepiece');
    expect(store.getState()).toMatchObject({ phase: 395, playing: false, pausedByPreset: true });
    store.getState().applyPreset('focus');
    expect(store.getState()).toMatchObject({ phase: 120, playing: true, speed: 80 });
  });

  it('keeps the reader choices and labels through the chapters', () => {
    const store = createMicroscopeStore();
    store.getState().setObjective('x40');
    store.getState().setWavelength(420);
    store.getState().setView({ labels: true, cutaway: false });
    store.getState().applyPreset('limit');
    store.getState().applyPreset('lens');
    expect(store.getState()).toMatchObject({
      objective: 'x40',
      wavelength: 420,
      view: { labels: true, cutaway: false, rays: true },
    });
  });

  it('turns the rays back on in every chapter', () => {
    const store = createMicroscopeStore();
    (['overview', 'lens', 'objective', 'eyepiece', 'limit', 'focus'] as const).forEach((id) => {
      store.getState().setView({ rays: false });
      store.getState().applyPreset(id);
      expect(store.getState().view.rays).toBe(true);
    });
  });

  it('seeks every chapter to a moment inside its own station', () => {
    const phaseOf = (position: number) =>
      MICROSCOPE_TIMELINE.phases.find((phase) => position >= phase.start && position < phase.end)
        ?.id;
    expect(phaseOf(PRESETS.lens.startAt ?? -1)).toBe('lamp');
    expect(phaseOf(PRESETS.objective.startAt ?? -1)).toBe('specimen');
    expect(phaseOf(PRESETS.eyepiece.pauseAt ?? -1)).toBe('eye');
    expect(phaseOf(PRESETS.limit.pauseAt ?? -1)).toBe('specimen');
    expect(phaseOf(PRESETS.focus.startAt ?? -1)).toBe('condenser');
  });
});
