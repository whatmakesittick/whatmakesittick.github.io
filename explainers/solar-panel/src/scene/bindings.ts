import { bindPresets } from '@core/scene/presetBinder';
import type { LabelPolicy, PresetTargets } from '@core/scene/presetBinder';
import type { AssemblyState } from '../ids';
import { SUNRISE_MIN } from '../model';
import {
  DEFAULT_LAYOUT,
  DEFAULT_VIEW,
  EXPLODE_RANGE,
  PRESETS,
  SHADE_RANGE,
  TILT_RANGE,
  WAVELENGTH_RANGE,
  cellTemperatureOf,
  irradianceOf,
  minuteOf,
  powerOf,
  presetHighlight,
  stringStatesOf,
} from '../state';
import type { Preset, SolarPanelState, SolarPanelStore, SolarPanelStoreState } from '../state';
import type { SolarPanelController } from './controller';
import { PART_IDS } from './partInfo';

export interface SceneTargets extends PresetTargets {
  solarPanel: SolarPanelController;
  labelVisibility: LabelPolicy;
}

function blankState(): AssemblyState {
  return {
    minute: SUNRISE_MIN,
    tilt: TILT_RANGE.default,
    explode: EXPLODE_RANGE.default,
    wavelength: WAVELENGTH_RANGE.default,
    shade: SHADE_RANGE.default,
    layout: DEFAULT_LAYOUT,
    irradiance: 0,
    power: 0,
    cellTemperature: 0,
    deadStrings: [],
    activeDiodes: [],
    view: DEFAULT_VIEW,
  };
}

function copyInto(target: AssemblyState, state: SolarPanelState): AssemblyState {
  const strings = stringStatesOf(state);
  target.minute = minuteOf(state);
  target.tilt = state.tilt;
  target.explode = state.explode;
  target.wavelength = state.wavelength;
  target.shade = state.shade;
  target.layout = state.layout;
  target.irradiance = irradianceOf(state);
  target.power = powerOf(state);
  target.cellTemperature = cellTemperatureOf(state);
  target.deadStrings = strings.deadStrings;
  target.activeDiodes = strings.activeDiodes;
  target.view = state.view;
  return target;
}

class DoubleBufferedAssemblyState {
  private heldByAssembly = blankState();
  private free = blankState();

  handOver(state: SolarPanelState): AssemblyState {
    const next = copyInto(this.free, state);
    this.free = this.heldByAssembly;
    this.heldByAssembly = next;
    return next;
  }
}

function highlightOf(preset: Preset, state: SolarPanelState): readonly string[] {
  return presetHighlight(preset, state.layer);
}

function highlightSelectedLayer(store: SolarPanelStore, targets: SceneTargets): () => void {
  return store.subscribe(
    (state) => state.layer,
    () => {
      const state = store.getState();
      targets.highlighter.setHighlight(highlightOf(PRESETS[state.preset], state));
    },
  );
}

export function bindStore(store: SolarPanelStore, targets: SceneTargets): () => void {
  const { solarPanel, labelVisibility } = targets;
  const assemblyState = new DoubleBufferedAssemblyState();
  const push = (state: SolarPanelState) => solarPanel.setState(assemblyState.handOver(state));
  solarPanel.build(assemblyState.handOver(store.getState()));
  const unsubscribers = [
    store.subscribe(push),
    highlightSelectedLayer(store, targets),
    bindPresets<SolarPanelStoreState, Preset>(targets, store, {
      presets: PRESETS,
      views: solarPanel.views,
      parts: PART_IDS,
      labels: labelVisibility,
      prepare: push,
      highlight: highlightOf,
    }),
  ];
  return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
}
