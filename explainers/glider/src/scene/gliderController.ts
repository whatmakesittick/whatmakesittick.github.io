import type { Object3D } from 'three';
import type { CameraPose } from '@core/scene/frameBox';
import type { FramingSlopes } from '@core/scene/lens';
import type { SceneShell } from '@core/scene/shell';
import { FLIGHT_CYCLE } from '../model';
import type { GliderType } from '../model';
import type { CameraView, GliderState, ViewOptions } from '../state';
import { poseForView } from './cameraViews';
import { FLOOR_HEIGHT } from './constants';
import { Diorama } from './diorama';

export type GliderControllerDependencies = Pick<
  SceneShell,
  'scene' | 'materials' | 'textures' | 'labels' | 'rig'
>;

function shortestStep(from: number, to: number): number {
  const step = to - from;
  return step - FLIGHT_CYCLE * Math.round(step / FLIGHT_CYCLE);
}

export class GliderController {
  private readonly dependencies: GliderControllerDependencies;
  private diorama: Diorama | null = null;
  private lastPhase = 0;

  constructor(dependencies: GliderControllerDependencies) {
    this.dependencies = dependencies;
  }

  build(state: GliderState): void {
    const { scene, materials, textures, labels, rig } = this.dependencies;
    this.diorama?.dispose();
    const diorama = new Diorama({ materials, textures }, state.glider);
    this.diorama = diorama;
    diorama.setView(state.view);
    this.lastPhase = state.phase;
    this.update(state);
    scene.add(diorama.root);
    labels.attach(diorama.labelAnchors());
    rig.setBounds(diorama.region('reach'), FLOOR_HEIGHT);
  }

  applyView(view: ViewOptions): void {
    this.diorama?.setView(view);
  }

  setGlider(type: GliderType): void {
    this.diorama?.setGlider(type);
  }

  update(state: GliderState): void {
    const flightSeconds = shortestStep(this.lastPhase, state.phase);
    this.lastPhase = state.phase;
    this.diorama?.update({ phase: state.phase, flightSeconds });
  }

  labelAnchors(): ReadonlyMap<string, Object3D> {
    return this.diorama?.labelAnchors() ?? new Map();
  }

  followAnchor(view: CameraView): Object3D | null {
    return view === 'chase' ? (this.diorama?.gliderAnchor ?? null) : null;
  }

  pose(view: CameraView, slopes: FramingSlopes): CameraPose | null {
    const diorama = this.diorama;
    if (!diorama) return null;
    return poseForView(view, diorama.chaseTarget(), slopes);
  }

  dispose(): void {
    this.diorama?.dispose();
    this.diorama = null;
  }
}
