import { describe, expect, it, vi } from 'vitest';
import { NO_SAFE_AREA } from '@core/scene/lens';
import type { ViewportSize } from '@core/scene/lens';
import type { AssemblyState } from '../ids';
import { HELD_PHASE, boatAt, companionsAt, planingAt, seaAt } from '../model';
import { createNavalDroneStore } from '../state';
import { bindStore } from './bindings';
import type { NavalDroneController } from './controller';

const DESKTOP_STAGE: ViewportSize = { width: 835, height: 900, safe: NO_SAFE_AREA };
const PHONE_STAGE: ViewportSize = { width: 390, height: 330, safe: NO_SAFE_AREA };

function fakeTargets() {
  const received: AssemblyState[] = [];
  const snapshots: AssemblyState[] = [];
  const record = (state: AssemblyState) => {
    received.push(state);
    snapshots.push({ ...state });
  };
  const frame = vi.fn();
  const navalDrone = { build: record, setState: record, views: { frame } };
  const resizes: ((size: ViewportSize) => void)[] = [];
  const resize = (listener: (size: ViewportSize) => void) => {
    resizes.push(listener);
    listener(DESKTOP_STAGE);
    return () => resizes.splice(resizes.indexOf(listener), 1);
  };
  return {
    resizes,
    received,
    snapshots,
    frame,
    targets: {
      navalDrone: navalDrone as unknown as NavalDroneController,
      labelVisibility: { setWanted: vi.fn() },
      highlighter: { setHighlight: vi.fn() },
      labels: { show: vi.fn() },
      viewport: { onResize: resize },
    },
  };
}

describe('scene bindings', () => {
  it('builds the scene at the store moment and frames the first chapter', () => {
    const { received, frame, targets } = fakeTargets();
    bindStore(createNavalDroneStore({ phase: 100 }), targets);
    expect(received[0]).toMatchObject({
      phase: 100,
      playing: true,
      boat: boatAt(100),
      planing: planingAt(boatAt(100).knots),
      companions: companionsAt(100),
      sea: seaAt('smooth'),
      link: { mode: 'satellite', ghost: null },
      fit: 'standard',
      view: { cutaway: false, flow: false, links: false, labels: true },
      waterSection: false,
      wettedBar: false,
    });
    expect(frame).toHaveBeenCalledWith('chase', false, undefined);
  });

  it('hands the scene the held boat, the jet and the hull chapter flags', () => {
    const { received, frame, targets } = fakeTargets();
    const store = createNavalDroneStore();
    bindStore(store, targets);
    store.getState().applyPreset('hull');
    expect(frame).toHaveBeenLastCalledWith('waterline', true, undefined);
    expect(received.at(-1)).toMatchObject({
      phase: HELD_PHASE,
      playing: false,
      boat: { knots: 11, held: true },
      waterSection: true,
      wettedBar: true,
      view: { cutaway: false, flow: true },
    });
    store.getState().applyPreset('jet');
    store.getState().setHelm('reverse');
    expect(received.at(-1)).toMatchObject({ boat: { knots: 0, held: true }, jet: { bucket: 1 } });
    store.getState().play();
    expect(received.at(-1)?.boat.held).toBe(false);
  });

  it('hands the scene the sea, the link ghost and the deck fit', () => {
    const { received, targets } = fakeTargets();
    const store = createNavalDroneStore();
    bindStore(store, targets);
    store.getState().applyPreset('link');
    expect(received.at(-1)?.link.ghost).not.toBeNull();
    store.getState().setLinkMode('lost');
    expect(received.at(-1)?.link).toEqual({ mode: 'lost', ghost: null });
    store.getState().applyPreset('horizon');
    expect(received.at(-1)?.sea).toEqual(seaAt('slight'));
    store.getState().setFit('missile');
    expect(received.at(-1)?.fit).toBe('missile');
  });

  it('hands the scene each view change once', () => {
    const { received, targets } = fakeTargets();
    const store = createNavalDroneStore();
    bindStore(store, targets);
    const calls = received.length;
    store.getState().toggleView('links');
    expect(received).toHaveLength(calls + 1);
    expect(received.at(-1)?.view.links).toBe(true);
  });

  it('never changes the state object the assembly got last', () => {
    const { received, snapshots, targets } = fakeTargets();
    const store = createNavalDroneStore();
    bindStore(store, targets);
    store.getState().setPhase(10);
    store.getState().setPhase(90);
    const last = received.length - 1;
    expect(received[last]).not.toBe(received[last - 1]);
    expect(received[last - 1]).toEqual(snapshots[last - 1]);
  });

  it('labels only the parts the scene draws', () => {
    const { targets } = fakeTargets();
    const store = createNavalDroneStore({ phase: 0 });
    bindStore(store, targets);
    const wanted = () =>
      targets.labelVisibility.setWanted.mock.lastCall?.[0] as ReadonlySet<string>;
    store.getState().applyPreset('hull');
    expect(wanted()).toContain('bowWave');
    expect(wanted()).toContain('wettedLength');
    store.getState().setTrialKnots(30);
    expect(wanted()).not.toContain('bowWave');
    expect(wanted()).toContain('spray');
    store.getState().applyPreset('fleet');
    expect(wanted()).toContain('companions');
    expect(wanted()).not.toContain('missileRails');
    store.getState().setFit('missile');
    expect(wanted()).toContain('missileRails');
  });

  it('drops the minor pump labels on a phone-sized stage', () => {
    const { resizes, targets } = fakeTargets();
    const store = createNavalDroneStore();
    bindStore(store, targets);
    const wanted = () =>
      targets.labelVisibility.setWanted.mock.lastCall?.[0] as ReadonlySet<string>;
    store.getState().applyPreset('jet');
    expect(wanted()).toContain('driveShaft');
    resizes.forEach((listener) => listener(PHONE_STAGE));
    expect(wanted()).not.toContain('driveShaft');
    expect(wanted()).toContain('impeller');
    resizes.forEach((listener) => listener(DESKTOP_STAGE));
    expect(wanted()).toContain('driveShaft');
  });

  it('stops listening once unbound', () => {
    const { received, targets } = fakeTargets();
    const store = createNavalDroneStore();
    const unbind = bindStore(store, targets);
    unbind();
    const calls = received.length;
    store.getState().setPhase(50);
    expect(received).toHaveLength(calls);
  });
});
