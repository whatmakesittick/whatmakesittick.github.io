import { Group, Line, Mesh, Points, Sprite, Vector3 } from 'three';
import type { Box3, Material, Object3D } from 'three';
import { anchorAt, isShown } from '@core/scene/parts';
import type { Steps } from '@core/scene/pacing';
import { ResourceTracker } from '@core/scene/resources';
import { PART_IDS } from '../ids';
import type { AnchorId, AssemblyState, PartId, RegionId } from '../ids';
import type { Assembly, AssemblyResources } from './assembly';
import type { PartContext } from './parts/context';
import { ForceArrows } from './parts/forces';
import { HandPath } from './parts/handPath';
import { buildPool } from './parts/pool/pool';
import type { Pool, WaterCues } from './parts/pool/pool';
import { Swimmer } from './parts/swimmer/swimmer';
import { HEAD } from './parts/swimmer/shapes';
import { bodyPose } from './pose';
import { regionBox } from './regions';
import { createSkeleton, solveSkeleton } from './rig/skeleton';

const HEAD_UP_SECONDS = 0.7;
const SETTLED = 1e-3;

type Drawable = Mesh | Line | Points | Sprite;

function isDrawable(object: Object3D): object is Drawable {
  return (
    object instanceof Mesh ||
    object instanceof Line ||
    object instanceof Points ||
    object instanceof Sprite
  );
}

class SwimAssembly implements Assembly {
  readonly root: Group;
  private readonly context: PartContext;
  private readonly swimmer: Swimmer;
  private readonly pool: Pool;
  private readonly skeleton = createSkeleton();
  private readonly forces: ForceArrows;
  private readonly handPath: HandPath;
  private readonly labels: ReadonlyMap<PartId, Object3D>;
  private readonly anchors: Readonly<Record<AnchorId, Object3D>>;
  private readonly cues: WaterCues = {
    rightHand: new Vector3(),
    leftHand: new Vector3(),
    head: new Vector3(),
  };
  private readonly skull = new Vector3(...HEAD.skull.centre);
  private state: AssemblyState;
  private headUp: number;

  constructor(
    root: Group,
    context: PartContext,
    swimmer: Swimmer,
    pool: Pool,
    state: AssemblyState,
  ) {
    this.root = root;
    this.context = context;
    this.swimmer = swimmer;
    this.pool = pool;
    this.state = state;
    this.headUp = state.headUp ? 1 : 0;
    this.forces = new ForceArrows(context);
    this.handPath = new HandPath(context);
    swimmer.root.add(this.forces.root, this.handPath.root);
    const found = new Map<PartId, Object3D>([
      ...swimmer.labels,
      ...Object.entries(pool.anchors),
    ] as [PartId, Object3D][]);
    this.labels = new Map(
      PART_IDS.map((id) => {
        const anchor = found.get(id);
        if (!anchor) throw new Error(`No label anchor for part ${id}`);
        return [id, anchor];
      }),
    );
    this.anchors = {
      swimmer: anchorAt(swimmer.root, 0, 0, 0),
      rightHand: swimmer.rightHand,
      head: this.labels.get('head') ?? swimmer.root,
    };
    this.setState(state);
  }

  setState(state: AssemblyState): void {
    this.state = state;
    this.pose();
    this.handPath.setState(state);
    this.pool.setState(state, this.cues);
  }

  update(deltaSeconds: number): boolean {
    const target = this.state.headUp ? 1 : 0;
    const easing = Math.abs(target - this.headUp) > SETTLED;
    if (easing) {
      const step = deltaSeconds / HEAD_UP_SECONDS;
      this.headUp =
        target > this.headUp
          ? Math.min(target, this.headUp + step)
          : Math.max(target, this.headUp - step);
      this.pose();
    }
    const fading = this.forces.update(deltaSeconds);
    return this.pool.update(deltaSeconds) || easing || fading;
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
    this.context.materials.clearRegistered();
    this.context.tracker.dispose();
  }

  private pose(): void {
    const { reading } = this.state;
    const body = bodyPose(this.headUp, reading.surgeM);
    const group = this.swimmer.root;
    group.position.set(body.x, body.y, 0);
    group.rotation.z = body.pitchRad;
    group.updateMatrix();
    solveSkeleton(this.skeleton, reading, this.headUp, body.y);
    this.swimmer.apply(this.skeleton);
    this.forces.setState(this.state, this.skeleton);
    this.cues.rightHand.copy(this.skeleton.arms.right.hand).applyMatrix4(group.matrix);
    this.cues.leftHand.copy(this.skeleton.arms.left.hand).applyMatrix4(group.matrix);
    this.cues.head
      .copy(this.skull)
      .applyQuaternion(this.skeleton.head)
      .add(this.skeleton.neck)
      .applyMatrix4(group.matrix);
  }
}

export function* createSwimAssembly(
  resources: AssemblyResources,
  state: AssemblyState,
): Steps<Assembly> {
  const root = new Group();
  root.name = 'freestyleSwim';
  const context: PartContext = { ...resources, tracker: new ResourceTracker() };
  const swimmer = new Swimmer(context);
  root.add(swimmer.root);
  yield;
  const pool = yield* buildPool(context);
  root.add(pool.root);
  return new SwimAssembly(root, context, swimmer, pool, state);
}
