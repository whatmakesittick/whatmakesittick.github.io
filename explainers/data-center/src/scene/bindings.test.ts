import { describe, expect, it, vi } from 'vitest';
import type { AssemblyState } from '../ids';
import { MOMENTS, PHASE_RANGES } from '../model';
import { PRESETS, createDataCenterStore } from '../state';
import { bindStore, cameraFor } from './bindings';
import type { SceneTargets } from './bindings';
import { CHASE_VIEW } from './cameraViews';

const INSIDE_GRID = PHASE_RANGES.grid.start + 10;
const LATER_IN_GRID = PHASE_RANGES.grid.start + 20;

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
    dataCenter: { build: record, setState: record, views: { frame } },
    labelVisibility: { setWanted },
    highlighter: { setHighlight: vi.fn() },
    labels: { show: vi.fn() },
  };
  return { received, snapshots, frame, setWanted, targets };
}

function boundStore() {
  const fake = fakeTargets();
  const store = createDataCenterStore();
  const unbind = bindStore(store, fake.targets);
  return { ...fake, store, unbind };
}

describe('data centre scene bindings', () => {
  it('builds the site from the store and frames the first chapter', () => {
    const { received, frame, store } = boundStore();
    const { phase, cooling, load, outageToken, view, preset } = store.getState();
    expect(received[0]).toMatchObject({
      phase,
      cooling,
      load,
      outage: { token: outageToken },
      view,
    });
    expect(frame).toHaveBeenCalledWith(PRESETS[preset].camera, false, undefined);
  });

  it('hands over the chapter start and its views before framing the next camera', () => {
    const { received, frame, store } = boundStore();
    let handedBeforeFrame: AssemblyState | undefined;
    frame.mockImplementationOnce(() => (handedBeforeFrame = received.at(-1)));
    store.getState().applyPreset('rack');
    expect(frame).toHaveBeenLastCalledWith('rackSide', true, undefined);
    expect(handedBeforeFrame).toMatchObject({
      phase: PRESETS.rack.startAt,
      view: { power: true, cutaway: true, inset: true, heat: false, lineUp: false },
    });
  });

  it('applies a view toggle at once and refreshes the labels', () => {
    const { received, setWanted, store } = boundStore();
    const before = setWanted.mock.calls.length;
    const packets = store.getState().view.packets;
    store.getState().toggleView('packets');
    expect(received.at(-1)?.view.packets).toBe(!packets);
    expect(setWanted.mock.calls.length).toBeGreaterThan(before);
  });

  it('hands over the cooling, the load and the outage drill', () => {
    const { received, store } = boundStore();
    store.getState().setCooling('air');
    store.getState().setLoad('idle');
    store.getState().cutGrid();
    expect(received.at(-1)).toMatchObject({
      cooling: 'air',
      load: 'idle',
      coolant: { medium: 'air' },
      outage: { token: 1 },
    });
  });

  it('alternates two buffers so the held state is never rewritten', () => {
    const { received, snapshots, store } = boundStore();
    store.getState().pause();
    store.getState().setCooling('air');
    store.getState().setPhase(MOMENTS.becomesHeat);
    const [first, second, third] = received.slice(-3);
    expect(first).not.toBe(second);
    expect(third).toBe(first);
    expect(received.at(-2)).toEqual(snapshots.at(-2));
    expect(third?.phase).toBe(MOMENTS.becomesHeat);
    expect(third?.joule.form).toBe('heat');
  });

  it('swaps to the chase while following and back to the chapter camera after', () => {
    const { frame, store } = boundStore();
    store.getState().toggleView('follow');
    expect(frame).toHaveBeenLastCalledWith(CHASE_VIEW, true);
    store.getState().applyPreset('heatOut');
    expect(frame).toHaveBeenLastCalledWith(CHASE_VIEW, true, undefined);
    store.getState().toggleView('follow');
    expect(frame).toHaveBeenLastCalledWith(PRESETS.heatOut.camera, true);
  });

  it('leaves the camera alone on a view change that is not the follow toggle', () => {
    const { frame, store } = boundStore();
    const calls = frame.mock.calls.length;
    store.getState().toggleView('labels');
    expect(frame).toHaveBeenCalledTimes(calls);
  });

  it('reframes the chase when the joule enters a new stage', () => {
    const { frame, store } = boundStore();
    store.getState().pause();
    store.getState().setPhase(INSIDE_GRID);
    store.getState().toggleView('follow');
    const calls = frame.mock.calls.length;
    store.getState().setPhase(LATER_IN_GRID);
    expect(frame).toHaveBeenCalledTimes(calls);
    store.getState().setPhase(MOMENTS.atRack);
    expect(frame).toHaveBeenCalledTimes(calls + 1);
    expect(frame).toHaveBeenLastCalledWith(CHASE_VIEW, true);
  });

  it('keeps the chapter camera when the joule enters a new stage without following', () => {
    const { frame, store } = boundStore();
    store.getState().pause();
    const calls = frame.mock.calls.length;
    store.getState().setPhase(MOMENTS.onRoof);
    expect(frame).toHaveBeenCalledTimes(calls);
  });

  it('picks the chase while following and the chapter camera otherwise', () => {
    const { store } = boundStore();
    const state = store.getState();
    expect(cameraFor(state)).toBe(PRESETS[state.preset].camera);
    expect(cameraFor({ ...state, view: { ...state.view, follow: true } })).toBe(CHASE_VIEW);
  });

  it('stops handing over states once unbound', () => {
    const { received, store, unbind } = boundStore();
    unbind();
    const count = received.length;
    store.getState().setPhase(MOMENTS.onRoof);
    expect(received).toHaveLength(count);
  });
});
