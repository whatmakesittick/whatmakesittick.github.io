import { describe, expect, it, vi } from 'vitest';
import type { AssemblyState } from '../ids';
import { MOMENTS } from '../model';
import { PRESETS, createPianoStore } from '../state';
import { bindStore } from './bindings';
import type { SceneTargets } from './bindings';

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
    piano: { build: record, setState: record, views: { frame } },
    labelVisibility: { setWanted },
    highlighter: { setHighlight },
    labels: { show: vi.fn() },
  };
  return { received, snapshots, frame, setWanted, setHighlight, targets };
}

describe('piano scene bindings', () => {
  it('builds the piano from the store and frames the first chapter', () => {
    const { received, frame, targets } = fakeTargets();
    const store = createPianoStore();
    bindStore(store, targets);
    const { phase, touch, pedal, register, compare, view, preset } = store.getState();
    expect(received[0]).toMatchObject({ phase, touch, pedal, register, compare, view });
    expect(frame).toHaveBeenCalledWith(PRESETS[preset].camera, false, undefined);
  });

  it('hands over the chapter start and its views before framing the next camera', () => {
    const { received, frame, targets } = fakeTargets();
    const store = createPianoStore();
    bindStore(store, targets);
    let handedBeforeFrame: AssemblyState | undefined;
    frame.mockImplementationOnce(() => (handedBeforeFrame = received.at(-1)));
    store.getState().applyPreset('letGo');
    expect(frame).toHaveBeenLastCalledWith('escapement', true, undefined);
    expect(handedBeforeFrame).toMatchObject({
      phase: PRESETS.letGo.startAt,
      view: { inset: true, cutaway: true, wave: false, ghost: false, lineUp: false },
    });
  });

  it('highlights and pins the labels of each chapter', () => {
    const { setWanted, setHighlight, targets } = fakeTargets();
    const store = createPianoStore();
    bindStore(store, targets);
    store.getState().applyPreset('room');
    expect(setHighlight).toHaveBeenLastCalledWith(PRESETS.room.highlight);
    const labels = new Set(PRESETS.room.labels);
    expect(setWanted).toHaveBeenLastCalledWith(labels, labels);
  });

  it('applies a view toggle at once and refreshes the labels', () => {
    const { received, setWanted, targets } = fakeTargets();
    const store = createPianoStore();
    bindStore(store, targets);
    const before = setWanted.mock.calls.length;
    const ghost = store.getState().view.ghost;
    store.getState().toggleView('ghost');
    expect(received.at(-1)?.view.ghost).toBe(!ghost);
    expect(setWanted.mock.calls.length).toBeGreaterThan(before);
  });

  it('hands over the touch, the pedal, the register and the comparison', () => {
    const { received, targets } = fakeTargets();
    const store = createPianoStore();
    bindStore(store, targets);
    store.getState().setTouch('hard');
    store.getState().setPedal('unaCorda');
    store.getState().setRegister('bass');
    store.getState().setCompare('harpsichord');
    expect(received.at(-1)).toMatchObject({
      touch: 'hard',
      pedal: 'unaCorda',
      register: 'bass',
      compare: 'harpsichord',
    });
  });

  it('alternates two buffers so the held state is never rewritten', () => {
    const { received, snapshots, targets } = fakeTargets();
    const store = createPianoStore();
    bindStore(store, targets);
    store.getState().pause();
    store.getState().setTouch('hard');
    store.getState().setPhase(MOMENTS.strike);
    const [first, second, third] = received.slice(-3);
    expect(first).not.toBe(second);
    expect(third).toBe(first);
    expect(received.at(-2)).toEqual(snapshots.at(-2));
    expect(third?.phase).toBe(MOMENTS.strike);
    expect(third?.stroke.phase).toBe('strike');
  });

  it('stops handing over states once unbound', () => {
    const { received, targets } = fakeTargets();
    const store = createPianoStore();
    const unbind = bindStore(store, targets);
    unbind();
    const count = received.length;
    store.getState().setPhase(MOMENTS.strike);
    expect(received).toHaveLength(count);
  });
});
