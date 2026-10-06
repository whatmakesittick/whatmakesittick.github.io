import { describe, expect, it } from 'vitest';
import { LINE_DONE_UNITS, MOMENTS, rate } from '../model';
import { PRESETS } from './presets';
import {
  CHAPTER_CONTROL_DEFAULTS,
  DEFAULT_VIEW,
  createMriScannerStore,
  crossesLineDone,
  freshScanLines,
  nextLineCount,
  snapToRange,
  TIP_ANGLE_RANGE,
} from './store';

const PLAYBACK = true;
const SEEK = false;

function storeOn(preset: Parameters<typeof freshScanLines>[0] = 'magnet') {
  const store = createMriScannerStore();
  store.getState().applyPreset(preset);
  return store;
}

function secondsFor(units: number, speed: number): number {
  return units / rate(speed);
}

describe('line crossing', () => {
  it('counts a forward playback step that reaches the end of the echo', () => {
    expect(crossesLineDone(600, 700, PLAYBACK)).toBe(true);
    expect(crossesLineDone(600, LINE_DONE_UNITS, PLAYBACK)).toBe(true);
  });

  it('ignores a step that leaves from the line mark or stays short of it', () => {
    expect(crossesLineDone(LINE_DONE_UNITS, 700, PLAYBACK)).toBe(false);
    expect(crossesLineDone(100, 600, PLAYBACK)).toBe(false);
    expect(crossesLineDone(700, 900, PLAYBACK)).toBe(false);
  });

  it('counts a step that spans the loop wrap and passes the mark on either side', () => {
    expect(crossesLineDone(600, 100, PLAYBACK)).toBe(true);
    expect(crossesLineDone(900, 700, PLAYBACK)).toBe(true);
    expect(crossesLineDone(900, 100, PLAYBACK)).toBe(false);
  });

  it('never counts a seek or a still phase', () => {
    expect(crossesLineDone(600, 700, SEEK)).toBe(false);
    expect(crossesLineDone(600, 100, SEEK)).toBe(false);
    expect(crossesLineDone(600, 600, PLAYBACK)).toBe(false);
  });

  it('wraps to a new scan after the last line', () => {
    expect(nextLineCount(0)).toBe(1);
    expect(nextLineCount(63)).toBe(64);
    expect(nextLineCount(64)).toBe(0);
  });
});

describe('snapToRange', () => {
  it('clamps and rounds to the step', () => {
    expect(snapToRange(43, TIP_ANGLE_RANGE)).toBe(45);
    expect(snapToRange(-20, TIP_ANGLE_RANGE)).toBe(0);
    expect(snapToRange(400, TIP_ANGLE_RANGE)).toBe(180);
  });
});

