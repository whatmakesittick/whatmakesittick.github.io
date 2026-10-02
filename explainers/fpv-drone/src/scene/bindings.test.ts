import { describe, expect, it, vi } from 'vitest';
import type { AssemblyState } from '../ids';
import { batteryAt, flightAt, linkAt, motorsAt } from '../model';
import { PRESETS, createFpvStore } from '../state';
import { bindStore, highlightFor } from './bindings';
import type { FpvController } from './controller';

function fakeTargets() {
  const received: AssemblyState[] = [];
  const snapshots: AssemblyState[] = [];
  const record = (state: AssemblyState) => {
    received.push(state);
    snapshots.push({ ...state });
  };
  const frame = vi.fn();
  const drone = { build: record, setState: record, views: { frame } };
  return {
    received,
    snapshots,
    frame,
    targets: {
      drone: drone as unknown as FpvController,
      labelVisibility: { setWanted: vi.fn() },
      highlighter: { setHighlight: vi.fn() },
      labels: { show: vi.fn() },
    },
  };
}

describe('scene bindings', () => {
  it('builds the scene at the store moment and frames the first chapter', () => {
    const { received, frame, targets } = fakeTargets();
    bindStore(createFpvStore({ phase: 38 }), targets);
    const flight = flightAt(38);
    expect(received[0]).toEqual({
      phase: 38,
      flight,
      motors: motorsAt(flight, 300),
      battery: batteryAt(38, 300),
      link: linkAt(flight.position),
      video: 'analogue',
      move: 'hover',
      playing: true,
      view: { links: true, track: true, arrows: false, labels: true },
    });
    expect(frame).toHaveBeenCalledWith('chase', false, undefined);
  });

  it('hands the scene the readings for every change of time, video, move, payload and view', () => {
    const { received, targets } = fakeTargets();
    const store = createFpvStore();
    bindStore(store, targets);
    store.getState().seekMoment('onStation');
    expect(received.at(-1)?.phase).toBe(27);
    store.getState().setVideo('digital');
    expect(received.at(-1)?.video).toBe('digital');
    store.getState().applyPreset('flight');
    store.getState().setMove('yaw');
    expect(received.at(-1)?.move).toBe('yaw');
    store.getState().applyPreset('power');
    store.getState().setPayload(1200);
    expect(received.at(-1)?.battery).toEqual(batteryAt(30, 1200));
    store.getState().toggleView('links');
    expect(received.at(-1)?.view.links).toBe(false);
  });

  it('never changes the state object the assembly got last', () => {
    const { received, snapshots, targets } = fakeTargets();
    const store = createFpvStore();
    bindStore(store, targets);
    store.getState().setPhase(10);
    store.getState().setPhase(20);
    const last = received.length - 1;
    expect(received[last]).not.toBe(received[last - 1]);
    expect(received[last - 1]).toEqual(snapshots[last - 1]);
  });

  it('frames each chapter at its moment of the flight', () => {
    const { received, frame, targets } = fakeTargets();
    const store = createFpvStore({ phase: 70 });
    bindStore(store, targets);
    store.getState().applyPreset('limits');
    expect(frame).toHaveBeenLastCalledWith('fpv', true, undefined);
    expect(received.at(-1)?.phase).toBe(52);
  });

  it('highlights the motors that speed up for the chosen move in the flight chapter', () => {
    const { targets } = fakeTargets();
    const store = createFpvStore();
    bindStore(store, targets);
    const highlighted = () => targets.highlighter.setHighlight.mock.lastCall?.[0] as string[];
    store.getState().applyPreset('flight');
    expect(highlighted()).toEqual([
      'motorRearRight',
      'motorFrontRight',
      'motorRearLeft',
      'motorFrontLeft',
      'propellers',
    ]);
    store.getState().setMove('forward');
    expect(highlighted()).toEqual(['motorRearRight', 'motorRearLeft', 'propellers']);
    store.getState().setMove('roll');
    expect(highlighted()).toEqual(['motorRearLeft', 'motorFrontLeft', 'propellers']);
    store.getState().setMove('yaw');
    expect(highlighted()).toEqual(['motorFrontRight', 'motorRearLeft', 'propellers']);
    store.getState().applyPreset('power');
    expect(highlighted()).toEqual(['battery']);
    const calls = targets.highlighter.setHighlight.mock.calls.length;
    store.getState().setMove('climb');
    expect(targets.highlighter.setHighlight).toHaveBeenCalledTimes(calls);
  });

  it('keeps the preset highlight outside the flight chapter', () => {
    expect(highlightFor(PRESETS.link, { preset: 'link', move: 'yaw' })).toEqual(
      PRESETS.link.highlight,
    );
  });

  it('labels the links only while they are drawn', () => {
    const { targets } = fakeTargets();
    const store = createFpvStore();
    bindStore(store, targets);
    const wanted = () =>
      targets.labelVisibility.setWanted.mock.lastCall?.[0] as ReadonlySet<string>;
    store.getState().applyPreset('link');
    expect(wanted()).toContain('controlLink');
    store.getState().toggleView('links');
    expect(wanted()).not.toContain('controlLink');
    expect(wanted()).not.toContain('videoLink');
  });

  it('stops listening once unbound', () => {
    const { received, targets } = fakeTargets();
    const store = createFpvStore();
    const unbind = bindStore(store, targets);
    unbind();
    const calls = received.length;
    store.getState().setPhase(50);
    expect(received).toHaveLength(calls);
  });
});
