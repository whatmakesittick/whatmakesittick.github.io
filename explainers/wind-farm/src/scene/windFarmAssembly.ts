import { Group, Line, Mesh, Points, Sprite } from 'three';
import type { Box3, Material, Object3D } from 'three';
import type { MaterialLibrary } from '@core/scene/materials';
import { isShown } from '@core/scene/parts';
import { ResourceTracker } from '@core/scene/resources';
import { PART_IDS } from '../ids';
import type { AnchorId, AssemblyState, PartId, RegionId, SceneId } from '../ids';
import { advanceAzimuth } from '../model';
import type { Assembly, AssemblyResources } from './assembly';
import { buildFarmAir, buildStreamlines } from './parts/air';
import { namedGroup } from './parts/context';
import type { Motion, PartContext, Section } from './parts/context';
import { Ease } from './parts/ease';
import { buildFarm } from './parts/farm';
import { buildHero } from './parts/hero';
import { buildFarmLand, buildTurbineLand } from './parts/land';
import { buildRegions, refreshFarmRegions } from './regions';

const ROOT_NAME = 'windFarm';
const ANCHOR_IDS: readonly AnchorId[] = [
  'hub',
  'yawPivot',
  'towerBase',
  'farmCentre',
  'heroSite',
  'substation',
];

type Drawable = Mesh | Line | Points | Sprite;

function isDrawable(object: Object3D): object is Drawable {
  return (
    object instanceof Mesh ||
    object instanceof Line ||
    object instanceof Points ||
    object instanceof Sprite
  );
}

function completeLabels(found: ReadonlyMap<PartId, Object3D>): ReadonlyMap<PartId, Object3D> {
  return new Map(
    PART_IDS.map((id) => {
      const anchor = found.get(id);
      if (!anchor) throw new Error(`No label anchor for part ${id}`);
      return [id, anchor];
    }),
  );
}

function completeAnchors(
  found: Partial<Record<AnchorId, Object3D>>,
): Readonly<Record<AnchorId, Object3D>> {
  return Object.fromEntries(
    ANCHOR_IDS.map((id) => {
      const anchor = found[id];
      if (!anchor) throw new Error(`No scene anchor ${id}`);
      return [id, anchor];
    }),
  ) as Record<AnchorId, Object3D>;
}

class WindFarmAssembly implements Assembly {
  readonly root = new Group();
  private readonly materials: MaterialLibrary;
  private readonly tracker = new ResourceTracker();
  private readonly scenes: Record<SceneId, Group>;
  private readonly sections: Record<SceneId, readonly Section[]>;
  private readonly labels: ReadonlyMap<PartId, Object3D>;
  private readonly anchors: Readonly<Record<AnchorId, Object3D>>;
  private readonly regions: Record<RegionId, Box3>;
  private readonly pitch: Ease;
  private readonly rpm: Ease;
  private state: AssemblyState;
  private azimuth = 0;

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
    this.sections = {
      turbine: [buildTurbineLand(context), buildHero(context), buildStreamlines(context)],
      farm: [buildFarmLand(context), buildFarm(context), buildFarmAir(context)],
    };
    this.scenes = {
      turbine: namedGroup('turbineScene', this.root),
      farm: namedGroup('farmScene', this.root),
    };
    (Object.keys(this.sections) as SceneId[]).forEach((id) =>
      this.sections[id].forEach((section) => this.scenes[id].add(section.root)),
    );
    this.labels = completeLabels(context.labels);
    this.anchors = completeAnchors(context.anchors);
    this.regions = buildRegions(state.farm.spacing);
    this.pitch = new Ease(state.rotor.pitchDeg);
    this.rpm = new Ease(state.rotor.rpm);
    this.state = state;
    this.setState(state);
    this.animate(0, 0);
  }

  setState(state: AssemblyState): void {
    if (state.farm.spacing !== this.state.farm.spacing)
      refreshFarmRegions(this.regions, state.farm.spacing);
    this.state = state;
    this.pitch.aim(state.rotor.pitchDeg);
    this.rpm.aim(state.rotor.rpm);
    (Object.keys(this.scenes) as SceneId[]).forEach((id) => {
      this.scenes[id].visible = state.scene === id;
      this.sections[id].forEach((section) => section.setState(state));
    });
  }

  update(deltaSeconds: number, cameraDistance: number): boolean {
    this.pitch.step(deltaSeconds);
    this.rpm.step(deltaSeconds);
    this.azimuth = advanceAzimuth(this.azimuth, this.rpm.value, deltaSeconds);
    const sectionsMoving = this.animate(deltaSeconds, cameraDistance);
    return sectionsMoving || this.rpm.value > 0 || this.pitch.running || this.rpm.running;
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

  private animate(delta: number, cameraDistance: number): boolean {
    const motion: Motion = {
      delta,
      azimuth: this.azimuth,
      pitchDeg: this.pitch.value,
      rpm: this.rpm.value,
      cameraDistance,
    };
    return this.sections[this.state.scene]
      .map((section) => section.animate?.(motion, this.state) ?? false)
      .some(Boolean);
  }
}

export function createWindFarmAssembly(
  resources: AssemblyResources,
  state: AssemblyState,
): Assembly {
  return new WindFarmAssembly(resources, state);
}
