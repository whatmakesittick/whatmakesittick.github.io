import { Group, Vector3 } from 'three';
import type { Box3, Object3D } from 'three';
import type { MaterialLibrary } from '@core/scene/materials';
import { runPaced } from '@core/scene/pacing';
import type { Steps } from '@core/scene/pacing';
import { ResourceTracker } from '@core/scene/resources';
import { ANCHOR_IDS, PART_IDS } from '../ids';
import type { AnchorId, AssemblyState, ChaseTarget, PartId, RegionId } from '../ids';
import type { Assembly, AssemblyResources } from './assembly';
import type { PartContext, Section, SectionBuilder } from './parts/context';
import { buildBay } from './parts/bay';
import { buildFab } from './parts/fab';
import { buildInsets } from './parts/insets';
import { buildLight } from './parts/light';
import { buildOptics } from './parts/optics';
import { buildSource } from './parts/source';
import { buildStages } from './parts/stages';
import { regionBox } from './regions';

const ROOT_NAME = 'euvLithography';
const RESTING_CAMERA = new Vector3();
const SECTION_BUILDERS: readonly SectionBuilder[] = [
  buildBay,
  buildFab,
  buildSource,
  buildOptics,
  buildStages,
  buildLight,
  buildInsets,
];

function completed<Id extends string>(
  ids: readonly Id[],
  find: (id: Id) => Object3D | undefined,
  missing: string,
): [Id, Object3D][] {
  return ids.map((id) => {
    const found = find(id);
    if (!found) throw new Error(`${missing} ${id}`);
    return [id, found];
  });
}

export function withChaseCutaway(state: AssemblyState): AssemblyState {
  const { view } = state;
  if (!view.follow || view.cutaway) return state;
  return { ...state, view: { ...view, cutaway: true } };
}

class EuvLithographyAssembly implements Assembly {
  readonly root = new Group();
  private readonly materials: MaterialLibrary;
  private readonly tracker: ResourceTracker;
  private readonly sections: readonly Section[];
  private readonly labels: ReadonlyMap<PartId, Object3D>;
  private readonly anchors: Readonly<Record<AnchorId, Object3D>>;
  private state: AssemblyState;
  private elapsed = 0;

  constructor(context: PartContext, sections: readonly Section[], state: AssemblyState) {
    this.materials = context.materials;
    this.tracker = context.tracker;
    this.root.name = ROOT_NAME;
    this.sections = sections;
    this.sections.forEach((section) => this.root.add(section.root));
    this.labels = new Map(
      completed(PART_IDS, (id) => context.labels.get(id), 'No label anchor for part'),
    );
    this.anchors = Object.fromEntries(
      completed(ANCHOR_IDS, (id) => context.anchors[id], 'No scene anchor'),
    ) as Record<AnchorId, Object3D>;
    this.state = state;
    this.setState(state);
    this.animate(0, 0, RESTING_CAMERA);
  }

  setState(state: AssemblyState): void {
    const shown = withChaseCutaway(state);
    this.state = shown;
    this.sections.forEach((section) => section.setState(shown));
  }

  update(deltaSeconds: number, cameraDistance: number, cameraPosition: Readonly<Vector3>): boolean {
    return this.animate(deltaSeconds, cameraDistance, cameraPosition);
  }

  labelAnchors(): ReadonlyMap<PartId, Object3D> {
    return this.labels;
  }

  anchor(id: AnchorId): Object3D {
    return this.anchors[id];
  }

  region(id: RegionId): Box3 {
    this.root.updateMatrixWorld();
    return regionBox(id, this.root.matrixWorld);
  }

  chaseTarget(): ChaseTarget {
    const { position, span } = this.state.flash;
    return { position, span };
  }

  warmUp(compile: (object: Object3D) => void): void {
    this.sections.forEach((section) => section.warmUp?.(compile));
  }

  dispose(): void {
    this.root.removeFromParent();
    this.materials.clearRegistered();
    this.tracker.dispose();
  }

  private animate(
    delta: number,
    cameraDistance: number,
    cameraPosition: Readonly<Vector3>,
  ): boolean {
    this.elapsed += delta;
    const frame = { delta, elapsed: this.elapsed, cameraDistance, cameraPosition };
    return this.sections
      .map((section) => section.animate?.(frame, this.state) ?? false)
      .some(Boolean);
  }
}

export function* buildEuvLithographyAssembly(
  resources: AssemblyResources,
  state: AssemblyState,
): Steps<Assembly> {
  const context: PartContext = {
    materials: resources.materials,
    textures: resources.textures,
    tracker: new ResourceTracker(),
    labels: new Map(),
    anchors: {},
  };
  const sections: Section[] = [];
  for (const build of SECTION_BUILDERS) {
    sections.push(yield* build(context));
    yield;
  }
  return new EuvLithographyAssembly(context, sections, state);
}

export function createEuvLithographyAssembly(
  resources: AssemblyResources,
  state: AssemblyState,
): Promise<Assembly> {
  return runPaced(buildEuvLithographyAssembly(resources, state));
}
