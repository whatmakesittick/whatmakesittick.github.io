import type { Box3, Object3D } from 'three';
import { CameraViews } from '@core/scene/cameraViews';
import type { SceneShell } from '@core/scene/shell';
import { whenIdle } from '@core/scene/warmUp';
import type { AnchorId, AssemblyState, CameraView, CompareId, RegionId, RegisterId } from '../ids';
import { createAssembly } from './assembly';
import type { Assembly } from './assembly';
import { CAMERA_VIEWS } from './cameraViews';

export type PianoControllerDependencies = Pick<
  SceneShell,
  'scene' | 'materials' | 'textures' | 'labels' | 'rig' | 'viewport'
>;

export type ViewFramer = Pick<CameraViews<CameraView>, 'frame'>;

export const BOUNDS_REGION: RegionId = 'grand';
export const FOLLOW_ANCHOR: AnchorId = 'hammer';
export const GROUND_Y = 0;

interface FramingInputs {
  register: RegisterId;
  compare: CompareId;
  ghost: boolean;
  inset: boolean;
}

interface FramedCamera {
  view: CameraView;
  variant?: string;
}

type Reframe = 'tween' | 'jump';

function framingInputs({ register, compare, view }: AssemblyState): FramingInputs {
  return { register, compare, ghost: view.ghost, inset: view.inset };
}

function sameFraming(a: FramingInputs, b: FramingInputs): boolean {
  return (
    a.register === b.register &&
    a.compare === b.compare &&
    a.ghost === b.ghost &&
    a.inset === b.inset
  );
}

export class PianoController {
  readonly views: ViewFramer;
  private readonly dependencies: PianoControllerDependencies;
  private readonly cameraViews: CameraViews<CameraView, RegionId>;
  private assembly: Assembly | null = null;
  private framing: FramingInputs | null = null;
  private framed: FramedCamera | null = null;
  private framedBox: Box3 | null = null;
  private reframe: Reframe | null = null;
  private following = false;
  private cancelWarmUp: () => void = () => {};

  constructor(dependencies: PianoControllerDependencies) {
    this.dependencies = dependencies;
    this.cameraViews = new CameraViews<CameraView, RegionId>(dependencies.rig, {
      views: CAMERA_VIEWS,
      region: (id) => this.assembly?.region(id) ?? null,
    });
    this.views = { frame: (view, animate, variant) => this.frame({ view, variant }, animate) };
  }

  build(state: AssemblyState): void {
    const { scene, materials, textures, labels, rig } = this.dependencies;
    this.dispose();
    const assembly = createAssembly({ materials, textures }, state);
    this.assembly = assembly;
    this.framing = framingInputs(state);
    this.following = state.view.follow;
    scene.add(assembly.root);
    labels.attach(assembly.labelAnchors());
    rig.setBounds(assembly.region(BOUNDS_REGION), GROUND_Y);
    this.cancelWarmUp = whenIdle(() => assembly.warmUp?.((object) => this.compileHidden(object)));
  }

  setState(state: AssemblyState): void {
    if (!this.assembly) return;
    this.assembly.setState(state);
    this.followWhen(state.view.follow);
    this.queueReframe(framingInputs(state));
  }

  update(deltaSeconds: number): boolean {
    this.applyReframe();
    return this.assembly?.update(deltaSeconds, this.cameraDistance()) ?? false;
  }

  dispose(): void {
    this.cancelWarmUp();
    this.assembly?.root.removeFromParent();
    this.assembly?.dispose();
    this.assembly = null;
    this.framing = null;
    this.reframe = null;
  }

  private frame(camera: FramedCamera, animate: boolean): void {
    this.reframe = null;
    this.framed = camera;
    this.assembly?.focus?.(camera.view);
    this.framedBox = this.regionOf(camera.view);
    this.cameraViews.frame(camera.view, animate, camera.variant);
    if (this.following) this.applyFollow();
  }

  private followWhen(wanted: boolean): void {
    if (wanted === this.following) return;
    this.following = wanted;
    this.applyFollow();
  }

  private applyFollow(): void {
    const anchor = this.following ? (this.assembly?.anchor(FOLLOW_ANCHOR) ?? null) : null;
    this.dependencies.rig.follow(anchor);
  }

  private queueReframe(next: FramingInputs): void {
    const previous = this.framing;
    this.framing = next;
    if (!previous || sameFraming(previous, next)) return;
    const move: Reframe = previous.register === next.register ? 'tween' : 'jump';
    this.reframe = this.reframe === 'jump' ? 'jump' : move;
  }

  private applyReframe(): void {
    const reframe = this.reframe;
    this.reframe = null;
    if (!reframe || !this.framed) return;
    const box = this.regionOf(this.framed.view);
    if (box && this.framedBox?.equals(box)) return;
    this.frame(this.framed, reframe === 'tween');
  }

  private regionOf(view: CameraView): Box3 | null {
    return this.assembly?.region(CAMERA_VIEWS[view].region).clone() ?? null;
  }

  private cameraDistance(): number {
    const { camera, controls } = this.dependencies.rig;
    return camera.position.distanceTo(controls.target);
  }

  private compileHidden(object: Object3D): void {
    const { viewport, rig, scene } = this.dependencies;
    const shown = object.visible;
    object.visible = true;
    void viewport.renderer.compileAsync(object, rig.camera, scene);
    object.visible = shown;
  }
}
