import { describe, expect, it, vi } from 'vitest';
import { PART_GROUPS, PART_IDS } from '../ids';
import type { AssemblyState } from '../ids';
import { createRunStore } from '../state';
import { bindStore } from './bindings';
import type { SceneTargets } from './bindings';
import { SCENE_OPTIONS } from './index';

const LATER_PHASE = 300;

function fakeTargets() {
  const received: AssemblyState[] = [];
  const snapshots: AssemblyState[] = [];
  const record = (state: AssemblyState) => {
    received.push(state);
    snapshots.push(structuredClone(state));
  };
  const build = async (state: AssemblyState) => record(state);
  const frame = vi.fn();
  const setWanted = vi.fn();
  const setHighlight = vi.fn();
  const targets: SceneTargets = {
    run: { build, setState: record, views: { frame }, nameParts: () => {} },
    labelVisibility: { setWanted },
    highlighter: { setHighlight },
    labels: { show: vi.fn() },
  };
  return { received, snapshots, frame, setWanted, setHighlight, targets };
}

describe('run scene bindings', () => {
  it('maps parts only to groups the highlighter can dim or that stay undimmed', () => {
    const known: readonly string[] = [...PART_IDS, ...(SCENE_OPTIONS.highlight?.undimmed ?? [])];
    Object.values(PART_GROUPS).forEach((groups) =>
      groups.forEach((group) => expect(known).toContain(group)),
    );
  });

  it('builds the scene from the store and frames the first chapter', async () => {
    const { received, frame, targets } = fakeTargets();
    const store = createRunStore();
    await bindStore(store, targets);
    expect(received[0]?.phase).toBe(store.getState().phase);
    expect(frame).toHaveBeenCalledWith('hero', false);
  });

  it('frames the next chapter and dims all but the groups of its parts', async () => {
    const { frame, setHighlight, targets } = fakeTargets();
    const store = createRunStore();
    await bindStore(store, targets);
    store.getState().applyPreset('spring');
    expect(frame).toHaveBeenLastCalledWith('leg', true);
    expect(setHighlight).toHaveBeenLastCalledWith(['thigh', 'shin', 'shoe']);
    store.getState().applyPreset('pace');
    expect(setHighlight).toHaveBeenLastCalledWith([]);
  });

  it('swaps the posture view with the look chip', async () => {
    const { frame, targets } = fakeTargets();
    const store = createRunStore();
    await bindStore(store, targets);
    store.getState().applyPreset('posture');
    expect(frame).toHaveBeenLastCalledWith('front', true);
    store.getState().setLookFrom('above');
    expect(frame).toHaveBeenLastCalledWith('above', true);
    store.getState().setLookFrom('front');
    expect(frame).toHaveBeenLastCalledWith('front', true);
  });

  it('frames once when a chapter change resets the look chip', async () => {
    const { frame, targets } = fakeTargets();
    const store = createRunStore();
    await bindStore(store, targets);
    store.getState().applyPreset('posture');
    store.getState().setLookFrom('above');
    frame.mockClear();
    store.getState().applyPreset('spring');
    expect(frame).toHaveBeenCalledTimes(1);
    expect(frame).toHaveBeenLastCalledWith('leg', true);
  });

  it('ignores the look chip outside the posture chapter', async () => {
    const { frame, targets } = fakeTargets();
    const store = createRunStore();
    await bindStore(store, targets);
    store.getState().applyPreset('spring');
    frame.mockClear();
    store.getState().setLookFrom('above');
    expect(frame).not.toHaveBeenCalled();
  });

  it('copies the store view flags and options into the assembly state', async () => {
    const { received, setWanted, targets } = fakeTargets();
    const store = createRunStore();
    await bindStore(store, targets);
    store.getState().applyPreset('liftoff');
    expect(received.at(-1)?.view).toMatchObject({ footPath: true, follow: false, forces: false });
    store.getState().toggleView('follow');
    expect(received.at(-1)?.view.follow).toBe(true);
    store.getState().setStepRate(5);
    expect(received.at(-1)).toMatchObject({ stepRate: 5 });
    expect(received.at(-1)?.reading.stepRate).toBe(5);
    store.getState().toggleView('labels');
    expect(setWanted.mock.lastCall?.[0].size).toBe(0);
  });

  it('alternates two buffers so the held state is never rewritten', async () => {
    const { received, snapshots, targets } = fakeTargets();
    const store = createRunStore();
    await bindStore(store, targets);
    store.getState().pause();
    store.getState().setPhase(100);
    store.getState().setPhase(LATER_PHASE);
    const [first, second, third] = received.slice(-3);
    expect(first).not.toBe(second);
    expect(third).toBe(first);
    expect(received.at(-2)).toEqual(snapshots.at(-2));
    expect(third?.phase).toBe(LATER_PHASE);
  });

  it('stops handing over states once unbound', async () => {
    const { received, targets } = fakeTargets();
    const store = createRunStore();
    const unbind = await bindStore(store, targets);
    unbind();
    const count = received.length;
    store.getState().setPhase(LATER_PHASE);
    expect(received).toHaveLength(count);
  });
});
