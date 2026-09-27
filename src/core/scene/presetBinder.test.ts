import { Object3D, PerspectiveCamera } from 'three';
import { describe, expect, it } from 'vitest';
import type { Timeline } from '../explainer';
import { createExplainerStore } from '../store';
import type { ViewportSize } from './lens';
import { NO_SAFE_AREA } from './lens';
import { bindPresets, createLabelVisibility } from './presetBinder';
import type { LabelPolicy, PresetBindingOptions, ScenePreset } from './presetBinder';

type View = 'wide' | 'close';
type Part = 'wheel' | 'spoke' | 'hub';
type Entry = readonly [name: string, ...values: unknown[]];

interface Fields {
  layout: string;
}

const PARTS: readonly Part[] = ['wheel', 'spoke', 'hub'];
const PRESETS: Record<string, ScenePreset<Part, View>> = {
  intro: { camera: 'wide', highlight: [], labels: ['wheel'] },
  detail: { camera: 'close', highlight: ['spoke'], labels: ['spoke', 'hub'], startAt: 40 },
};
const SIZE: ViewportSize = { width: 100, height: 100, safe: NO_SAFE_AREA };

const timeline: Timeline = {
  cycle: 100,
  step: 1,
  nudge: { fine: 1, coarse: 10 },
  labelKey: 'test.phase',
  phasesLabelKey: 'test.phases',
  formatPhase: String,
  describePhase: String,
  rate: (speed) => speed,
  phases: [{ id: 'only', start: 0, end: 100, labelKey: 'a', jumpLabelKey: 'a', tone: 'red' }],
  speed: { min: 1, max: 20, step: 1, labelKey: 's', format: String, describe: String },
};

function createStore() {
  return createExplainerStore<Fields, ScenePreset<Part, View>>({
    timeline,
    presets: PRESETS,
    defaults: { preset: 'intro', speed: 1, view: { labels: false } },
    extend: () => ({ layout: 'single' }),
  });
}

type Store = ReturnType<typeof createStore>;
type State = ReturnType<Store['getState']>;
type Options = PresetBindingOptions<State, ScenePreset<Part, View>>;

function sorted(ids: ReadonlySet<string>): string[] {
  return [...ids].sort();
}

function bind(options: Partial<Options> = {}, log: Entry[] = []) {
  const store = createStore();
  const unbind = bindPresets(
    {
      highlighter: { setHighlight: (parts) => log.push(['highlight', [...parts]]) },
      labels: { show: (ids) => log.push(['show', sorted(ids)]) },
    },
    store,
    {
      presets: PRESETS,
      views: { frame: (view, animate, variant) => log.push(['frame', view, animate, variant]) },
      parts: PARTS,
      ...options,
    },
  );
  const next = () => log.splice(0);
  return { store, unbind, next };
}

function recordingLabels(log: Entry[]): LabelPolicy {
  return { setWanted: (wanted, pinned) => log.push(['wanted', sorted(wanted), sorted(pinned)]) };
}

describe('bindPresets', () => {
  it('presents the starting preset at once', () => {
    const { next } = bind();
    expect(next()).toEqual([
      ['frame', 'wide', false, undefined],
      ['highlight', []],
      ['show', ['wheel']],
    ]);
  });

  it('eases to a new preset and shows its highlight and labels', () => {
    const { store, next } = bind();
    next();
    store.getState().applyPreset('detail');
    expect(next()).toEqual([
      ['show', ['hub', 'spoke']],
      ['frame', 'close', true, undefined],
      ['highlight', ['spoke']],
      ['show', ['hub', 'spoke']],
    ]);
  });

  it('reframes the current preset when the camera is reset', () => {
    const { store, next } = bind();
    store.getState().applyPreset('detail');
    next();
    store.getState().resetCamera();
    expect(next()).toEqual([['frame', 'close', true, undefined]]);
  });

  it('wants every part while the labels view is on and pins the preset labels', () => {
    const log: Entry[] = [];
    const { store, next } = bind(
      { labels: recordingLabels(log), onView: (view) => log.push(['view', view.labels]) },
      log,
    );
    next();
    store.getState().setView({ labels: true });
    expect(next()).toEqual([
      ['view', true],
      ['wanted', ['hub', 'spoke', 'wheel'], ['wheel']],
    ]);
  });

  it('prepares the state and passes the variant before framing', () => {
    const log: Entry[] = [];
    const { store, next } = bind(
      { prepare: (state) => log.push(['prepare', state.phase]), variant: (state) => state.layout },
      log,
    );
    next();
    store.getState().applyPreset('detail');
    expect(next().filter(([name]) => name !== 'show')).toEqual([
      ['prepare', 40],
      ['frame', 'close', true, 'single'],
      ['highlight', ['spoke']],
    ]);
  });

  it('lets the explainer choose what to highlight', () => {
    const { store, next } = bind({ highlight: (preset) => [...preset.highlight, 'hub'] });
    next();
    store.getState().applyPreset('detail');
    expect(next()).toContainEqual(['highlight', ['spoke', 'hub']]);
  });

  it('stops listening once unbound', () => {
    const { store, unbind, next } = bind();
    next();
    unbind();
    store.getState().applyPreset('detail');
    store.getState().resetCamera();
    expect(next()).toEqual([]);
  });
});

describe('createLabelVisibility', () => {
  it('follows the viewport and the frames until it is disposed', () => {
    const resizes: ((size: ViewportSize) => void)[] = [];
    const frames: (() => void)[] = [];
    const track = <T>(list: T[], item: T) => {
      list.push(item);
      return () => {
        list.splice(list.indexOf(item), 1);
      };
    };
    let shown: string[] = [];
    const anchor = new Object3D();
    const camera = new PerspectiveCamera();
    camera.position.set(0, 0, 10);
    camera.updateMatrixWorld();
    const visibility = createLabelVisibility(
      {
        labels: {
          show: (ids) => (shown = sorted(ids)),
          anchors: () => new Map([['wheel', anchor]]),
          isOccluded: () => false,
        },
        rig: { camera },
        viewport: {
          onResize: (listener) => {
            listener(SIZE);
            return track(resizes, listener);
          },
        },
        onFrame: (update) => track(frames, update),
      },
      PARTS,
    );
    visibility.setWanted(new Set(['wheel']), new Set());
    expect(shown).toEqual(['wheel']);
    expect([resizes.length, frames.length]).toEqual([1, 1]);
    visibility.dispose();
    expect([resizes.length, frames.length]).toEqual([0, 0]);
  });
});
