import { Quaternion, Vector2, Vector3 } from 'three';
import type { Camera, Object3D } from 'three';
import type { LabelLayer } from '@core/scene/labels';
import { NO_SAFE_AREA } from '@core/scene/lens';
import type { ViewportSize } from '@core/scene/lens';

interface Margins {
  top: number;
  side: number;
  bottom: number;
}

interface LabelState {
  id: string;
  point: Vector2;
  onScreen: boolean;
  crowded: boolean;
  shown: boolean;
}

const KEEP_INSIDE_PX: Margins = { top: 28, side: 4, bottom: 4 };
const ENTER_INSIDE_PX: Margins = { top: 44, side: 20, bottom: 20 };
const CROWD = { hideWithinPx: 30, showBeyondPx: 52 } as const;
const NDC_SPAN = 2;
const STILL = { distanceSq: 1e-10, angle: 1e-6 } as const;

function isShown(object: Object3D): boolean {
  for (let node: Object3D | null = object; node; node = node.parent) {
    if (!node.visible) return false;
  }
  return true;
}

function isInside(point: Vector2, size: ViewportSize, margins: Margins): boolean {
  const { width, height, safe } = size;
  return (
    point.x >= safe.left + margins.side &&
    point.x <= width - safe.right - margins.side &&
    point.y >= safe.top + margins.top &&
    point.y <= height - safe.bottom - margins.bottom
  );
}

export class LabelVisibility {
  private readonly labels: LabelLayer;
  private readonly camera: Camera;
  private readonly states: readonly LabelState[];
  private readonly world = new Vector3();
  private readonly cameraPosition = new Vector3();
  private readonly cameraRotation = new Quaternion();
  private readonly visible = new Set<string>();
  private anchors: ReadonlyMap<string, Object3D> = new Map();
  private ordered: LabelState[] = [];
  private pinned: ReadonlySet<string> = new Set();
  private size: ViewportSize = { width: 1, height: 1, safe: NO_SAFE_AREA };
  private stale = true;

  constructor(labels: LabelLayer, camera: Camera, priority: readonly string[]) {
    this.labels = labels;
    this.camera = camera;
    this.states = priority.map((id) => ({
      id,
      point: new Vector2(),
      onScreen: false,
      crowded: false,
      shown: false,
    }));
  }

  setAnchors(anchors: ReadonlyMap<string, Object3D>): void {
    this.anchors = anchors;
  }

  setWanted(wanted: ReadonlySet<string>, pinned: ReadonlySet<string>): void {
    this.pinned = pinned;
    this.states.forEach((state) => {
      state.shown = false;
      state.crowded = false;
    });
    this.ordered = [
      ...this.states.filter((state) => pinned.has(state.id)),
      ...this.states.filter((state) => wanted.has(state.id) && !pinned.has(state.id)),
    ];
    this.stale = true;
    this.update();
  }

  setViewport(size: ViewportSize): void {
    this.size = size;
    this.stale = true;
  }

  update(): void {
    const recrowd = this.stale || this.cameraMoved();
    let changed = this.stale;
    for (let index = 0; index < this.ordered.length; index++) {
      const state = this.ordered[index];
      state.onScreen = this.isOnScreen(state);
      if (recrowd) state.crowded = this.isCrowded(state, index);
      const shown = state.onScreen && (this.pinned.has(state.id) || !state.crowded);
      if (shown === state.shown) continue;
      state.shown = shown;
      changed = true;
    }
    if (changed) this.publish();
  }

  private cameraMoved(): boolean {
    const { position, quaternion } = this.camera;
    const moved =
      position.distanceToSquared(this.cameraPosition) > STILL.distanceSq ||
      quaternion.angleTo(this.cameraRotation) > STILL.angle;
    this.cameraPosition.copy(position);
    this.cameraRotation.copy(quaternion);
    return moved;
  }

  private publish(): void {
    this.stale = false;
    this.visible.clear();
    this.ordered.forEach((state) => {
      if (state.shown) this.visible.add(state.id);
    });
    this.labels.show(this.visible);
  }

  private isOnScreen(state: LabelState): boolean {
    if (!this.project(state)) return false;
    const margins = state.shown ? KEEP_INSIDE_PX : ENTER_INSIDE_PX;
    return isInside(state.point, this.size, margins);
  }

  private isCrowded(state: LabelState, index: number): boolean {
    if (!state.onScreen) return false;
    const clearance = state.shown ? CROWD.hideWithinPx : CROWD.showBeyondPx;
    for (let earlier = 0; earlier < index; earlier++) {
      const other = this.ordered[earlier];
      const kept = other.onScreen && (this.pinned.has(other.id) || !other.crowded);
      if (kept && other.point.distanceTo(state.point) < clearance) return true;
    }
    return false;
  }

  private project(state: LabelState): boolean {
    const anchor = this.anchors.get(state.id);
    if (!anchor || !isShown(anchor)) return false;
    const projected = anchor.getWorldPosition(this.world).project(this.camera);
    if (projected.z > 1) return false;
    state.point.set(
      ((projected.x + 1) / NDC_SPAN) * this.size.width,
      ((1 - projected.y) / NDC_SPAN) * this.size.height,
    );
    return true;
  }
}
