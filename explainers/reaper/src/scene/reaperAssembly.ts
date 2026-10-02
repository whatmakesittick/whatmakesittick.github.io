import { Box3, Group, Mesh, Points, Sprite } from 'three';
import type { Material, Object3D } from 'three';
import type { MaterialLibrary } from '@core/scene/materials';
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
import { CompoundPart } from './parts/world/compound';
import { createGround } from './parts/world/ground';
import { createMesas } from './parts/world/mesas';
import { createSatellite } from './parts/world/satellite';
import { createShrubs } from './parts/world/shrubs';
import { createSky } from './parts/world/sky';
import { staticRegions } from './regions';

type Drawable = (Mesh | Points | Sprite) & { material: Material };

function isDrawable(object: Object3D): object is Drawable {
  const drawable = object instanceof Mesh || object instanceof Points || object instanceof Sprite;
  return drawable && !Array.isArray((object as Drawable).material);
}

function createContext(resources: AssemblyResources, tracker: ResourceTracker): PartContext {
  const looks = createAirframeLooks({
    fuselage: tracker.track(panelTexture(FUSELAGE_PANELS)),
    hump: tracker.track(panelTexture(HUMP_PANELS)),
    wing: tracker.track(panelTexture(WING_PANELS)),
  });
  return { ...resources, tracker, looks };
}

export class ReaperAssembly implements Assembly {
  readonly root = new Group();
  private readonly tracker = new ResourceTracker();
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

  constructor(resources: AssemblyResources, state: AssemblyState) {
    this.materials = resources.materials;
    const context = createContext(resources, this.tracker);
    const airfield = createAirfield(context);
    const satellite = createSatellite(context);
    this.compound = new CompoundPart(context);
    this.aircraft = new AircraftPart(context);
    this.effects = new EffectsPart(context, {
      aircraft: this.aircraft,
      mastTop: airfield.mastTop,
      satellite: satellite.anchor,
    });
    this.root.add(
      createSky(context),
      createGround(context),
      createMesas(context),
      createShrubs(context),
      airfield.object,
      this.compound.object,
      satellite.object,
      this.aircraft.object,
      this.effects.object,
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

export function createReaperAssembly(resources: AssemblyResources, state: AssemblyState): Assembly {
  return new ReaperAssembly(resources, state);
}
