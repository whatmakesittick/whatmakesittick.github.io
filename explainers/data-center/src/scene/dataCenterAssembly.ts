import { Group } from 'three';
import type { Box3, Line, Material, Mesh, Object3D, Points, Sprite } from 'three';
import type { MaterialLibrary } from '@core/scene/materials';
import { isShown } from '@core/scene/parts';
import { ResourceTracker } from '@core/scene/resources';
import { ANCHOR_IDS, PART_IDS } from '../ids';
import type { AnchorId, AssemblyState, ChaseTarget, PartId, RegionId } from '../ids';
import type { Assembly, AssemblyResources } from './assembly';
import { buildCampus } from './parts/campus';
import type { Frame, PartContext, Section } from './parts/context';
import { buildFlows } from './parts/flows';
import { buildHall } from './parts/hall';
import { OutageClock, RESTING_OUTAGE } from './parts/outage';
import type { OutageSample } from './parts/outage';
import { buildRack } from './parts/rack';
import { buildRegions } from './regions';

const ROOT_NAME = 'dataCenter';
const SECTION_BUILDERS = [buildCampus, buildHall, buildRack, buildFlows] as const;

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

class DataCenterAssembly implements Assembly {
  readonly root = new Group();
  private readonly materials: MaterialLibrary;
  private readonly tracker = new ResourceTracker();
  private readonly sections: readonly Section[];
  private readonly labels: ReadonlyMap<PartId, Object3D>;
  private readonly anchors: Readonly<Record<AnchorId, Object3D>>;
  private readonly regions = buildRegions();
  private readonly outage: OutageClock;
  private outageSample: OutageSample = RESTING_OUTAGE;
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
    this.outage = new OutageClock(state.outage);
    this.state = state;
    this.setState(state);
    this.animate({ delta: 0, cameraDistance: 0, outage: RESTING_OUTAGE });
  }

  setState(state: AssemblyState): void {
    this.state = state;
    this.outage.observe(state.outage);
    this.sections.forEach((section) => section.setState(state));
  }

  update(deltaSeconds: number, cameraDistance: number): boolean {
    const draining = this.outageSample.active;
    this.outageSample = this.outage.step(deltaSeconds);
    const moving = this.animate({ delta: deltaSeconds, cameraDistance, outage: this.outageSample });
    return moving || draining || this.outageSample.active;
  }

  labelAnchors(): ReadonlyMap<PartId, Object3D> {
    return this.labels;
  }

  anchor(id: AnchorId): Object3D {
    return this.anchors[id];
  }

  region(id: RegionId): Box3 {
    return this.regions[id].clone();
  }

  chaseTarget(): ChaseTarget {
    const { position, heading, span } = this.state.joule;
    return { position, heading, pitch: 0, roll: 0, span };
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
    this.materials.clearRegistered();
    this.tracker.dispose();
  }

  private animate(frame: Frame): boolean {
    return this.sections
      .map((section) => section.animate?.(frame, this.state) ?? false)
      .some(Boolean);
  }
}

export function createDataCenterAssembly(
  resources: AssemblyResources,
  state: AssemblyState,
): Assembly {
  return new DataCenterAssembly(resources, state);
}
