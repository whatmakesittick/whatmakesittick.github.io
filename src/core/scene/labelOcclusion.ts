import { Quaternion, Vector3 } from 'three';
import type { Object3D, PerspectiveCamera } from 'three';
import { blockingReach, isPending, nextOcclusion } from './occlusion';
import type { OcclusionState, PartOf } from './occlusion';
import { OcclusionRays } from './occlusionRays';
import { isShown } from './parts';

export interface OccludedLabels {
  readonly revision: number;
  anchors(): ReadonlyMap<string, Object3D>;
  wanted(): ReadonlySet<string>;
  setOccluded(ids: ReadonlySet<string>): void;
}

export interface LabelOcclusionOptions {
  scene: Object3D;
  camera: PerspectiveCamera;
  partOf: PartOf;
  ignored?: readonly Object3D[];
}

export const RUN_EVERY_FRAMES = 4;
const STILL = { distanceSq: 1e-10, angle: 1e-6 } as const;

class MotionWatch {
  private readonly cameraPosition = new Vector3();
  private readonly cameraRotation = new Quaternion();
  private readonly anchors = new Map<string, Vector3>();
  private readonly world = new Vector3();

  moved(camera: PerspectiveCamera, anchors: ReadonlyMap<string, Object3D>): boolean {
    let moved = this.cameraMoved(camera);
    anchors.forEach((anchor, id) => {
      if (this.anchorMoved(id, anchor)) moved = true;
    });
    return moved;
  }

  private cameraMoved({ position, quaternion }: PerspectiveCamera): boolean {
    const moved =
      position.distanceToSquared(this.cameraPosition) > STILL.distanceSq ||
      quaternion.angleTo(this.cameraRotation) > STILL.angle;
    this.cameraPosition.copy(position);
    this.cameraRotation.copy(quaternion);
    return moved;
  }

  private anchorMoved(id: string, anchor: Object3D): boolean {
    const world = anchor.getWorldPosition(this.world);
    const last = this.anchors.get(id);
    if (!last) {
      this.anchors.set(id, world.clone());
      return true;
    }
    const moved = last.distanceToSquared(world) > STILL.distanceSq;
    last.copy(world);
    return moved;
  }
}

export class LabelOcclusion {
  private readonly labels: OccludedLabels;
  private readonly camera: PerspectiveCamera;
  private readonly rays: OcclusionRays;
  private readonly motion = new MotionWatch();
  private readonly states = new Map<string, OcclusionState>();
  private readonly occluded = new Set<string>();
  private readonly target = new Vector3();
  private revision = Number.NaN;
  private dirty = false;
  private settling = false;
  private framesSinceRun = 0;
  private elapsedSeconds = 0;

  constructor(labels: OccludedLabels, options: LabelOcclusionOptions) {
    this.labels = labels;
    this.camera = options.camera;
    this.rays = new OcclusionRays(options);
  }

  invalidate(): void {
    this.dirty = true;
  }

  update(deltaSeconds: number): boolean {
    this.framesSinceRun += 1;
    this.elapsedSeconds += deltaSeconds;
    if (this.isChecking()) {
      this.settling = this.isDue();
      if (this.settling) this.run();
    }
    return this.settling || this.dirty;
  }

  private isChecking(): boolean {
    return this.labels.revision !== this.revision || this.framesSinceRun >= RUN_EVERY_FRAMES;
  }

  private isDue(): boolean {
    const changed = this.labels.revision !== this.revision;
    const moved = this.motion.moved(this.camera, this.wantedAnchors());
    return changed || moved || this.dirty || this.hasPending();
  }

  private hasPending(): boolean {
    for (const state of this.states.values()) if (isPending(state)) return true;
    return false;
  }

  private wantedAnchors(): Map<string, Object3D> {
    const anchors = this.labels.anchors();
    const wanted = new Map<string, Object3D>();
    this.labels.wanted().forEach((id) => {
      const anchor = anchors.get(id);
      if (anchor && isShown(anchor)) wanted.set(id, anchor);
    });
    return wanted;
  }

  private run(): void {
    const elapsedSeconds = this.elapsedSeconds;
    const sceneChanged = this.labels.revision !== this.revision;
    this.revision = this.labels.revision;
    this.dirty = false;
    this.framesSinceRun = 0;
    this.elapsedSeconds = 0;
    const anchors = this.wantedAnchors();
    let changed = this.forgetAllBut(anchors);
    if (anchors.size > 0) this.rays.prepare(this.camera, sceneChanged);
    anchors.forEach((anchor, id) => {
      const previous = this.states.get(id);
      const blocked = this.isAnchorBlocked(id, anchor, previous?.occluded ?? false);
      const state = nextOcclusion(previous, blocked, elapsedSeconds);
      this.states.set(id, state);
      if (this.markOccluded(id, state.occluded)) changed = true;
    });
    if (changed) this.labels.setOccluded(this.occluded);
  }

  private isAnchorBlocked(part: string, anchor: Object3D, occluded: boolean): boolean {
    const target = anchor.getWorldPosition(this.target);
    const reach = blockingReach(this.rays.distanceTo(target), occluded);
    return this.rays.isBlocked(target, reach, part);
  }

  private forgetAllBut(anchors: ReadonlyMap<string, Object3D>): boolean {
    let changed = false;
    this.states.forEach((_, id) => {
      if (anchors.has(id)) return;
      this.states.delete(id);
      if (this.markOccluded(id, false)) changed = true;
    });
    return changed;
  }

  private markOccluded(id: string, occluded: boolean): boolean {
    if (this.occluded.has(id) === occluded) return false;
    if (occluded) this.occluded.add(id);
    else this.occluded.delete(id);
    return true;
  }
}
