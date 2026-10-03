import { bindPresets } from '@core/scene/presetBinder';
import type { LabelPolicy, PresetTargets } from '@core/scene/presetBinder';
import type { Viewport } from '@core/scene/viewport';
import type { AssemblyState } from '../ids';
import {
  CHAPTER_CONTROL_DEFAULTS,
  DEFAULT_FIT,
  DEFAULT_VIEW,
  PRESETS,
  assemblyFlags,
  runAt,
} from '../state';
import type {
  NavalDroneState,
  NavalDroneStore,
  NavalDroneStoreState,
  Preset,
  RunSource,
} from '../state';
import type { NavalDroneController } from './controller';
import { DrawnLabels, isCompactStage } from './drawnLabels';

export interface SceneTargets extends PresetTargets {
  navalDrone: NavalDroneController;
  labelVisibility: LabelPolicy;
  viewport: Pick<Viewport, 'onResize'>;
}

type AssemblySource = RunSource & Pick<NavalDroneState, 'playing' | 'fit' | 'view'>;

const BLANK_SOURCE: AssemblySource = {
  ...CHAPTER_CONTROL_DEFAULTS,
  phase: 0,
  preset: 'overview',
  playing: false,
  fit: DEFAULT_FIT,
  view: DEFAULT_VIEW,
};

function readingOf(
  source: AssemblySource,
): Omit<AssemblyState, 'phase' | 'playing' | 'fit' | 'view'> {
  const { boat, planing, jet, companions, sea, link } = runAt(source);
  return { boat, planing, jet, companions, sea, link, ...assemblyFlags(source) };
}

function copyInto(target: AssemblyState, source: AssemblySource): AssemblyState {
  Object.assign(target, readingOf(source));
  target.phase = source.phase;
  target.playing = source.playing;
  target.fit = source.fit;
  target.view = source.view;
  return target;
}

function blankState(): AssemblyState {
  const { phase, playing, fit, view } = BLANK_SOURCE;
  return { phase, playing, fit, view, ...readingOf(BLANK_SOURCE) };
}

class DoubleBufferedAssemblyState {
  private heldByAssembly = blankState();
  private free = blankState();

  handOver(source: AssemblySource): AssemblyState {
    const next = copyInto(this.free, source);
    this.free = this.heldByAssembly;
    this.heldByAssembly = next;
    return next;
  }
}

export function bindStore(store: NavalDroneStore, targets: SceneTargets): () => void {
  const { navalDrone, labelVisibility, viewport } = targets;
  const assemblyState = new DoubleBufferedAssemblyState();
  const drawnLabels = new DrawnLabels(labelVisibility);
  const handOver = (state: AssemblySource) => {
    const next = assemblyState.handOver(state);
    drawnLabels.follow(next);
    return next;
  };
  const push = (state: AssemblySource) => navalDrone.setState(handOver(state));
  navalDrone.build(handOver(store.getState()));
  const unsubscribers = [
    viewport.onResize((size) => drawnLabels.setCompact(isCompactStage(size))),
    store.subscribe(push),
    bindPresets<NavalDroneStoreState, Preset>(targets, store, {
      presets: PRESETS,
      views: navalDrone.views,
      labels: drawnLabels,
      prepare: push,
    }),
  ];
  return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
}
