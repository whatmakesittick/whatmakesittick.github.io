import type { Object3D } from 'three';
import { CameraViews } from '@core/scene/cameraViews';
import type { SceneShell } from '@core/scene/shell';
import { whenIdle } from '@core/scene/warmUp';
import type { AssemblyState, CameraView, RegionId, SettingId } from '../ids';
import { createAssembly } from './assembly';
import type { Assembly } from './assembly';
import { STAGE_VARIANTS, framedRegion, liftedViews, stageVariant } from './cameraViews';
import type { StageVariant } from './cameraViews';
import { BOUNDS_REGION, FLOOR_Y } from './constants';

export type ChainsawControllerDependencies = Pick<
  SceneShell,
  'scene' | 'materials' | 'textures' | 'labels' | 'rig' | 'viewport'
>;

export type ViewFramer = Pick<CameraViews<CameraView>, 'frame'>;

function isVariant(value: string | undefined): value is StageVariant {
  return STAGE_VARIANTS.some((variant) => variant === value);
}

export class ChainsawController {
  readonly views: ViewFramer;
  private readonly dependencies: ChainsawControllerDependencies;
  private readonly cameraViews: Readonly<Record<StageVariant, CameraViews<CameraView, RegionId>>>;
  private assembly: Assembly | null = null;
  private boundSetting: SettingId | null = null;
  private cancelWarmUp: () => void = () => {};

  constructor(dependencies: ChainsawControllerDependencies) {
    this.dependencies = dependencies;
    const viewsFor = (variant: StageVariant) => {
      const region = (id: RegionId) => framedRegion(this.assembly?.region(id) ?? null, id, variant);
      return new CameraViews<CameraView, RegionId>(dependencies.rig, {
        views: liftedViews(variant, region),
        region,
      });
    };
    this.cameraViews = { phone: viewsFor('phone'), desktop: viewsFor('desktop') };
    this.views = {
      frame: (view, animate, variant) =>
        this.cameraViews[isVariant(variant) ? variant : this.stageVariant()].frame(view, animate),
    };
  }

  build(state: AssemblyState): void {
    const { scene, materials, textures, labels } = this.dependencies;
    this.dispose();
    const assembly = createAssembly({ materials, textures }, state);
    this.assembly = assembly;
    scene.add(assembly.root);
    labels.attach(assembly.labelAnchors());
    this.boundTo(state.setting);
    this.cancelWarmUp = whenIdle(() => assembly.warmUp?.((object) => this.compileHidden(object)));
  }

  setState(state: AssemblyState): void {
    this.assembly?.setState(state);
    this.boundTo(state.setting);
  }

  update(deltaSeconds: number): boolean {
    const { rig } = this.dependencies;
    const cameraDistance = rig.camera.position.distanceTo(rig.controls.target);
    return this.assembly?.update(deltaSeconds, cameraDistance) ?? false;
  }

  dispose(): void {
    this.cancelWarmUp();
    this.assembly?.root.removeFromParent();
    this.assembly?.dispose();
    this.assembly = null;
    this.boundSetting = null;
  }

  private boundTo(setting: SettingId): void {
    if (!this.assembly || setting === this.boundSetting) return;
    this.dependencies.rig.setBounds(this.assembly.region(BOUNDS_REGION), FLOOR_Y);
    this.boundSetting = setting;
  }

  private stageVariant(): StageVariant {
    return stageVariant(this.dependencies.viewport.element.clientWidth);
  }

  private compileHidden(object: Object3D): void {
    const { viewport, rig, scene } = this.dependencies;
    const shown = object.visible;
    object.visible = true;
    void viewport.renderer.compileAsync(object, rig.camera, scene);
    object.visible = shown;
  }
}
