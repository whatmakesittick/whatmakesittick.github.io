import { bindPresets } from '@core/scene/presetBinder';
import type { LabelPolicy, PresetTargets } from '@core/scene/presetBinder';
import type { AssemblyState } from '../ids';
import { HUMAN_BLADE_COUNT } from '../model';
import { DEFAULT_VIEW, PRESETS, SINGLE_MOTOR, bladeCountOf, motorCountOf } from '../state';
import type { AtpSynthaseState, AtpSynthaseStore, AtpSynthaseStoreState, Preset } from '../state';
import { ATP_TIMELINE } from '../timeline';
import type { AtpSynthaseController } from './controller';

const STOPPED = 0;

export interface SceneTargets extends PresetTargets {
  synthase: AtpSynthaseController;
  labelVisibility: LabelPolicy;
}

function blankState(): AssemblyState {
  return {
    rotorDeg: 0,
    laps: 0,
    degreesPerSecond: STOPPED,
    bladeCount: HUMAN_BLADE_COUNT,
    motorCount: SINGLE_MOTOR,
    view: DEFAULT_VIEW,
  };
}

function playbackRate(state: AtpSynthaseState): number {
  return state.playing ? ATP_TIMELINE.rate(state.speed) : STOPPED;
}

function copyInto(target: AssemblyState, state: AtpSynthaseState): AssemblyState {
  target.rotorDeg = state.phase;
  target.laps = state.laps;
  target.degreesPerSecond = playbackRate(state);
  target.bladeCount = bladeCountOf(state);
  target.motorCount = motorCountOf(state);
  target.view = state.view;
  return target;
}

class DoubleBufferedAssemblyState {
  private heldByAssembly = blankState();
  private free = blankState();

  handOver(state: AtpSynthaseState): AssemblyState {
    const next = copyInto(this.free, state);
    this.free = this.heldByAssembly;
    this.heldByAssembly = next;
    return next;
  }
}

export function bindStore(store: AtpSynthaseStore, targets: SceneTargets): () => void {
  const { synthase, labelVisibility } = targets;
  const assemblyState = new DoubleBufferedAssemblyState();
  const push = (state: AtpSynthaseState) => synthase.setState(assemblyState.handOver(state));
  synthase.build(assemblyState.handOver(store.getState()));
  const unsubscribers = [
    store.subscribe(push),
    bindPresets<AtpSynthaseStoreState, Preset>(targets, store, {
      presets: PRESETS,
      views: synthase.views,
      labels: labelVisibility,
      prepare: push,
    }),
  ];
  return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
}
