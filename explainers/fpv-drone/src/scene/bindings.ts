import { bindPresets } from '@core/scene/presetBinder';
import type { LabelPolicy, PresetTargets } from '@core/scene/presetBinder';
import type { AssemblyState, PartId } from '../ids';
import { speedingMotors } from '../model';
import { CHAPTER_CONTROL_DEFAULTS, DEFAULT_VIDEO, DEFAULT_VIEW, PRESETS, sortieAt } from '../state';
import type { FpvState, FpvStore, FpvStoreState, Preset } from '../state';
import type { FpvController } from './controller';
import { DrawnLabels } from './drawnLabels';

export interface SceneTargets extends PresetTargets {
  drone: FpvController;
  labelVisibility: LabelPolicy;
}

type AssemblySource = Pick<FpvState, 'phase' | 'video' | 'move' | 'payload' | 'playing' | 'view'>;
type HighlightSource = Pick<FpvState, 'preset' | 'move'>;

const MOVE_CHAPTER = 'flight';
const SPINNING_PART: PartId = 'propellers';

const BLANK_SOURCE: AssemblySource = {
  phase: 0,
  video: DEFAULT_VIDEO,
  move: CHAPTER_CONTROL_DEFAULTS.move,
  payload: CHAPTER_CONTROL_DEFAULTS.payload,
  playing: false,
  view: DEFAULT_VIEW,
};

export function highlightFor(preset: Preset, state: HighlightSource): readonly PartId[] {
  if (state.preset !== MOVE_CHAPTER) return preset.highlight;
  return [...speedingMotors(state.move), SPINNING_PART];
}

function copyInto(target: AssemblyState, source: AssemblySource): AssemblyState {
  const { flight, motors, battery, link } = sortieAt(source);
  target.phase = source.phase;
  target.flight = flight;
  target.motors = motors;
  target.battery = battery;
  target.link = link;
  target.video = source.video;
  target.move = source.move;
  target.playing = source.playing;
  target.view = source.view;
  return target;
}

function blankState(): AssemblyState {
  const { phase, video, move, playing, view } = BLANK_SOURCE;
  const { flight, motors, battery, link } = sortieAt(BLANK_SOURCE);
  return { phase, flight, motors, battery, link, video, move, playing, view };
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

function followMove(store: FpvStore, targets: PresetTargets): () => void {
  return store.subscribe(
    (state) => state.move,
    () => {
      const state = store.getState();
      if (state.preset !== MOVE_CHAPTER) return;
      targets.highlighter.setHighlight(highlightFor(PRESETS[state.preset], state));
    },
  );
}

export function bindStore(store: FpvStore, targets: SceneTargets): () => void {
  const { drone, labelVisibility } = targets;
  const assemblyState = new DoubleBufferedAssemblyState();
  const drawnLabels = new DrawnLabels(labelVisibility);
  const handOver = (state: AssemblySource) => {
    const next = assemblyState.handOver(state);
    drawnLabels.follow(next);
    return next;
  };
  const push = (state: AssemblySource) => drone.setState(handOver(state));
  drone.build(handOver(store.getState()));
  const unsubscribers = [
    store.subscribe(push),
    followMove(store, targets),
    bindPresets<FpvStoreState, Preset>(targets, store, {
      presets: PRESETS,
      views: drone.views,
      labels: drawnLabels,
      prepare: push,
      highlight: highlightFor,
    }),
  ];
  return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
}
