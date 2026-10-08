import { Group } from 'three';
import type { Box3, Object3D } from 'three';
import type { MaterialLibrary } from '@core/scene/materials';
import { ResourceTracker } from '@core/scene/resources';
import { PART_IDS } from '../ids';
import type { AnchorId, AssemblyState, PartId, RegionId } from '../ids';
import { advanceAzimuth } from '../model';
import type { Assembly, AssemblyResources } from './assembly';
import type { PlaceholderScene } from './placeholder/build';
import { buildFarmScene } from './placeholder/farm';
import { buildRegions, refreshFarmRegions } from './placeholder/regions';
import { buildTurbineScene } from './placeholder/turbine';

const ROOT_NAME = 'windFarmPlaceholder';
const ANCHOR_IDS: readonly AnchorId[] = [
  'hub',
  'yawPivot',
  'towerBase',
  'farmCentre',
  'heroSite',
  'substation',
];

function collectLabels(scenes: readonly PlaceholderScene[]): ReadonlyMap<PartId, Object3D> {
  const found = new Map(scenes.flatMap((scene) => [...scene.labels]));
  return new Map(
    PART_IDS.map((id) => {
      const anchor = found.get(id);
      if (!anchor) throw new Error(`No label anchor for part ${id}`);
      return [id, anchor];
    }),
  );
}

function collectAnchors(scenes: readonly PlaceholderScene[]): Readonly<Record<AnchorId, Object3D>> {
  const provided: Partial<Record<AnchorId, Object3D>> = Object.assign(
    {},
    ...scenes.map((scene) => scene.anchors),
  );
  return Object.fromEntries(
    ANCHOR_IDS.map((id) => {
      const anchor = provided[id];
      if (!anchor) throw new Error(`No scene anchor ${id}`);
      return [id, anchor];
    }),
  ) as Record<AnchorId, Object3D>;
}

function keepsMoving(state: AssemblyState): boolean {
  const { rotor, view, farm } = state;
  return rotor.rpm > 0 || view.streamlines || (view.cables && farm.outputShare > 0);
}

class PlaceholderAssembly implements Assembly {
  readonly root = new Group();
  private readonly materials: MaterialLibrary;
  private readonly tracker = new ResourceTracker();
  private readonly turbine: PlaceholderScene;
  private readonly farm: PlaceholderScene;
  private readonly labels: ReadonlyMap<PartId, Object3D>;
  private readonly anchors: Readonly<Record<AnchorId, Object3D>>;
  private readonly regions: Record<RegionId, Box3>;
  private state: AssemblyState;
  private azimuth = 0;

  constructor(resources: AssemblyResources, state: AssemblyState) {
    this.materials = resources.materials;
    this.root.name = ROOT_NAME;
    const context = { materials: resources.materials, tracker: this.tracker };
    this.turbine = buildTurbineScene(context);
    this.farm = buildFarmScene(context);
    this.root.add(this.turbine.root, this.farm.root);
    this.labels = collectLabels([this.turbine, this.farm]);
    this.anchors = collectAnchors([this.turbine, this.farm]);
    this.regions = buildRegions(state.farm.spacing);
    this.state = state;
    this.setState(state);
  }

  setState(state: AssemblyState): void {
    if (state.farm.spacing !== this.state.farm.spacing)
      refreshFarmRegions(this.regions, state.farm.spacing);
    this.state = state;
    this.turbine.root.visible = state.scene === 'turbine';
    this.farm.root.visible = state.scene === 'farm';
    this.turbine.setState(state);
    this.farm.setState(state);
    this.applyAzimuth();
  }

  update(deltaSeconds: number): boolean {
    this.azimuth = advanceAzimuth(this.azimuth, this.state.rotor.rpm, deltaSeconds);
    this.applyAzimuth();
    return keepsMoving(this.state);
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

  dispose(): void {
    this.materials.clearRegistered();
    this.tracker.dispose();
  }

  private applyAzimuth(): void {
    this.turbine.setAzimuth(this.azimuth);
    this.farm.setAzimuth(this.azimuth);
  }
}

export function createPlaceholderAssembly(
  resources: AssemblyResources,
  state: AssemblyState,
): Assembly {
  return new PlaceholderAssembly(resources, state);
}
