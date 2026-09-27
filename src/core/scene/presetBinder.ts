import type { ExplainerStore, Playback, Preset } from '../explainer';
import type { CameraRig } from './camera';
import type { CameraViews } from './cameraViews';
import type { Highlighter } from './highlight';
import type { LabelLayer } from './labels';
import { LabelVisibility } from './labelVisibility';
import type { LabelSource } from './labelVisibility';
import type { SceneShell } from './shell';
import type { Viewport } from './viewport';

export interface ScenePreset<
  Part extends string = string,
  View extends string = string,
> extends Preset {
  camera: View;
  highlight: readonly Part[];
  labels: readonly Part[];
}

export interface LabelPolicy {
  setWanted(wanted: ReadonlySet<string>, pinned: ReadonlySet<string>): void;
}

export interface SceneLabelVisibility extends LabelPolicy {
  dispose(): void;
}

export interface PresetTargets {
  highlighter: Pick<Highlighter, 'setHighlight'>;
  labels: Pick<LabelLayer, 'show'>;
}

export interface PresetBindingOptions<S extends Playback, P extends ScenePreset> {
  presets: Readonly<Record<string, P>>;
  views: Pick<CameraViews<P['camera']>, 'frame'>;
  parts: readonly string[];
  labels?: LabelPolicy;
  variant?(state: S): string;
  prepare?(state: S): void;
  onView?(view: S['view'], state: S): void;
  highlight?(preset: P, state: S): readonly string[];
}

export interface LabelVisibilityShell {
  labels: LabelSource;
  rig: Pick<CameraRig, 'camera'>;
  viewport: Pick<Viewport, 'onResize'>;
  onFrame: SceneShell['onFrame'];
}

function layerPolicy(labels: PresetTargets['labels']): LabelPolicy {
  return { setWanted: (wanted) => labels.show(wanted) };
}

class PresetPresenter<S extends Playback, P extends ScenePreset> {
  private readonly targets: PresetTargets;
  private readonly store: ExplainerStore<S>;
  private readonly options: PresetBindingOptions<S, P>;
  private readonly labels: LabelPolicy;
  private readonly allParts: ReadonlySet<string>;

  constructor(
    targets: PresetTargets,
    store: ExplainerStore<S>,
    options: PresetBindingOptions<S, P>,
  ) {
    this.targets = targets;
    this.store = store;
    this.options = options;
    this.labels = options.labels ?? layerPolicy(targets.labels);
    this.allParts = new Set(options.parts);
  }

  present(animate: boolean): void {
    const state = this.store.getState();
    const preset = this.presetOf(state);
    this.frame(animate);
    this.targets.highlighter.setHighlight(
      this.options.highlight?.(preset, state) ?? preset.highlight,
    );
    this.showLabels(state);
  }

  frame(animate: boolean): void {
    const state = this.store.getState();
    this.options.prepare?.(state);
    this.options.views.frame(this.presetOf(state).camera, animate, this.options.variant?.(state));
  }

  applyView(view: S['view']): void {
    const state = this.store.getState();
    this.options.onView?.(view, state);
    this.showLabels(state);
  }

  private showLabels(state: S): void {
    const pinned = new Set<string>(this.presetOf(state).labels);
    this.labels.setWanted(state.view.labels ? this.allParts : pinned, pinned);
  }

  private presetOf(state: S): P {
    return this.options.presets[state.preset];
  }
}

export function bindPresets<S extends Playback, P extends ScenePreset>(
  targets: PresetTargets,
  store: ExplainerStore<S>,
  options: PresetBindingOptions<S, P>,
): () => void {
  const presenter = new PresetPresenter(targets, store, options);
  presenter.present(false);
  const unsubscribers = [
    store.subscribe(
      (state) => state.view,
      (view) => presenter.applyView(view),
    ),
    store.subscribe(
      (state) => state.preset,
      () => presenter.present(true),
    ),
    store.subscribe(
      (state) => state.cameraResetToken,
      () => presenter.frame(true),
    ),
  ];
  return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
}

export function createLabelVisibility(
  shell: LabelVisibilityShell,
  priority: readonly string[],
): SceneLabelVisibility {
  const visibility = new LabelVisibility(shell.labels, shell.rig.camera, priority);
  const removers = [
    shell.viewport.onResize((size) => visibility.setViewport(size)),
    shell.onFrame(() => visibility.update()),
  ];
  return {
    setWanted: (wanted, pinned) => visibility.setWanted(wanted, pinned),
    dispose: () => removers.forEach((remove) => remove()),
  };
}
