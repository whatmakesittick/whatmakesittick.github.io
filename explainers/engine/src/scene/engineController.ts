import type { FramingSlopes } from '@core/scene/lens';
import type { CameraPose } from '@core/scene/frameBox';
import type { SceneShell } from '@core/scene/shell';
import { CYCLE_DEGREES } from '../model';
import { currentSpec } from '../state';
import type { CameraView, EngineState, ViewOptions } from '../state';
import { poseForView } from './cameraViews';
import { EngineAssembly } from './engineAssembly';

export type EngineControllerDependencies = Pick<
  SceneShell,
  'scene' | 'materials' | 'textures' | 'labels' | 'stage' | 'rig'
>;

const HALF_CYCLE = CYCLE_DEGREES / 2;

function signedDegrees(from: number, to: number): number {
  return (
    ((((to - from + HALF_CYCLE) % CYCLE_DEGREES) + CYCLE_DEGREES) % CYCLE_DEGREES) - HALF_CYCLE
  );
}

export class EngineController {
  private readonly dependencies: EngineControllerDependencies;
  private assembly: EngineAssembly | null = null;
  private previousAngle = 0;

  constructor(dependencies: EngineControllerDependencies) {
    this.dependencies = dependencies;
  }

  rebuild(state: EngineState): void {
    const { scene, materials, textures, labels, stage, rig } = this.dependencies;
    this.assembly?.dispose();
    const assembly = new EngineAssembly(
      { layout: state.layout, spec: currentSpec(state), cutaway: state.view.cutaway },
      { materials, textures },
    );
    this.assembly = assembly;
    assembly.setView(state.view);
    assembly.update({ angle: state.phase, deltaDegrees: 0, deltaSeconds: 0 });
    scene.add(assembly.root);
    labels.attach(assembly.labelAnchors());
    const bounds = assembly.region('all');
    stage.fit(bounds, assembly.floorHeight());
    rig.setBounds(bounds, assembly.floorHeight());
    this.previousAngle = state.phase;
  }

  applyCompression(state: EngineState): void {
    this.assembly?.setSpec(currentSpec(state));
  }

  applyView(view: ViewOptions): void {
    this.assembly?.setView(view);
  }

  update(state: EngineState, deltaSeconds: number): void {
    if (!this.assembly) return;
    const deltaDegrees = signedDegrees(this.previousAngle, state.phase);
    this.previousAngle = state.phase;
    this.assembly.update({ angle: state.phase, deltaDegrees, deltaSeconds });
  }

  pose(view: CameraView, slopes: FramingSlopes): CameraPose | null {
    const assembly = this.assembly;
    if (!assembly) return null;
    return poseForView(view, assembly.layout.id, (id) => assembly.region(id), slopes);
  }

  dispose(): void {
    this.assembly?.dispose();
    this.assembly = null;
  }
}
