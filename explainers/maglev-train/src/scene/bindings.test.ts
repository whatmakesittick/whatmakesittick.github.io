import { describe, expect, it, vi } from 'vitest';
import type { AssemblyState } from '../ids';
import { MOMENTS } from '../model';
import { PRESETS, createMaglevTrainStore } from '../state';
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
  const targets: SceneTargets = {
    train: { build: record, setState: record, views: { frame } },
    labelVisibility: { setWanted },
    highlighter: { setHighlight: vi.fn() },
    labels: { show: vi.fn() },
  };
  return { received, snapshots, frame, setWanted, targets };
}

describe('maglev train scene bindings', () => {
  it('builds the train from the store and frames the first chapter', () => {
    const { received, frame, targets } = fakeTargets();
    const store = createMaglevTrainStore();
    bindStore(store, targets);
    const { phase, topSpeed, brakeMode, compare, view, preset } = store.getState();
    expect(received[0]).toMatchObject({ phase, topSpeed, brakeMode, compare, view });
    expect(frame).toHaveBeenCalledWith(PRESETS[preset].camera, false, undefined);
  });

  it('hands over the chapter start and its views before framing the next camera', () => {
    const { received, frame, targets } = fakeTargets();
    const store = createMaglevTrainStore();
    bindStore(store, targets);
    let handedBeforeFrame: AssemblyState | undefined;
    frame.mockImplementationOnce(() => (handedBeforeFrame = received.at(-1)));
    store.getState().applyPreset('motor');
    expect(frame).toHaveBeenLastCalledWith('wave', true, undefined);
    expect(handedBeforeFrame).toMatchObject({
      phase: PRESETS.motor.startAt,
      view: { wave: true, gap: true, cutaway: false, lineUp: false },
    });
  });

  it('applies a view toggle at once and refreshes the labels', () => {
    const { received, setWanted, targets } = fakeTargets();
    const store = createMaglevTrainStore();
    bindStore(store, targets);
    const before = setWanted.mock.calls.length;
    const ghost = store.getState().view.ghost;
    store.getState().toggleView('ghost');
    expect(received.at(-1)?.view.ghost).toBe(!ghost);
    expect(setWanted.mock.calls.length).toBeGreaterThan(before);
  });

  it('hands over the top speed, the brake, the nudge and the comparison', () => {
    const { received, targets } = fakeTargets();
    const store = createMaglevTrainStore();
    bindStore(store, targets);
    store.getState().setTopSpeed('kmh300');
    store.getState().setBrakeMode('eddy');
    store.getState().nudgeTrain('gust');
    store.getState().setCompare('scmaglev');
    expect(received.at(-1)).toMatchObject({
      topSpeed: 'kmh300',
      brakeMode: 'eddy',
      nudge: { id: 'gust', token: 1 },
      compare: 'scmaglev',
    });
  });

  it('alternates two buffers so the held state is never rewritten', () => {
    const { received, snapshots, targets } = fakeTargets();
    const store = createMaglevTrainStore();
    bindStore(store, targets);
    store.getState().pause();
    store.getState().setTopSpeed('kmh300');
    store.getState().setPhase(MOMENTS.fullSpeed);
    const [first, second, third] = received.slice(-3);
    expect(first).not.toBe(second);
    expect(third).toBe(first);
    expect(received.at(-2)).toEqual(snapshots.at(-2));
    expect(third?.phase).toBe(MOMENTS.fullSpeed);
    expect(third?.motion.phase).toBe('cruise');
  });

  it('stops handing over states once unbound', () => {
    const { received, targets } = fakeTargets();
    const store = createMaglevTrainStore();
    const unbind = bindStore(store, targets);
    unbind();
    const count = received.length;
    store.getState().setPhase(MOMENTS.fullSpeed);
    expect(received).toHaveLength(count);
  });
});
