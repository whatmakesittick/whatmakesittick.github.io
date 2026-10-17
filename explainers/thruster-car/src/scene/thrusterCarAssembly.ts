import { Box3, Group, Mesh, Points, Sprite } from 'three';
import type { Material, Object3D } from 'three';
import type { MaterialLibrary } from '@core/scene/materials';
import { isShown } from '@core/scene/parts';
import { ResourceTracker } from '@core/scene/resources';
import { CAR_REGION_IDS } from '../ids';
import type { AnchorId, AssemblyState, CarRegionId, PartId, RegionId } from '../ids';
import { CAR } from '../model/layout';
import type { Assembly, AssemblyResources, ChaseTarget } from './assembly';
import { CarPart } from './parts/car/car';
import type { PartContext } from './parts/context';
import { EffectsPart } from './parts/effects/effects';
import { createParkedRow } from './parts/row/parkedRow';
import { createWorld } from './parts/world/world';
import { carRegion, staticRegions } from './regions';

type Drawable = (Mesh | Points | Sprite) & { material: Material };

function isDrawable(object: Object3D): object is Drawable {
  const drawable = object instanceof Mesh || object instanceof Points || object instanceof Sprite;
  return drawable && !Array.isArray((object as Drawable).material);
}

function isCarRegion(id: RegionId): id is CarRegionId {
  return (CAR_REGION_IDS as readonly RegionId[]).includes(id);
}

export class ThrusterCarAssembly implements Assembly {
  readonly root = new Group();
  private readonly tracker = new ResourceTracker();
  private readonly materials: MaterialLibrary;
  private readonly car: CarPart;
  private readonly effects: EffectsPart;
  private readonly labels: ReadonlyMap<PartId, Object3D>;
  private readonly named: Readonly<Record<AnchorId, Object3D>>;
  private readonly regions: Readonly<Record<RegionId, Box3>>;
  private readonly chase: ChaseTarget = {
    position: [0, 0, 0],
    heading: 0,
    pitch: 0,
    roll: 0,
    span: CAR.wheelbase,
  };

  constructor(resources: AssemblyResources, state: AssemblyState) {
    this.materials = resources.materials;
    const context: PartContext = { ...resources, tracker: this.tracker };
    const world = createWorld(context);
    const row = createParkedRow(context);
    this.car = new CarPart(context);
    this.effects = new EffectsPart(context, this.car);
    this.root.add(world.object, row.object, this.car.object, this.effects.object);
    this.labels = new Map<PartId, Object3D>([
      ...this.car.labels,
      ...world.labels,
      ['parkedRow', row.label],
      ...this.effects.labels,
    ]);
    this.named = { ...this.car.anchors, ...world.anchors };
    this.regions = { ...staticRegions(), car: new Box3(), cabin: new Box3(), tail: new Box3() };
    this.setState(state);
  }

  setState(state: AssemblyState): void {
    const { position, pitch, roll } = state.car;
    this.chase.position = position;
    this.chase.pitch = pitch;
    this.chase.roll = roll;
    this.car.setState(state);
    this.car.object.updateMatrixWorld();
    this.effects.setState(state);
  }

  update(deltaSeconds: number): boolean {
    return this.effects.advance(deltaSeconds);
  }

  labelAnchors(): ReadonlyMap<PartId, Object3D> {
    return this.labels;
  }

  anchor(id: AnchorId): Object3D {
    return this.named[id];
  }

  region(id: RegionId): Box3 {
    const box = this.regions[id];
    return isCarRegion(id) ? carRegion(id, this.car.object, box) : box;
  }

  chaseTarget(): ChaseTarget {
    return this.chase;
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
    this.root.removeFromParent();
    this.materials.clearRegistered();
    this.tracker.dispose();
  }
}

export function createThrusterCarAssembly(
  resources: AssemblyResources,
  state: AssemblyState,
): Assembly {
  return new ThrusterCarAssembly(resources, state);
}
