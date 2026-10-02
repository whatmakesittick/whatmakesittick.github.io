import { describe, expect, it, vi } from 'vitest';
import type { AssemblyState } from '../ids';
import { MOMENTS, flightAt, minutesAt, sensorAt, strikeAt } from '../model';
import { createReaperStore } from '../state';
import { bindStore } from './bindings';
import type { ReaperController } from './controller';

function fakeTargets() {
  const received: AssemblyState[] = [];
  const snapshots: AssemblyState[] = [];
  const record = (state: AssemblyState) => {
    received.push(state);
    snapshots.push({ ...state });
  };
  const frame = vi.fn();
  const reaper = { build: record, setState: record, views: { frame } };
  return {
    received,
    snapshots,
    frame,
    targets: {
      reaper: reaper as unknown as ReaperController,
      labelVisibility: { setWanted: vi.fn() },
      highlighter: { setHighlight: vi.fn() },
      labels: { show: vi.fn() },
    },
  };
}

describe('scene bindings', () => {
  it('builds the scene at the store moment and frames the first chapter', () => {
    const { received, frame, targets } = fakeTargets();
    bindStore(createReaperStore({ phase: 50 }), targets);
    expect(received[0]).toEqual({
      phase: 50,
      clock: minutesAt(50),
      flight: flightAt(50),
      strike: strikeAt(50),
      sensor: sensorAt(50, 'day'),
      link: 'sat',
      load: 'armed',
      playing: true,
      view: { cutaway: false, links: true, track: true, labels: true },
    });
    expect(frame).toHaveBeenCalledWith('chase', false, undefined);
  });

  it('hands the scene the readings for every change of time, load, sensor and view', () => {
    const { received, targets } = fakeTargets();
    const store = createReaperStore();
    bindStore(store, targets);
    store.getState().seekMoment('launch');
    expect(received.at(-1)?.strike.stage).toBe('flying');
    expect(received.at(-1)?.sensor.lasing).toBe(true);
    store.getState().setLoad('clean');
    expect(received.at(-1)?.load).toBe('clean');
    store.getState().applyPreset('sensor');
    store.getState().setSensorMode('infrared');
    expect(received.at(-1)?.sensor.mode).toBe('infrared');
    store.getState().toggleView('links');
    expect(received.at(-1)?.view.links).toBe(false);
    expect(received.at(-1)?.phase).toBe(44);
  });

  it('never changes the state object the assembly got last', () => {
    const { received, snapshots, targets } = fakeTargets();
    const store = createReaperStore();
    bindStore(store, targets);
    store.getState().setPhase(10);
    store.getState().setPhase(MOMENTS.impact);
    const last = received.length - 1;
    expect(received[last]).not.toBe(received[last - 1]);
    expect(received[last - 1]).toEqual(snapshots[last - 1]);
  });

  it('frames each chapter at its moment of the mission', () => {
    const { received, frame, targets } = fakeTargets();
    const store = createReaperStore({ phase: 90 });
    bindStore(store, targets);
    store.getState().applyPreset('strike');
    expect(frame).toHaveBeenLastCalledWith('strike', true, undefined);
    expect(received.at(-1)).toMatchObject({ phase: 61.5, clock: minutesAt(61.5) });
  });

  it('stops listening once unbound', () => {
    const { received, targets } = fakeTargets();
    const store = createReaperStore();
    const unbind = bindStore(store, targets);
    unbind();
    const calls = received.length;
    store.getState().setPhase(50);
    expect(received).toHaveLength(calls);
  });
});
