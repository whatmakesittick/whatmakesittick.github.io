import { Group } from 'three';
import type { Box3, Material, Object3D } from 'three';
import type { MaterialLibrary } from '@core/scene/materials';
import { runPaced } from '@core/scene/pacing';
import type { Steps } from '@core/scene/pacing';
import { anchorAt, isShown } from '@core/scene/parts';
import { ResourceTracker } from '@core/scene/resources';
import { PART_IDS } from '../ids';
import type { AnchorId, AssemblyState, PartId, RegionId } from '../ids';
import { ISOCENTRE } from '../model/layout';
import type { Assembly, AssemblyResources } from './assembly';
import type { PartContext, SceneModule } from './parts/context';
import { createEffectsModule } from './parts/effects/effects';
import { createMagnetModule } from './parts/magnet/magnet';
import { createRoomModule } from './parts/room/room';
import { createSubjectModule } from './parts/subject/subject';
import { buildRegions } from './regions';

const MODULE_FACTORIES: readonly ((context: PartContext) => Steps<SceneModule>)[] = [
  createRoomModule,
  createSubjectModule,
  createMagnetModule,
  createEffectsModule,
];

const ROOT_NAME = 'mriScanner';

type Drawable = Object3D & { material: Material };

function isDrawable(object: Object3D): object is Drawable {
  return 'material' in object && !Array.isArray(object.material);
}

function collectLabels(modules: readonly SceneModule[]): ReadonlyMap<PartId, Object3D> {
  const found = new Map(modules.flatMap((module) => [...module.labels]));
  return new Map(
    PART_IDS.map((id) => {
      const anchor = found.get(id);
      if (!anchor) throw new Error(`No label anchor for part ${id}`);
      return [id, anchor];
    }),
  );
}

function collectAnchors(
  root: Object3D,
  modules: readonly SceneModule[],
): Readonly<Record<AnchorId, Object3D>> {
  const provided = Object.assign({}, ...modules.map((module) => module.anchors)) as Partial<
    Record<AnchorId, Object3D>
  >;
  const { voxel, headCoil, screen, coldHead } = provided;
  if (!voxel || !headCoil || !screen || !coldHead) throw new Error('A scene anchor is missing');
  return { isocentre: anchorAt(root, ...ISOCENTRE), voxel, headCoil, screen, coldHead };
}

class MriScannerAssembly implements Assembly {
  readonly root = new Group();
  private readonly materials: MaterialLibrary;
  private readonly tracker: ResourceTracker;
  private readonly modules: readonly SceneModule[];
  private readonly labels: ReadonlyMap<PartId, Object3D>;
  private readonly anchors: Readonly<Record<AnchorId, Object3D>>;
  private readonly regions = buildRegions();

  constructor(
    resources: AssemblyResources,
    tracker: ResourceTracker,
    modules: readonly SceneModule[],
    state: AssemblyState,
  ) {
    this.materials = resources.materials;
    this.tracker = tracker;
    this.root.name = ROOT_NAME;
    this.modules = modules;
    this.modules.forEach((module) => this.root.add(module.root));
    this.labels = collectLabels(this.modules);
    this.anchors = collectAnchors(this.root, this.modules);
    this.setState(state);
  }

  setState(state: AssemblyState): void {
    this.modules.forEach((module) => module.setState(state));
  }

  update(deltaSeconds: number, cameraDistance: number): boolean {
    return this.modules.reduce(
      (moving, module) => module.update(deltaSeconds, cameraDistance) || moving,
      false,
    );
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

  warmUp(compile: (object: Object3D) => void): void {
    const seen = new Set<Material>();
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
}

function* buildModules(context: PartContext): Steps<SceneModule[]> {
  const modules: SceneModule[] = [];
  for (const create of MODULE_FACTORIES) modules.push(yield* create(context));
  return modules;
}

export async function createMriScannerAssembly(
  resources: AssemblyResources,
  state: AssemblyState,
): Promise<Assembly> {
  const tracker = new ResourceTracker();
  const modules = await runPaced(buildModules({ ...resources, tracker }));
  return new MriScannerAssembly(resources, tracker, modules, state);
}
