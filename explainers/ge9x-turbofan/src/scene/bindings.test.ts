import { describe, expect, it, vi } from 'vitest';
import type { AssemblyState } from '../ids';
import { createEngineStore } from '../state';
import { bindStore } from './bindings';
import type { SceneTargets } from './bindings';
import { STREAM_HIGHLIGHT } from './streamHighlight';

function fakeTargets() {
  const snapshots: AssemblyState[] = [];
  const record = (state: AssemblyState) => {
    snapshots.push(structuredClone(state));
  };
  const frame = vi.fn();
  const setWanted = vi.fn();
  const setHighlight = vi.fn();
  const received: AssemblyState[] = [];
  const targets: SceneTargets = {
    engine: {
      build: async (state) => record(state),
      setState: (state) => {
        received.push(state);
        record(state);
      },
      views: { frame },
      detail: () => 'near',
    },
    labelVisibility: { setWanted },
    highlighter: { setHighlight },
    labels: { show: vi.fn() },
  };
  return { snapshots, received, frame, setWanted, setHighlight, targets };
}

describe('engine scene bindings', () => {
  it('builds from the store and frames the first chapter', async () => {
    const { snapshots, frame, setHighlight, targets } = fakeTargets();
    await bindStore(createEngineStore(), targets);
    expect(snapshots[0]).toMatchObject({ phase: 0, streams: 'both', cutaway: 0, reverser: 0 });
    expect(frame).toHaveBeenCalledWith('hero', false, undefined);
    expect(setHighlight).toHaveBeenCalledWith([]);
  });

  it('hands the assembly the new chapter state before framing it', async () => {
    const { received, frame, setHighlight, targets } = fakeTargets();
    const store = createEngineStore();
    await bindStore(store, targets);
    let handed: AssemblyState | undefined;
    frame.mockImplementationOnce(() => (handed = received.at(-1)));
    store.getState().applyPreset('reverse');
    expect(frame).toHaveBeenLastCalledWith('rear', true, undefined);
    expect(handed).toMatchObject({ reverser: 1, thrust: 0.4 });
    expect(setHighlight).toHaveBeenLastCalledWith(['reverser', 'cascades', 'nacelle']);
  });

  it('alternates two buffers and never hands out the one it holds', async () => {
    const { received, targets } = fakeTargets();
    const store = createEngineStore();
    await bindStore(store, targets);
    store.getState().setPhase(100);
    store.getState().setPhase(200);
    const [first, second, third] = received.slice(-3);
    expect(first).not.toBe(second);
    expect(first).toBe(third);
  });

  it('highlights the stream the reader picks and follows the chapter again after', async () => {
    const { setHighlight, targets } = fakeTargets();
    const store = createEngineStore();
    await bindStore(store, targets);
    store.getState().setStreams('cold');
    expect(setHighlight).toHaveBeenLastCalledWith(STREAM_HIGHLIGHT.cold);
    store.getState().applyPreset('compressor');
    expect(setHighlight).toHaveBeenLastCalledWith(['booster', 'compressor', 'outerShaft']);
  });

  it('shows the labels of a chapter and hides them with the toggle', async () => {
    const { setWanted, targets } = fakeTargets();
    const store = createEngineStore();
    await bindStore(store, targets);
    expect(setWanted).toHaveBeenLastCalledWith(
      new Set(['fanBlades', 'nacelle', 'person', 'intakeLip', 'splitter']),
      expect.any(Set),
    );
    store.getState().toggleView('labels');
    expect(setWanted).toHaveBeenLastCalledWith(new Set(), new Set());
  });

  it('stops following the store once unbound', async () => {
    const { received, targets } = fakeTargets();
    const store = createEngineStore();
    const unbind = await bindStore(store, targets);
    unbind();
    const count = received.length;
    store.getState().setPhase(300);
    expect(received).toHaveLength(count);
  });
});
