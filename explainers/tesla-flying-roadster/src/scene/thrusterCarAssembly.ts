import { Box3, Group, Mesh, Points, Sprite } from 'three';
import type { Material, Object3D } from 'three';
import type { MaterialLibrary } from '@core/scene/materials';
import { isShown } from '@core/scene/parts';
import { ResourceTracker } from '@core/scene/resources';
import { CAR_REGION_IDS } from '../ids';
import type { AnchorId, AssemblyState, CarRegionId, PartId, RegionId } from '../ids';
import { CAR } from '../model/layout';
import type { Assembly, AssemblyResources, ChaseTarget } from './assembly';
import { buildCar } from './parts/car/car';
import type { CarPart } from './parts/car/car';
import type { PartContext } from './parts/context';
import { EffectsPart } from './parts/effects/effects';
import { createParkedRow } from './parts/row/parkedRow';
import { createWorld } from './parts/world/world';
import type { WorldView } from './parts/types';
import { siteTextures } from './geometry/site/siteTextures';
import { paintSitePixels } from './sitePixels';
import { paintInWorker } from './pixelWorker';
import { runPaced } from '@core/scene/pacing';
import type { Steps } from '@core/scene/pacing';
import { carRegion, staticRegions } from './regions';

interface NearParts {
  car: CarPart;
  effects: EffectsPart;
  row: ReturnType<typeof createParkedRow>;
}

interface AssemblyParts extends NearParts {
  world: WorldView;
  tracker: ResourceTracker;
}

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
  private readonly tracker: ResourceTracker;
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

  constructor(resources: AssemblyResources, parts: AssemblyParts, state: AssemblyState) {
    const { world, row, car, effects, tracker } = parts;
    this.materials = resources.materials;
    this.tracker = tracker;
    this.car = car;
    this.effects = effects;
    this.root.add(world.object, row.object, car.object, effects.object);
    this.labels = new Map<PartId, Object3D>([
      ...car.labels,
      ...world.labels,
      ['parkedRow', row.label],
      ...effects.labels,
    ]);
    this.named = { ...car.anchors, ...world.anchors };
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

function* buildNearParts(context: PartContext): Steps<NearParts> {
  const car = yield* buildCar(context);
  yield;
  const effects = new EffectsPart(context, car);
  return { car, effects, row: createParkedRow(context) };
}

async function buildParts(resources: AssemblyResources): Promise<AssemblyParts> {
  const tracker = new ResourceTracker();
  const context: PartContext = { ...resources, tracker };
  const pixels = paintSitePixels(paintInWorker);
  const near = await runPaced(buildNearParts(context));
  const site = siteTextures(await pixels, tracker);
  const world = await runPaced(createWorld({ ...context, site }));
  return { ...near, world, tracker };
}

export async function createThrusterCarAssembly(
  resources: AssemblyResources,
  state: AssemblyState,
): Promise<Assembly> {
  return new ThrusterCarAssembly(resources, await buildParts(resources), state);
}
