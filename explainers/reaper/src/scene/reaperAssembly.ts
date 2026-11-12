import { Box3, Group, Mesh, Points, Sprite } from 'three';
import type { Material, Object3D } from 'three';
import type { MaterialLibrary } from '@core/scene/materials';
import { runPaced } from '@core/scene/pacing';
import type { Steps } from '@core/scene/pacing';
import { isShown } from '@core/scene/parts';
import { ResourceTracker } from '@core/scene/resources';
import type { AnchorId, AssemblyState, PartId, Point, RegionId } from '../ids';
import { AIRCRAFT, TARGET } from '../model/layout';
import type { Assembly, AssemblyResources, ChaseTarget } from './assembly';
import { FUSELAGE_PANELS, HUMP_PANELS, STRUCK_STAGES, WING_PANELS } from './constants';
import { createAirframeLooks } from './finishes';
import { panelTexture } from './geometry/surfaceMaps';
import { AircraftPart } from './parts/aircraft/aircraft';
import type { PartContext } from './parts/context';
import { EffectsPart } from './parts/effects/effects';
import { createAirfield } from './parts/world/airfield';
import type { AirfieldPart } from './parts/world/airfield';
import { CompoundPart } from './parts/world/compound';
import { createGround } from './parts/world/ground';
import { createMesas } from './parts/world/mesas';
import { createSatellite } from './parts/world/satellite';
import type { SatellitePart } from './parts/world/satellite';
import { createShrubs } from './parts/world/shrubs';
import { createSky } from './parts/world/sky';
import { staticRegions } from './regions';

type Drawable = (Mesh | Points | Sprite) & { material: Material };

function isDrawable(object: Object3D): object is Drawable {
  const drawable = object instanceof Mesh || object instanceof Points || object instanceof Sprite;
  return drawable && !Array.isArray((object as Drawable).material);
}

interface AssemblyParts {
  tracker: ResourceTracker;
  airfield: AirfieldPart;
  satellite: SatellitePart;
  compound: CompoundPart;
  aircraft: AircraftPart;
  effects: EffectsPart;
  world: { sky: Mesh; ground: Mesh; mesas: Mesh; shrubs: Points };
}

function* buildParts(resources: AssemblyResources): Steps<AssemblyParts> {
  const tracker = new ResourceTracker();
  const fuselage = tracker.track(panelTexture(FUSELAGE_PANELS));
  yield;
  const hump = tracker.track(panelTexture(HUMP_PANELS));
  yield;
  const wing = tracker.track(panelTexture(WING_PANELS));
  const context: PartContext = {
    ...resources,
    tracker,
    looks: createAirframeLooks({ fuselage, hump, wing }),
  };
  yield;
  const airfield = createAirfield(context);
  yield;
  const satellite = createSatellite(context);
  const compound = new CompoundPart(context);
  yield;
  const aircraft = new AircraftPart(context);
  yield;
  const effects = new EffectsPart(context, {
    aircraft,
    mastTop: airfield.mastTop,
    satellite: satellite.anchor,
  });
  yield;
  const sky = createSky(context);
  yield;
  const ground = yield* createGround(context);
  yield;
  const mesas = createMesas(context);
  const shrubs = createShrubs(context);
  return {
    tracker,
    airfield,
    satellite,
    compound,
    aircraft,
    effects,
    world: { sky, ground, mesas, shrubs },
  };
}

export class ReaperAssembly implements Assembly {
  readonly root = new Group();
  private readonly tracker: ResourceTracker;
  private readonly materials: MaterialLibrary;
  private readonly aircraft: AircraftPart;
  private readonly compound: CompoundPart;
  private readonly effects: EffectsPart;
  private readonly labels: ReadonlyMap<PartId, Object3D>;
  private readonly named: Readonly<Record<AnchorId, Object3D>>;
  private readonly regions: Readonly<Record<RegionId, Box3>>;
  private position: Point = [0, 0, 0];
  private heading = 0;
  private playing = false;

  constructor(resources: AssemblyResources, parts: AssemblyParts, state: AssemblyState) {
    const { airfield, satellite, compound, aircraft, effects, world } = parts;
    this.materials = resources.materials;
    this.tracker = parts.tracker;
    this.compound = compound;
    this.aircraft = aircraft;
    this.effects = effects;
    this.root.add(
      world.sky,
      world.ground,
      world.mesas,
      world.shrubs,
      airfield.object,
      compound.object,
      satellite.object,
      aircraft.object,
      effects.object,
    );
    this.labels = new Map<PartId, Object3D>([
      ...this.aircraft.labels,
      ['runway', airfield.runwayAnchor],
      ['groundStation', airfield.stationAnchor],
      ['losAntenna', airfield.mastAnchor],
      ['satellite', satellite.anchor],
      ['target', this.compound.anchor],
      ...this.effects.labels,
    ]);
    this.named = {
      aircraft: this.aircraft.object,
      sensorBall: this.aircraft.ball,
      hump: this.aircraft.hump,
      target: this.compound.anchor,
      groundStation: airfield.stationAnchor,
      satellite: satellite.anchor,
      missile: this.effects.missileAnchor,
    };
    this.regions = { ...staticRegions(), aircraft: new Box3() };
    this.setState(state);
  }

  setState(state: AssemblyState): void {
    this.position = state.flight.position;
    this.heading = state.flight.heading;
    this.playing = state.playing;
    this.root.updateMatrixWorld();
    this.aircraft.setState(state);
    this.aircraft.worldBox(this.regions.aircraft);
    this.compound.setHit(STRUCK_STAGES.includes(state.strike.stage));
    this.effects.setState(state);
  }

  update(deltaSeconds: number, _cameraDistance: number): boolean {
    if (!this.playing) return false;
    this.aircraft.advance(deltaSeconds);
    this.effects.advance(deltaSeconds);
    return true;
  }

  labelAnchors(): ReadonlyMap<PartId, Object3D> {
    return this.labels;
  }

  anchor(id: AnchorId): Object3D {
    return this.named[id];
  }

  region(id: RegionId): Box3 {
    return this.regions[id];
  }

  chaseTarget(): ChaseTarget {
    return { position: this.position, heading: this.heading, span: AIRCRAFT.span, target: TARGET };
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

export async function createReaperAssembly(
  resources: AssemblyResources,
  state: AssemblyState,
): Promise<Assembly> {
  return new ReaperAssembly(resources, await runPaced(buildParts(resources)), state);
}
