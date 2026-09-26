import type { CameraPose } from '@core/scene/frameBox';
import type { FramingSlopes } from '@core/scene/lens';
import type { SceneShell } from '@core/scene/shell';
import { FORWARD_SHARE } from '../model';
import type { CameraView, HelicopterState, ViewOptions } from '../state';
import { poseForView } from './cameraViews';
import { SETTLE_RATE } from './constants';
import { HelicopterAssembly } from './helicopterAssembly';

export type HelicopterControllerDependencies = Pick<
  SceneShell,
  'scene' | 'materials' | 'textures' | 'labels' | 'stage' | 'rig'
>;

interface Settled {
  collective: number;
  forward: number;
}

function approach(current: number, target: number, blend: number): number {
  return current + (target - current) * blend;
}

export class HelicopterController {
  private readonly dependencies: HelicopterControllerDependencies;
  private assembly: HelicopterAssembly | null = null;
  private settled: Settled = { collective: 0, forward: 0 };

  constructor(dependencies: HelicopterControllerDependencies) {
    this.dependencies = dependencies;
  }

  build(state: HelicopterState): void {
    const { scene, materials, textures, labels, stage, rig } = this.dependencies;
    this.assembly?.dispose();
    const assembly = new HelicopterAssembly({ materials, textures });
    this.assembly = assembly;
    this.settled = { collective: state.collective, forward: FORWARD_SHARE[state.flightMode] };
    assembly.setFlowVisible(state.view.flow);
    this.update(state, 0);
    scene.add(assembly.root);
    labels.attach(assembly.labelAnchors());
    const bounds = assembly.region('all');
    stage.fit(bounds, assembly.floorHeight());
    rig.setBounds(bounds, assembly.floorHeight());
  }

  applyView(view: ViewOptions): void {
    this.assembly?.setFlowVisible(view.flow);
  }

  update(state: HelicopterState, deltaSeconds: number): void {
    if (!this.assembly) return;
    const blend = 1 - Math.exp(-SETTLE_RATE * deltaSeconds);
    this.settled = {
      collective: approach(this.settled.collective, state.collective, blend),
      forward: approach(this.settled.forward, FORWARD_SHARE[state.flightMode], blend),
    };
    this.assembly.update({
      azimuth: state.phase,
      rpm: state.speed,
      deltaSeconds,
      ...this.settled,
    });
  }

  pose(view: CameraView, slopes: FramingSlopes): CameraPose | null {
    const assembly = this.assembly;
    if (!assembly) return null;
    return poseForView(view, (id) => assembly.region(id), slopes);
  }

  dispose(): void {
    this.assembly?.dispose();
    this.assembly = null;
  }
}
