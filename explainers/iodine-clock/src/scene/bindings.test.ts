import { describe, expect, it, vi } from 'vitest';
import type { AssemblyState } from '../ids';
import { SCALE_DEFAULT_LABELS, createClockStore } from '../state';
import { bindStore } from './bindings';
import type { SceneTargets } from './bindings';

const LATER_PHASE = 300;

function fakeTargets() {
  const received: AssemblyState[] = [];
  const snapshots: AssemblyState[] = [];
  const record = (state: AssemblyState) => {
    received.push(state);
    snapshots.push(structuredClone(state));
  };
  const frame = vi.fn();
  const setWanted = vi.fn();
  const setHighlight = vi.fn();
  const targets: SceneTargets = {
    clock: { build: record, setState: record, views: { frame } },
    labelVisibility: { setWanted },
    highlighter: { setHighlight },
    labels: { show: vi.fn() },
  };
  return { received, snapshots, frame, setWanted, setHighlight, targets };
}

describe('iodine clock scene bindings', () => {
  it('builds the scene from the store and frames the first chapter on its scale', () => {
    const { received, frame, targets } = fakeTargets();
    const store = createClockStore();
    bindStore(store, targets);
    expect(received[0]).toMatchObject({ scale: 'beaker', phase: 0 });
    expect(frame).toHaveBeenCalledWith('bench', false, 'beaker');
  });

  it('hands over the new scale before framing the next chapter', () => {
    const { received, frame, targets } = fakeTargets();
    const store = createClockStore();
    bindStore(store, targets);
    let handed: AssemblyState | undefined;
    frame.mockImplementationOnce(() => (handed = received.at(-1)));
    store.getState().applyPreset('slowStep');
    expect(frame).toHaveBeenCalledWith('landolt', true, 'molecules');
    expect(handed).toMatchObject({ scale: 'molecules', phase: 200 });
  });

  it('frames a chapter that also changes the scale only once', () => {
    const { frame, setHighlight, targets } = fakeTargets();
    const store = createClockStore();
    bindStore(store, targets);
    frame.mockClear();
    setHighlight.mockClear();
    store.getState().applyPreset('slowStep');
    expect(frame).toHaveBeenCalledTimes(1);
    expect(setHighlight).toHaveBeenCalledTimes(1);
  });

  it('re-frames, drops the highlight and swaps the labels on a scale flip', () => {
    const { frame, setWanted, setHighlight, targets } = fakeTargets();
    const store = createClockStore();
    bindStore(store, targets);
    store.getState().applyPreset('starch');
    expect(setHighlight).toHaveBeenLastCalledWith(PRESET_HIGHLIGHT);
    store.getState().setScale('beaker');
    expect(frame).toHaveBeenLastCalledWith('helix', true, 'beaker');
    expect(setHighlight).toHaveBeenLastCalledWith([]);
    expect([...(setWanted.mock.lastCall?.[0] ?? [])]).toEqual([...SCALE_DEFAULT_LABELS.beaker]);
  });

  it('hides every label with the labels toggle and applies the water toggle', () => {
    const { received, setWanted, targets } = fakeTargets();
    const store = createClockStore();
    bindStore(store, targets);
    store.getState().toggleView('water');
    expect(received.at(-1)?.view.water).toBe(false);
    store.getState().toggleView('labels');
    expect(setWanted.mock.lastCall?.[0].size).toBe(0);
  });

  it('alternates two buffers so the held state is never rewritten', () => {
    const { received, snapshots, targets } = fakeTargets();
    const store = createClockStore();
    bindStore(store, targets);
    store.getState().pause();
    store.getState().setPhase(100);
    store.getState().setPhase(LATER_PHASE);
    const [first, second, third] = received.slice(-3);
    expect(first).not.toBe(second);
    expect(third).toBe(first);
    expect(received.at(-2)).toEqual(snapshots.at(-2));
    expect(third?.phase).toBe(LATER_PHASE);
  });

  it('stops handing over states once unbound', () => {
    const { received, targets } = fakeTargets();
    const store = createClockStore();
    const unbind = bindStore(store, targets);
    unbind();
    const count = received.length;
    store.getState().setPhase(LATER_PHASE);
    expect(received).toHaveLength(count);
  });
});

const PRESET_HIGHLIGHT = ['amylose', 'glucose', 'polyiodide', 'triiodide', 'iodine'];
