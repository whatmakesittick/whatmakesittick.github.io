import { Group, Line, Mesh, Points, Sprite } from 'three';
import type { Box3, Camera, Material, Object3D } from 'three';
import type { Rect } from '@core/scene/labelLayout';
import type { ViewportSize } from '@core/scene/lens';
import { anchorAt, isShown } from '@core/scene/parts';
import type { Steps } from '@core/scene/pacing';
import { ResourceTracker } from '@core/scene/resources';
import { ANCHOR_IDS, PART_IDS } from '../ids';
import type { AnchorId, AssemblyState, GaitReading, PartId, RegionId } from '../ids';
import type { Assembly, AssemblyResources, ChaseTarget } from './assembly';
import type { PartContext } from './parts/context';
import { buildLand } from './parts/land/land';
import type { Land } from './parts/land/land';
import { buildOverlays } from './parts/overlays/overlays';
import type { Overlays } from './parts/overlays/overlays';
import { fitTags } from './parts/overlays/tagFit';
import { RunnerShadow } from './parts/shadow/runnerShadow';
import { labelPoints } from './labelPoints';
import { regionBox } from './regions';
import type { RunnerPose } from './runnerPose';
import type { PoseSolver, RunnerFigure } from './runnerSlot';

type Drawable = Mesh | Line | Points | Sprite;

function isDrawable(object: Object3D): object is Drawable {
  return (
    object instanceof Mesh ||
    object instanceof Line ||
    object instanceof Points ||
    object instanceof Sprite
  );
}

interface Parts {
  readonly runner: RunnerFigure;
  readonly land: Land;
  readonly shadow: RunnerShadow;
  readonly overlays: Overlays;
}

class RunAssembly implements Assembly {
  readonly root: Group;
  private readonly context: PartContext;
  private readonly parts: Parts;
  private readonly solve: PoseSolver;
  private readonly labels: ReadonlyMap<PartId, Object3D>;
  private readonly anchors: Readonly<Record<AnchorId, Object3D>>;
  private pose: RunnerPose;
  private appliedFor: GaitReading | null = null;

  constructor(
    root: Group,
    context: PartContext,
    parts: Parts,
    solve: PoseSolver,
    state: AssemblyState,
  ) {
    this.root = root;
    this.context = context;
    this.parts = parts;
    this.solve = solve;
    this.pose = solve(state.reading);
    this.labels = new Map(PART_IDS.map((id) => [id, anchorAt(root, 0, 0, 0)]));
    this.anchors = Object.fromEntries(
      ANCHOR_IDS.map((id) => [id, anchorAt(root, 0, 0, 0)]),
    ) as Record<AnchorId, Object3D>;
  }

  setState(state: AssemblyState): void {
    const { runner, land, shadow, overlays } = this.parts;
    if (state.reading !== this.appliedFor) {
      this.appliedFor = state.reading;
      this.pose = this.solve(state.reading);
      runner.apply(state.reading);
      shadow.setPose(this.pose);
      this.moveAnchors();
    }
    land.setScroll(state.scrollM);
    overlays.setState(state, this.pose);
  }

  update(deltaSeconds: number): boolean {
    return this.parts.overlays.update(deltaSeconds);
  }

  fitTags(camera: Camera, frame: ViewportSize, keepOut: readonly Rect[]): Rect[] {
    return fitTags(this.parts.overlays.tags(), camera, frame, keepOut);
  }

  nameParts(parts: ReadonlySet<PartId>): void {
    this.parts.overlays.nameParts(parts);
  }

  labelAnchors(): ReadonlyMap<PartId, Object3D> {
    return this.labels;
  }

  anchor(id: AnchorId): Object3D {
    return this.anchors[id];
  }

  region(id: RegionId): Box3 {
    return regionBox(id);
  }

  chaseTarget(): ChaseTarget {
    const { x, y, z } = this.pose.pelvis;
    return { position: { x, y, z }, heading: 0 };
  }

  warmUp(compile: (object: Object3D) => void): void {
    const seen = new Set<Material | Material[]>();
    this.root.traverse((object) => {
      if (!isDrawable(object) || isShown(object) || seen.has(object.material)) return;
      seen.add(object.material);
      compile(object);
    });
  }

  dispose(): void {
    this.root.removeFromParent();
    this.parts.overlays.dispose();
    this.parts.runner.dispose();
    this.context.materials.clearRegistered();
    this.context.tracker.dispose();
  }

  private moveAnchors(): void {
    const points = labelPoints(this.pose);
    this.labels.forEach((object, id) => object.position.copy(points[id]));
    const { pelvis } = this.pose;
    this.anchors.runner.position.set(pelvis.x, 0, 0);
    this.anchors.pelvis.position.copy(pelvis);
    this.anchors.rightFoot.position.copy(this.pose.legs.right.ankle);
    this.anchors.head.position.copy(this.pose.headCentre);
  }
}

export function* createRunAssembly(
  resources: AssemblyResources,
  state: AssemblyState,
): Steps<Assembly> {
  const root = new Group();
  root.name = 'runningForm';
  const context: PartContext = {
    materials: resources.materials,
    textures: resources.textures,
    tracker: new ResourceTracker(),
  };
  const runner = yield* resources.buildRunner(context);
  root.add(runner.root);
  yield;
  const land = yield* buildLand(context);
  root.add(land.root);
  const shadow = new RunnerShadow(context);
  root.add(shadow.root);
  yield;
  const overlays = buildOverlays(context);
  root.add(overlays.root);
  return new RunAssembly(
    root,
    context,
    { runner, land, shadow, overlays },
    resources.solvePose,
    state,
  );
}
