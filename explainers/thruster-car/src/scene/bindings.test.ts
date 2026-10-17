import { describe, expect, it, vi } from 'vitest';
import type { AssemblyState } from '../ids';
import { PRESETS, createThrusterCarStore } from '../state';
import { bindStore } from './bindings';
import type { SceneTargets } from './bindings';

const LATER_PHASE = 5;

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
    car: { build: record, setState: record, views: { frame } },
    labelVisibility: { setWanted },
    highlighter: { setHighlight: vi.fn() },
    labels: { show: vi.fn() },
  };
  return { received, snapshots, frame, setWanted, targets };
}

describe('thruster car scene bindings', () => {
  it('builds the car from the store and frames the first chapter', () => {
    const { received, frame, targets } = fakeTargets();
    const store = createThrusterCarStore();
    bindStore(store, targets);
    const { phase, gas, tankLitres, preset } = store.getState();
    expect(received[0]).toMatchObject({ phase, gas, tankLitres, view: { tank: true } });
    expect(frame).toHaveBeenCalledWith(PRESETS[preset].camera, false, undefined);
  });

  it('hands over the chapter start and its views before framing the next camera', () => {
    const { received, frame, targets } = fakeTargets();
    const store = createThrusterCarStore();
    bindStore(store, targets);
    let handedBeforeFrame: AssemblyState | undefined;
    frame.mockImplementationOnce(() => (handedBeforeFrame = received.at(-1)));
    store.getState().applyPreset('flip');
    expect(frame).toHaveBeenLastCalledWith('flipChase', true, undefined);
    expect(handedBeforeFrame).toMatchObject({
      phase: PRESETS.flip.startAt,
      view: { nozzles: true, forces: true, ghost: true, tank: false },
    });
  });

  it('applies a view toggle at once and refreshes the labels', () => {
    const { received, setWanted, targets } = fakeTargets();
    const store = createThrusterCarStore();
    bindStore(store, targets);
    const before = setWanted.mock.calls.length;
    const ghost = store.getState().view.ghost;
    store.getState().toggleView('ghost');
    expect(received.at(-1)?.view.ghost).toBe(!ghost);
    expect(setWanted.mock.calls.length).toBeGreaterThan(before);
  });

  it('hands over the gas and the tank so the plumes and the gauge follow them', () => {
    const { received, targets } = fakeTargets();
    const store = createThrusterCarStore();
    bindStore(store, targets);
    store.getState().setGas('helium');
    store.getState().setTankLitres(400);
    expect(received.at(-1)).toMatchObject({ gas: 'helium', tankLitres: 400 });
  });

  it('alternates two buffers so the held state is never rewritten', () => {
    const { received, snapshots, targets } = fakeTargets();
    const store = createThrusterCarStore();
    bindStore(store, targets);
    store.getState().pause();
    store.getState().setGas('nitrogen');
    store.getState().setPhase(LATER_PHASE);
    const [first, second, third] = received.slice(-3);
    expect(first).not.toBe(second);
    expect(third).toBe(first);
    expect(received.at(-2)).toEqual(snapshots.at(-2));
    expect(third?.phase).toBe(LATER_PHASE);
    expect(third?.car.airborne).toBe(true);
  });

  it('stops handing over states once unbound', () => {
    const { received, targets } = fakeTargets();
    const store = createThrusterCarStore();
    const unbind = bindStore(store, targets);
    unbind();
    const count = received.length;
    store.getState().setPhase(LATER_PHASE);
    expect(received).toHaveLength(count);
  });
});
