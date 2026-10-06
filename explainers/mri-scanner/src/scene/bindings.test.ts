import { describe, expect, it, vi } from 'vitest';
import type { AssemblyState } from '../ids';
import { FIELDS } from '../model';
import { createMriScannerStore, pictureVersionOf } from '../state';
import { bindStore } from './bindings';
import type { SceneTargets } from './bindings';

const LATER_PHASE = 0.4;
const FILLED_LINES = 32;

function fakeTargets() {
  const received: AssemblyState[] = [];
  const snapshots: AssemblyState[] = [];
  const record = (state: AssemblyState) => {
    received.push(state);
    snapshots.push(structuredClone(state));
  };
  const frame = vi.fn();
  const targets: SceneTargets = {
    mriScanner: { build: record, setState: record, views: { frame } },
    labelVisibility: { setWanted: vi.fn() },
    highlighter: { setHighlight: vi.fn() },
    labels: { show: vi.fn() },
  };
  return { received, snapshots, frame, targets };
}

describe('mri scanner scene bindings', () => {
  it('builds the scene from the store and frames the first chapter', () => {
    const { received, frame, targets } = fakeTargets();
    const store = createMriScannerStore();
    bindStore(store, targets);
    const { phase, field, weighting, linesFilled, view } = store.getState();
    expect(received[0]).toMatchObject({
      phase,
      field,
      weighting,
      view,
      fringe: FIELDS[field].fringe,
      pictureVersion: pictureVersionOf(field, weighting, linesFilled),
    });
    expect(frame).toHaveBeenCalledWith('room', false, undefined);
  });

  it('hands the next chapter its view flags before framing its camera', () => {
    const { received, frame, targets } = fakeTargets();
    const store = createMriScannerStore();
    bindStore(store, targets);
    store.getState().applyPreset('magnet');
    expect(frame).toHaveBeenLastCalledWith('cryostat', true, undefined);
    expect(received.at(-1)?.view).toMatchObject({ cutaway: true, fieldLines: true });
  });

  it('alternates two buffers so the held state is never rewritten', () => {
    const { received, snapshots, targets } = fakeTargets();
    const store = createMriScannerStore();
    bindStore(store, targets);
    store.getState().pause();
    store.getState().setPhase(LATER_PHASE);
    store.getState().setTissue('fluid');
    const [first, second, third] = received.slice(-3);
    expect(first).not.toBe(second);
    expect(third).toBe(first);
    expect(received.at(-2)).toEqual(snapshots.at(-2));
    expect(third?.tissue).toBe('fluid');
  });

  it('bumps the picture version only when the picture changes', () => {
    const { received, targets } = fakeTargets();
    const store = createMriScannerStore();
    bindStore(store, targets);
    const built = { picture: received[0]?.picture, version: received[0]?.pictureVersion };
    store.getState().setPhase(LATER_PHASE);
    store.getState().setTissue('fat');
    const unchanged = received.at(-1);
    expect(unchanged?.pictureVersion).toBe(built.version);
    expect(unchanged?.picture).toBe(built.picture);
    store.getState().setLinesFilled(FILLED_LINES);
    const { field, weighting } = store.getState();
    const changed = received.at(-1);
    expect(changed?.pictureVersion).toBe(pictureVersionOf(field, weighting, FILLED_LINES));
    expect(changed?.pictureVersion).not.toBe(built.version);
    expect(changed?.picture).not.toBe(built.picture);
  });

  it('stops handing over states once unbound', () => {
    const { received, targets } = fakeTargets();
    const store = createMriScannerStore();
    const unbind = bindStore(store, targets);
    unbind();
    const count = received.length;
    store.getState().setPhase(LATER_PHASE);
    expect(received).toHaveLength(count);
  });
});
