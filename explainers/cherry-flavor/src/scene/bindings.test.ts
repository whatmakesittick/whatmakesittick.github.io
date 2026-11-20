import { describe, expect, it, vi } from 'vitest';
import type { AssemblyState } from '../ids';
import { SCALE_DEFAULT_LABELS, createFlavorStore } from '../state';
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
  const build = async (state: AssemblyState) => record(state);
  const frame = vi.fn();
  const setWanted = vi.fn();
  const setHighlight = vi.fn();
  const targets: SceneTargets = {
    flavor: { build, setState: record, views: { frame } },
    labelVisibility: { setWanted },
    highlighter: { setHighlight },
    labels: { show: vi.fn() },
  };
  return { received, snapshots, frame, setWanted, setHighlight, targets };
}

describe('cherry flavor scene bindings', () => {
  it('builds the scene from the store and frames the first chapter on its scale', async () => {
    const { received, frame, targets } = fakeTargets();
    const store = createFlavorStore();
    await bindStore(store, targets);
    expect(received[0]).toMatchObject({ scale: 'tongue', phase: 100 });
    expect(frame).toHaveBeenCalledWith('tongue', false, 'tongue');
  });

  it('hands over the new scale before framing the next chapter', async () => {
    const { received, frame, targets } = fakeTargets();
    const store = createFlavorStore();
    await bindStore(store, targets);
    let handed: AssemblyState | undefined;
    frame.mockImplementationOnce(() => (handed = received.at(-1)));
    store.getState().applyPreset('receptors');
    expect(frame).toHaveBeenCalledWith('receptors', true, 'molecules');
    expect(handed).toMatchObject({ scale: 'molecules', phase: 600 });
  });

  it('frames a chapter that also changes the scale only once', async () => {
    const { frame, setHighlight, targets } = fakeTargets();
    const store = createFlavorStore();
    await bindStore(store, targets);
    frame.mockClear();
    setHighlight.mockClear();
    store.getState().applyPreset('receptors');
    expect(frame).toHaveBeenCalledTimes(1);
    expect(setHighlight).toHaveBeenCalledTimes(1);
  });

  it('re-frames, drops the highlight and swaps the labels on a scale flip', async () => {
    const { frame, setWanted, setHighlight, targets } = fakeTargets();
    const store = createFlavorStore();
    await bindStore(store, targets);
    store.getState().applyPreset('receptors');
    expect(setHighlight).toHaveBeenLastCalledWith(PRESET_HIGHLIGHT);
    store.getState().setScale('head');
    expect(frame).toHaveBeenLastCalledWith('receptors', true, 'head');
    expect(setHighlight).toHaveBeenLastCalledWith([]);
    expect([...(setWanted.mock.lastCall?.[0] ?? [])]).toEqual([...SCALE_DEFAULT_LABELS.head]);
  });

  it('hides every label with the labels toggle and applies the pinch toggle', async () => {
    const { received, setWanted, targets } = fakeTargets();
    const store = createFlavorStore();
    await bindStore(store, targets);
    store.getState().toggleView('pinched');
    expect(received.at(-1)?.view.pinched).toBe(true);
    expect(received.at(-1)?.reading.noseShare).toBe(0);
    store.getState().toggleView('labels');
    expect(setWanted.mock.lastCall?.[0].size).toBe(0);
  });

  it('alternates two buffers so the held state is never rewritten', async () => {
    const { received, snapshots, targets } = fakeTargets();
    const store = createFlavorStore();
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

  it('hands over a store change that lands while the scene builds', async () => {
    const { received, targets } = fakeTargets();
    const store = createFlavorStore();
    store.getState().pause();
    let finish: () => void = () => {};
    targets.flavor.build = (state) => {
      received.push(state);
      return new Promise<void>((resolve) => (finish = resolve));
    };
    const bound = bindStore(store, targets);
    store.getState().setPhase(LATER_PHASE);
    finish();
    await bound;
    expect(received.at(-1)?.phase).toBe(LATER_PHASE);
  });

  it('stops handing over states once unbound', async () => {
    const { received, targets } = fakeTargets();
    const store = createFlavorStore();
    const unbind = await bindStore(store, targets);
    unbind();
    const count = received.length;
    store.getState().setPhase(LATER_PHASE);
    expect(received).toHaveLength(count);
  });
});

const PRESET_HIGHLIGHT = [
  'receptors',
  'neuron',
  'benzaldehyde',
  'hexenal',
  'linalool',
  'eugenol',
  'ionone',
];
