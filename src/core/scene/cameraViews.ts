import { Vector3 } from 'three';
import type { Box3, Object3D } from 'three';
import type { CameraDistance, CameraRig } from './camera';
import { frameBox } from './frameBox';
import type { CameraPose } from './frameBox';
import type { FramingSlopes } from './lens';

export type Direction = readonly [x: number, y: number, z: number];

interface ViewBehaviour {
  follow?: boolean;
  distance?: CameraDistance;
}

export interface FramedView<R extends string> extends ViewBehaviour {
  region: R;
  direction: Direction | Readonly<Record<string, Direction>>;
  margin: number;
}

export interface CustomView extends ViewBehaviour {
  pose(slopes: FramingSlopes): CameraPose | null;
}

export type ViewSpec<R extends string> = FramedView<R> | CustomView;

export interface CameraViewsOptions<V extends string, R extends string> {
  views: Readonly<Record<V, ViewSpec<R>>>;
  region(id: R): Box3 | null;
  anchor?(): Object3D | null;
}

export type ViewRig = Pick<
  CameraRig,
  'framing' | 'follow' | 'setDistanceLimits' | 'jumpTo' | 'tweenTo'
>;

function isCustom<R extends string>(spec: ViewSpec<R>): spec is CustomView {
  return 'pose' in spec;
}

function isDirection(direction: FramedView<string>['direction']): direction is Direction {
  return Array.isArray(direction);
}

function resolveDirection(spec: FramedView<string>, variant: string | undefined): Vector3 {
  const { direction } = spec;
  const chosen = isDirection(direction) ? direction : direction[variant ?? ''];
  if (!chosen) throw new Error(`No camera direction for variant "${variant}"`);
  return new Vector3(...chosen).normalize();
}

export class CameraViews<V extends string, R extends string = string> {
  private readonly rig: ViewRig;
  private readonly options: CameraViewsOptions<V, R>;

  constructor(rig: ViewRig, options: CameraViewsOptions<V, R>) {
    this.rig = rig;
    this.options = options;
  }

  pose(view: V, variant?: string): CameraPose | null {
    const spec = this.options.views[view];
    const slopes = this.rig.framing();
    if (isCustom(spec)) return spec.pose(slopes);
    const box = this.options.region(spec.region);
    if (!box) return null;
    return frameBox(box, resolveDirection(spec, variant), slopes, spec.margin);
  }

  frame(view: V, animate: boolean, variant?: string): void {
    const pose = this.pose(view, variant);
    if (!pose) return;
    const spec = this.options.views[view];
    this.rig.follow(spec.follow ? (this.options.anchor?.() ?? null) : null);
    this.rig.setDistanceLimits(spec.distance ?? {});
    if (animate) this.rig.tweenTo(pose);
    else this.rig.jumpTo(pose);
  }
}