describe('mri scanner store', () => {
  it('starts on the overview with its picture part filled', () => {
    expect(createMriScannerStore().getState()).toMatchObject({
      phase: 0,
      speed: 6,
      preset: 'overview',
      field: 'field15',
      weighting: 't2',
      tipAngle: 90,
      tissue: 'whiteMatter',
      gradientAxis: null,
      linesFilled: 24,
      view: { cutaway: false, fieldLines: false, voxel: false, labels: true },
    });
  });

  it('opens with the view the overview chapter asks for', () => {
    expect(DEFAULT_VIEW).toMatchObject(PRESETS.overview.view);
  });

  it('adds one line each time playback carries the phase past the echo', () => {
    const store = createMriScannerStore({ phase: 600, linesFilled: 3 });
    const { speed } = store.getState();
    store.getState().tick(secondsFor(100, speed));
    expect(store.getState().linesFilled).toBe(4);
    store.getState().tick(secondsFor(100, speed));
    expect(store.getState().linesFilled).toBe(4);
  });

  it('adds a line when a playback step spans the loop wrap', () => {
    const store = createMriScannerStore({ phase: 900, linesFilled: 3 });
    store.getState().tick(secondsFor(800, store.getState().speed));
    expect(store.getState().phase).toBeCloseTo(700, 6);
    expect(store.getState().linesFilled).toBe(4);
  });

  it('starts a new scan after a full picture', () => {
    const store = createMriScannerStore({ phase: 600, linesFilled: 64 });
    store.getState().tick(secondsFor(100, store.getState().speed));
    expect(store.getState().linesFilled).toBe(0);
  });

  it('never adds a line while paused, on a scrub, a step, a jump or a seek', () => {
    const store = createMriScannerStore({ phase: 600, linesFilled: 3, playing: false });
    store.getState().tick(secondsFor(100, store.getState().speed));
    store.getState().setPhase(700);
    store.getState().setPhase(600);
    store.getState().step(100);
    store.getState().jumpToPhase('recover');
    store.getState().setPhase(600);
    store.getState().seekMoment('echoPeak');
    store.getState().seekMoment('pulse90');
    expect(store.getState().linesFilled).toBe(3);
  });

  it('seeks a moment and pauses there', () => {
    const store = createMriScannerStore();
    store.getState().seekMoment('pulse180');
    expect(store.getState()).toMatchObject({ phase: MOMENTS.pulse180, playing: false });
  });

  it('starts a new scan on a field or weighting change', () => {
    const store = storeOn('magnet');
    store.getState().setLinesFilled(40);
    store.getState().setField('field30');
    expect(store.getState()).toMatchObject({ field: 'field30', linesFilled: 0 });
    store.getState().setLinesFilled(40);
    store.getState().setWeighting('t1');
    expect(store.getState()).toMatchObject({ weighting: 't1', linesFilled: 0 });
  });

  it('restarts a scan at the chapter start lines when the chapter sets them', () => {
    const store = storeOn('picture');
    store.getState().setLinesFilled(40);
    store.getState().setWeighting('t1');
    expect(store.getState().linesFilled).toBe(PRESETS.picture.start?.linesFilled);
  });

  it('keeps the scan when the same field or weighting is chosen again', () => {
    const store = storeOn('magnet');
    store.getState().setLinesFilled(40);
    store.getState().setField('field15');
    store.getState().setWeighting('t2');
    expect(store.getState().linesFilled).toBe(40);
  });

  it('clamps the lines and the tip angle', () => {
    const store = createMriScannerStore();
    store.getState().setLinesFilled(70.4);
    expect(store.getState().linesFilled).toBe(64);
    store.getState().setLinesFilled(12.6);
    expect(store.getState().linesFilled).toBe(13);
    store.getState().setTipAngle(-3);
    expect(store.getState().tipAngle).toBe(0);
    store.getState().setTipAngle(122);
    expect(store.getState().tipAngle).toBe(120);
  });

  it('keeps the field and weighting across chapters', () => {
    const store = storeOn('magnet');
    store.getState().setField('field30');
    store.getState().setWeighting('t1');
    store.getState().applyPreset('picture');
    expect(store.getState()).toMatchObject({ field: 'field30', weighting: 't1' });
  });

  it('resets the chapter controls to the next chapter start or the defaults', () => {
    const store = storeOn('resonance');
    store.getState().setTipAngle(30);
    store.getState().setTissue('fat');
    store.getState().setGradientAxis('x');
    store.getState().applyPreset('magnet');
    expect(store.getState()).toMatchObject(CHAPTER_CONTROL_DEFAULTS);
    store.getState().applyPreset('picture');
    expect(store.getState()).toMatchObject({ ...CHAPTER_CONTROL_DEFAULTS, linesFilled: 8 });
  });

  it('keeps the chapter controls when the same chapter is applied again', () => {
    const store = storeOn('resonance');
    store.getState().setTipAngle(30);
    store.getState().applyPreset('resonance');
    expect(store.getState().tipAngle).toBe(30);
  });

  it('sets the tissue and the gradient axis', () => {
    const store = createMriScannerStore();
    store.getState().setTissue('fluid');
    store.getState().setGradientAxis('z');
    expect(store.getState()).toMatchObject({ tissue: 'fluid', gradientAxis: 'z' });
    store.getState().setGradientAxis(null);
    expect(store.getState().gradientAxis).toBeNull();
  });

  it('starts a scan from zero on chapters without start lines', () => {
    expect(freshScanLines('magnet')).toBe(0);
    expect(freshScanLines('overview')).toBe(24);
  });
});
