import { Group } from 'three';
import type { Box3, Line, Material, Mesh, Object3D, Points, Sprite } from 'three';
import type { MaterialLibrary } from '@core/scene/materials';
import { isShown } from '@core/scene/parts';
import { ResourceTracker } from '@core/scene/resources';
import { ANCHOR_IDS, PART_IDS } from '../ids';
import type { AnchorId, AssemblyState, ChaseTarget, PartId, RegionId } from '../ids';
import type { Assembly, AssemblyResources } from './assembly';
import type { Frame, NudgeSample, PartContext, Section } from './parts/context';
import { buildInset } from './parts/inset';
import { buildLand } from './parts/land';
import { buildLine } from './parts/line';
import { buildLineUp } from './parts/lineUp';
import { NudgeResponse, RESTING_NUDGE } from './parts/nudge';
import { buildTrain } from './parts/train';
import { chaseTargetFor } from './pose';
import { buildRegions } from './regions';

const ROOT_NAME = 'maglevTrain';
const SECTION_BUILDERS = [buildLand, buildLine, buildTrain, buildInset, buildLineUp] as const;

type Drawable = Mesh | Line | Points | Sprite;

function isDrawable(object: Object3D): object is Drawable {
  return 'material' in object;
}

function completed<Id extends string>(
  ids: readonly Id[],
  find: (id: Id) => Object3D | undefined,
  missing: string,
): [Id, Object3D][] {
  return ids.map((id) => {
    const anchor = find(id);
    if (!anchor) throw new Error(`${missing} ${id}`);
    return [id, anchor];
  });
}

class MaglevTrainAssembly implements Assembly {
  readonly root = new Group();
  private readonly materials: MaterialLibrary;
  private readonly tracker = new ResourceTracker();
  private readonly sections: readonly Section[];
  private readonly labels: ReadonlyMap<PartId, Object3D>;
  private readonly anchors: Readonly<Record<AnchorId, Object3D>>;
  private readonly regions = buildRegions();
  private readonly nudge: NudgeResponse;
  private nudgeSample: NudgeSample = RESTING_NUDGE;
  private state: AssemblyState;

  constructor(resources: AssemblyResources, state: AssemblyState) {
    this.materials = resources.materials;
    this.root.name = ROOT_NAME;
    const context: PartContext = {
      materials: resources.materials,
      textures: resources.textures,
      tracker: this.tracker,
      labels: new Map(),
      anchors: {},
    };
    this.sections = SECTION_BUILDERS.map((build) => build(context));
    this.sections.forEach((section) => this.root.add(section.root));
    this.labels = new Map(
      completed(PART_IDS, (id) => context.labels.get(id), 'No label anchor for part'),
    );
    this.anchors = Object.fromEntries(
      completed(ANCHOR_IDS, (id) => context.anchors[id], 'No scene anchor'),
    ) as Record<AnchorId, Object3D>;
    this.nudge = new NudgeResponse(state.nudge);
    this.state = state;
    this.setState(state);
    this.animate({ delta: 0, cameraDistance: 0, nudge: RESTING_NUDGE });
  }

  setState(state: AssemblyState): void {
    this.state = state;
    this.nudge.observe(state.nudge);
    this.sections.forEach((section) => section.setState(state));
  }

  update(deltaSeconds: number, cameraDistance: number): boolean {
    const settling = this.nudgeSample.active;
    this.nudgeSample = this.nudge.step(deltaSeconds);
    const moving = this.animate({ delta: deltaSeconds, cameraDistance, nudge: this.nudgeSample });
    return moving || settling || this.nudgeSample.active;
  }

  labelAnchors(): ReadonlyMap<PartId, Object3D> {
    return this.labels;
  }

  anchor(id: AnchorId): Object3D {
    return this.anchors[id];
  }

  region(id: RegionId): Box3 {
    return this.regions[id];
  }

  chaseTarget(): ChaseTarget {
    return chaseTargetFor(this.state.motion, this.nudgeSample.lateralMm);
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
    this.materials.clearRegistered();
    this.tracker.dispose();
  }

  private animate(frame: Frame): boolean {
    return this.sections
      .map((section) => section.animate?.(frame, this.state) ?? false)
      .some(Boolean);
  }
}

export function createMaglevTrainAssembly(
  resources: AssemblyResources,
  state: AssemblyState,
): Assembly {
  return new MaglevTrainAssembly(resources, state);
}
