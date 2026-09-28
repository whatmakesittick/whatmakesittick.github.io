import { bindPresets } from '@core/scene/presetBinder';
import type { LabelPolicy, PresetTargets } from '@core/scene/presetBinder';
import type { AssemblyState } from '../ids';
import { DEFAULT_BIT } from '../model';
import { DEFAULT_VIEW, PRESETS, effectiveMudWeight, mudStateOf } from '../state';
import type { OilRigState, OilRigStore, OilRigStoreState, Preset } from '../state';
import type { OilRigController } from './controller';
import { PART_IDS } from './partInfo';

export interface SceneTargets extends PresetTargets {
  oilRig: OilRigController;
  labelVisibility: LabelPolicy;
}

function blankState(): AssemblyState {
  return {
    bitDepth: 0,
    draft: 0,
    mudWeight: 0,
    mudState: 'safe',
    bit: DEFAULT_BIT,
    view: DEFAULT_VIEW,
  };
}

class AssemblyStates {
  // the assembly may diff against the object it was given last, so never refill that one
  private readonly buffers = [blankState(), blankState()] as const;
  private index = 0;

  next(state: OilRigState): AssemblyState {
    this.index = 1 - this.index;
    const target = this.buffers[this.index];
    target.bitDepth = state.phase;
    target.draft = state.draft;
    target.mudWeight = effectiveMudWeight(state);
    target.mudState = mudStateOf(state);
    target.bit = state.bit;
    target.view = state.view;
    return target;
  }
}

export function bindStore(store: OilRigStore, targets: SceneTargets): () => void {
  const { oilRig, labelVisibility } = targets;
  const states = new AssemblyStates();
  const push = (state: OilRigState) => oilRig.setState(states.next(state));
  oilRig.build(states.next(store.getState()));
  const unsubscribers = [
    store.subscribe(push),
    bindPresets<OilRigStoreState, Preset>(targets, store, {
      presets: PRESETS,
      views: oilRig.views,
      parts: PART_IDS,
      labels: labelVisibility,
      prepare: push,
    }),
  ];
  return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
}
