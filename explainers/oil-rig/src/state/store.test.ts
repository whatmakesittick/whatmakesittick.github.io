import { describe, expect, it } from 'vitest';
import { FINAL_DEPTH_M, JOURNEY_CYCLE, SEABED_DEPTH_M, phaseAt } from '../model';
import { PRESETS } from './presets';
import type { PresetId } from './presets';
import { DRAFT_RANGE, MUD_WEIGHT_RANGE, PRODUCTION_YEARS_RANGE, WATER_DEPTH_RANGE } from './ranges';
import { createOilRigStore, effectiveMudWeight, mudStateOf } from './store';

const CHAPTERS: readonly PresetId[] = ['overview', 'float', 'drill', 'mud', 'rock', 'flow'];

describe('oil rig store', () => {
  it('drills 80 m every second by default', () => {
    const store = createOilRigStore({ phase: 0, playing: true });
    store.getState().tick(0.5);
    expect(store.getState().phase).toBeCloseTo(40);
  });

  it('loops from total depth back to the drill floor', () => {
    const store = createOilRigStore({ speed: 80, phase: JOURNEY_CYCLE - 10, playing: true });
    store.getState().tick(0.25);
    expect(store.getState()).toMatchObject({ playing: true });
    expect(store.getState().phase).toBeCloseTo(10);
  });

  it('pauses at the top of a stretch when jumping to it', () => {
    const store = createOilRigStore({ playing: true, phase: 30 });
    store.getState().jumpToPhase('reservoir');
    expect(store.getState()).toMatchObject({ phase: 4000, playing: false });
  });

  it('starts with a fixed-cutter bit, the planned mud, drilling draft and the well cut open', () => {
    expect(createOilRigStore().getState()).toMatchObject({
      bit: 'pdc',
      mudWeight: null,
      draft: DRAFT_RANGE.default,
      pickerDepth: WATER_DEPTH_RANGE.default,
      productionYears: PRODUCTION_YEARS_RANGE.default,
      speed: 80,
      view: { cutaway: true, mud: true, flow: false, labels: false },
    });
  });

  it('keeps every slider inside its range', () => {
    const store = createOilRigStore();
    store.getState().setMudWeight(5);
    store.getState().setDraft(2);
    store.getState().setPickerDepth(9000);
    store.getState().setProductionYears(-3);
    expect(store.getState()).toMatchObject({
      mudWeight: MUD_WEIGHT_RANGE.max,
      draft: DRAFT_RANGE.min,
      pickerDepth: WATER_DEPTH_RANGE.max,
      productionYears: PRODUCTION_YEARS_RANGE.min,
    });
  });

  it('follows the planned mud until the reader picks a weight, and goes back to it', () => {
    const store = createOilRigStore({ phase: 3000 });
    expect(effectiveMudWeight(store.getState())).toBe(1.2);
    store.getState().setPhase(4100);
    expect(effectiveMudWeight(store.getState())).toBe(1.4);
    store.getState().setMudWeight(1.9);
    expect(effectiveMudWeight(store.getState())).toBe(1.9);
    expect(mudStateOf(store.getState())).toBe('heavy');
    store.getState().setMudWeight(null);
    expect(effectiveMudWeight(store.getState())).toBe(1.4);
    expect(mudStateOf(store.getState())).toBe('safe');
  });

  it('reports a kick when the mud is too light', () => {
    const store = createOilRigStore({ phase: 4100 });
    store.getState().setMudWeight(1.1);
    expect(mudStateOf(store.getState())).toBe('light');
  });

  it('swaps the bit', () => {
    const store = createOilRigStore();
    store.getState().setBit('rollerCone');
    expect(store.getState().bit).toBe('rollerCone');
  });

  it('seeks each chapter to its moment in the well', () => {
    expect(phaseAt(PRESETS.float.startAt ?? -1)).toBe('deck');
    expect(phaseAt(PRESETS.drill.startAt ?? -1)).toBe('overburden');
    expect(PRESETS.mud.startAt).toBeGreaterThan(SEABED_DEPTH_M);
    expect(phaseAt(PRESETS.rock.startAt ?? -1)).toBe('seal');
    expect(phaseAt(PRESETS.flow.pauseAt ?? -1)).toBe('bottom');
  });

  it('pauses the finished well at total depth and resumes at the next chapter', () => {
    const store = createOilRigStore({ playing: true });
    store.getState().applyPreset('flow');
    expect(store.getState()).toMatchObject({
      phase: FINAL_DEPTH_M,
      playing: false,
      pausedByPreset: true,
      view: { flow: true, mud: false },
    });
    store.getState().applyPreset('rock');
    expect(store.getState()).toMatchObject({ phase: 3550, playing: true, view: { flow: false } });
  });

  it('keeps the reader choices and labels through the chapters', () => {
    const store = createOilRigStore();
    store.getState().setBit('rollerCone');
    store.getState().setMudWeight(1.5);
    store.getState().setDraft(12);
    store.getState().setView({ labels: true });
    CHAPTERS.forEach((id) => store.getState().applyPreset(id));
    expect(store.getState()).toMatchObject({
      bit: 'rollerCone',
      mudWeight: 1.5,
      draft: 12,
      view: { labels: true },
    });
  });

  it('turns the finished well off in every chapter but the last', () => {
    const store = createOilRigStore();
    CHAPTERS.filter((id) => id !== 'flow').forEach((id) => {
      store.getState().setView({ flow: true });
      store.getState().applyPreset(id);
      expect(store.getState().view.flow).toBe(false);
    });
  });
});
