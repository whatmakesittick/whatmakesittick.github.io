import { describe, expect, it } from 'vitest';
import { createEngineStore, currentSpec } from './store';

describe('engine store', () => {
  it('advances the angle with time while playing', () => {
    const store = createEngineStore({ speed: 60, phase: 0, playing: true });
    store.getState().tick(0.5);
    expect(store.getState().phase).toBeCloseTo(180);
  });

  it('holds still when paused', () => {
    const store = createEngineStore({ playing: false, phase: 100 });
    store.getState().tick(1);
    expect(store.getState().phase).toBe(100);
  });

  it('pauses when stepping or jumping to a stroke', () => {
    const store = createEngineStore({ playing: true, phase: 0 });
    store.getState().step(10);
    expect(store.getState()).toMatchObject({ phase: 10, playing: false });
    store.getState().jumpToPhase('power');
    expect(store.getState().phase).toBe(360);
  });

  it('resets the compression ratio when switching engine type', () => {
    const store = createEngineStore();
    store.getState().setCompressionRatio(14);
    expect(currentSpec(store.getState()).compressionRatio).toBe(14);
    store.getState().setEngineType('diesel');
    expect(store.getState().compressionRatio).toBe(17);
    expect(currentSpec(store.getState()).ignition).toBe('compression');
  });

  it('applies a preset without clobbering unrelated view options', () => {
    const store = createEngineStore();
    store.getState().setView({ labels: true });
    store.getState().applyPreset('inline4');
    expect(store.getState()).toMatchObject({ layout: 'inline4', preset: 'inline4' });
    expect(store.getState().view.labels).toBe(true);
    store.getState().applyPreset('controls');
    expect(store.getState().layout).toBe('inline4');
  });

  it('pauses at the requested angle for presets that ask for it', () => {
    const store = createEngineStore({ playing: true });
    store.getState().applyPreset('compression');
    expect(store.getState()).toMatchObject({ phase: 360, playing: false });
  });

  it('resumes on the next preset only when the pause came from a preset', () => {
    const store = createEngineStore({ playing: true });
    store.getState().applyPreset('compression');
    store.getState().applyPreset('fuel');
    expect(store.getState().playing).toBe(true);

    store.getState().pause();
    store.getState().applyPreset('compression');
    store.getState().applyPreset('fuel');
    expect(store.getState().playing).toBe(false);

    store.getState().pause();
    store.getState().applyPreset('inline4');
    expect(store.getState().playing).toBe(false);
  });
});

describe('layout changes', () => {
  it('asks the scene to reframe the camera when the layout changes', () => {
    const store = createEngineStore();
    const before = store.getState().cameraResetToken;
    store.getState().setLayout('inline4');
    expect(store.getState().cameraResetToken).toBe(before + 1);
    store.getState().setLayout('inline4');
    expect(store.getState().cameraResetToken).toBe(before + 1);
  });
});
