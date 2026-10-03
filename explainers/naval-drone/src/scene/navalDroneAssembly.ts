import { Box3, Group, HemisphereLight, Matrix4, Mesh, Points, Sprite } from 'three';
import type { Material, Object3D } from 'three';
import type { MaterialLibrary } from '@core/scene/materials';
import { anchorAt, isShown } from '@core/scene/parts';
import { ResourceTracker } from '@core/scene/resources';
import type { AnchorId, AssemblyState, PartId, RegionId } from '../ids';
import {
  BACKUP_PANEL_X,
  BACKUP_SATELLITE_OFFSET,
  BOAT,
  BOW_CAMERA,
  DOME,
  FORMATION,
  HULL_DETAIL,
  HULL_STATIONS,
  PANEL,
  SATELLITE_OFFSET,
  STARLINK_PANEL_XS,
  skyPoint,
} from '../model/layout';
import { SHIP_CENTRE, SHIP_HEADING, companionsAt, poseAtDistance } from '../model/run';
import { knotsToMs } from '../model/scale';
import type { Assembly, AssemblyResources, ChaseTarget } from './assembly';
import {
  ANIMATION,
  LABEL_SPOTS,
  LIGHT_RIG,
  MOTION,
  SEA_FOAM,
  SUN_DIRECTION,
  SURFACE_MAPS,
  WAKE,
} from './constants';
import { createBoatLooks } from './finishes';
import { hullSectionAt } from './geometry/hullLines';
import { pathTrail, routeTrail, straightTrail, trailSpacing } from './geometry/trail';
import type { TrailSample } from './geometry/trail';
import { BoatPart } from './parts/boat/boat';
import { CompanionPart, buildCompanionGeometry } from './parts/boat/companion';
import { buildMissileFit } from './parts/boat/missiles';
import type { MissileFit } from './parts/boat/missiles';
import type { PartContext } from './parts/context';
import { GhostPart } from './parts/effects/ghost';
import { LinksPart } from './parts/effects/links';
import { cellTexture, deckTexture, hullSideTexture, noiseTexture } from './parts/surfaces';
import {
  SHIP_SPAN,
  SmoothMotion,
  applyMotion,
  motionBlend,
  responseFor,
  waveMotion,
} from './parts/water/boatMotion';
import { FlowPart } from './parts/water/flow';
import { HullWaterPart } from './parts/water/hullWater';
import { JetStreamPart } from './parts/water/jetStream';
import { SeaPart } from './parts/water/sea';
import { foamTexture } from './parts/water/seaMaps';
import { placeSection, sectionFrame } from './parts/water/sectionMask';
import { WakePart } from './parts/water/wake';
import type { WakeParams } from './parts/water/wake';
import { WaterSectionPart } from './parts/water/waterSection';
import { WATER, resetWater, waveVectors } from './parts/water/waves';
import { WettedBarPart } from './parts/water/wettedBar';
import { createBackupSatellite, createStarlinkSatellite } from './parts/world/satellites';
import type { SatellitePart } from './parts/world/satellites';
import { createShip } from './parts/world/ship';
import type { ShipPart } from './parts/world/ship';
import { createShore } from './parts/world/shore';
import { createSky } from './parts/world/sky';
import { boatRegion, staticRegions } from './regions';

type Drawable = (Mesh | Points | Sprite) & { material: Material };

interface Companion {
  part: CompanionPart;
  wake: WakePart;
  water: HullWaterPart;
  missiles: MissileFit;
  motion: SmoothMotion;
}

const COMPANION_COUNT = 2;
const HISTORY_STEP = 0.25;
const HISTORY_STEPS = 60;

function isDrawable(object: Object3D): object is Drawable {
  const drawable = object instanceof Mesh || object instanceof Points || object instanceof Sprite;
  return drawable && !Array.isArray((object as Drawable).material);
}

function createContext(resources: AssemblyResources, tracker: ResourceTracker): PartContext {
  const { size, low, high, seed, repeat } = SURFACE_MAPS.grain;
  const grain = tracker.track(noiseTexture(size, low, high, seed));
  grain.repeat.set(...repeat);
  const looks = createBoatLooks({
    side: tracker.track(hullSideTexture()),
    deck: tracker.track(deckTexture()),
    cells: tracker.track(cellTexture()),
    grain,
  });
  return { ...resources, tracker, looks };
}

export class NavalDroneAssembly implements Assembly {
  readonly root = new Group();
  private readonly tracker = new ResourceTracker();
  private readonly materials: MaterialLibrary;
  private readonly boat: BoatPart;
  private readonly sea: SeaPart;
  private readonly section: WaterSectionPart;
  private readonly wake: WakePart;
  private readonly hullWater: HullWaterPart;
  private readonly jetStream: JetStreamPart;
  private readonly flow: FlowPart;
  private readonly wetted: WettedBarPart;
  private readonly missiles: MissileFit;
  private readonly companions: Companion[];
  private readonly ghost: GhostPart;
  private readonly links: LinksPart;
  private readonly ship: ShipPart;
  private readonly shipRoll = new Group();
  private readonly satellite: SatellitePart;
  private readonly backupSatellite: SatellitePart;
  private readonly stationAnchor: Object3D;
  private readonly labels = new Map<PartId, Object3D>();
  private readonly named: Readonly<Record<AnchorId, Object3D>>;
  private readonly regions: Readonly<Record<RegionId, Box3>>;
  private readonly frame = new Matrix4();
  private readonly boatMotion = new SmoothMotion();
  private readonly spacing = trailSpacing(WAKE.samples, WAKE.length, WAKE.power);
  private seaState: AssemblyState['sea']['state'];
  private state: AssemblyState;

  constructor(resources: AssemblyResources, state: AssemblyState) {
    this.materials = resources.materials;
    this.state = state;
    this.seaState = state.sea.state;
    resetWater(state.sea.waveHeight);
    const context = createContext(resources, this.tracker);
    const foam = this.tracker.track(foamTexture());
    this.boat = new BoatPart(context);
    this.sea = new SeaPart(context, foam);
    this.section = new WaterSectionPart(context, { ...this.sea.hullMask, ...this.sea.section });
    this.wake = new WakePart(context, 'wake', foam);
    this.hullWater = new HullWaterPart(context, foam, { bow: 'bowWave', spray: 'spray' });
    this.jetStream = new JetStreamPart(context, foam, this.boat.jet.steering);
    this.flow = new FlowPart(context, this.boat.jet.flowPath);
    this.wetted = new WettedBarPart(context);
    this.missiles = buildMissileFit(context);
    this.boat.body.add(
      this.hullWater.object,
      this.jetStream.reverse,
      this.jetStream.rooster.points,
      this.flow.cloud.points,
      this.wetted.object,
      this.missiles.object,
    );
    const shapes = buildCompanionGeometry();
    Object.values(shapes).forEach((geometry) => this.tracker.track(geometry));
    this.companions = Array.from({ length: COMPANION_COUNT }, () => {
      const part = new CompanionPart(context, shapes);
      const water = new HullWaterPart(context, foam, { bow: 'companions', spray: 'companions' });
      const missiles = buildMissileFit(context);
      part.body.add(water.object, missiles.object);
      const wake = new WakePart(context, 'companions', foam);
      return { part, wake, water, missiles, motion: new SmoothMotion() };
    });
    this.ghost = new GhostPart(context, shapes.outline);
    this.links = new LinksPart(context);
    this.ship = createShip(context);
    this.shipRoll.add(this.ship.object);
    const shipHolder = new Group();
    shipHolder.position.set(SHIP_CENTRE[0], 0, SHIP_CENTRE[2]);
    shipHolder.rotation.y = -SHIP_HEADING;
    shipHolder.add(this.shipRoll);
    this.satellite = createStarlinkSatellite(context);
    this.backupSatellite = createBackupSatellite(context);
    const sunYaw = Math.atan2(SUN_DIRECTION[0], SUN_DIRECTION[2]);
    this.satellite.object.rotation.y = sunYaw;
    this.backupSatellite.object.rotation.y = sunYaw;
    const shore = createShore(context);
    this.stationAnchor = shore.stationAnchor;
    const { sky } = LIGHT_RIG;
    this.root.add(
      new HemisphereLight(sky.color, sky.ground, sky.intensity),
      createSky(context, foam),
      this.sea.mesh,
      this.section.object,
      shore.object,
      shipHolder,
      this.satellite.object,
      this.backupSatellite.object,
      this.wake.mesh,
      this.boat.object,
      ...this.companions.flatMap((companion) => [companion.part.object, companion.wake.mesh]),
      this.ghost.object,
      this.links.object,
    );
    this.named = {
      boat: this.boat.object,
      dome: anchorAt(this.boat.deck.object, DOME.x, DOME.lens, 0),
      stern: this.boat.jet.stern,
      ship: this.ship.object,
      satellite: this.satellite.anchor,
      backupSatellite: this.backupSatellite.anchor,
      groundStation: this.stationAnchor,
    };
    this.regions = { ...staticRegions(), boat: new Box3() };
    this.collectLabels();
    this.setState(state);
  }

  private collectLabels(): void {
    const body = this.boat.body;
    const at = (x: number, y: number, z: number) => anchorAt(body, x, y, z);
    const [railFrom, railTo] = HULL_DETAIL.sprayRail.x;
    const rail = hullSectionAt(railFrom + (railTo - railFrom) * LABEL_SPOTS.railShare);
    const chine = hullSectionAt(LABEL_SPOTS.chinesX);
    const middle = HULL_STATIONS[3];
    const spots: [PartId, Object3D][] = [
      ['hull', at(middle.x, middle.deck, 0)],
      ['chines', at(chine.x, chine.chine[1], -(chine.flat[0] + LABEL_SPOTS.outboard))],
      [
        'sprayRails',
        at(rail.x, rail.knuckle[1], -(rail.knuckle[0] + rail.rail + LABEL_SPOTS.outboard)),
      ],
      ['starlinkPanels', at((STARLINK_PANEL_XS[0] + STARLINK_PANEL_XS[1]) / 2, PANEL.top, 0)],
      ['backupPanel', at(BACKUP_PANEL_X, PANEL.top, 0)],
      ['cameraDome', anchorAt(this.boat.deck.dome, 0, DOME.top - DOME.base, 0)],
      ['bowCamera', at((BOW_CAMERA.x[0] + BOW_CAMERA.x[1]) / 2, BOW_CAMERA.window.y, 0)],
      ...this.boat.internals.labels,
      ...this.boat.jet.labels,
      ['missileRails', this.missiles.anchor],
      ['jetStream', this.jetStream.anchor],
      ['bowWave', this.hullWater.bowAnchor],
      ['spray', this.hullWater.sprayAnchor],
      ['wake', this.wake.anchor],
      ['wettedLength', this.wetted.anchor],
      ['videoGhost', this.ghost.anchor],
      ['satLink', this.links.satAnchor],
      ['backupLink', this.links.backupAnchor],
      ['satellite', this.satellite.anchor],
      ['backupSatellite', this.backupSatellite.anchor],
      ['groundStation', this.stationAnchor],
      ['ship', this.ship.deckAnchor],
      ['shipRadar', this.ship.radarAnchor],
      ['companions', anchorAt(this.companions[0].part.body, middle.x, middle.deck, 0)],
    ];
    spots.forEach(([id, anchor]) => this.labels.set(id, anchor));
  }

  setState(state: AssemblyState): void {
    this.state = state;
    this.applySea(state);
    this.boat.setState(state);
    this.settleBoats(state.playing || state.boat.held ? 0 : 1);
    this.missiles.object.visible = state.fit === 'missile';
    sectionFrame(state.boat.position, state.boat.heading, this.frame);
    placeSection(this.sea.section, this.frame, state.waterSection);
    this.section.place(this.frame, state.waterSection);
    this.wake.setTrail(this.boatTrail(state), this.wakeParams(state));
    this.hullWater.setState(state, this.boat.body);
    this.jetStream.setState(state, this.boat.body);
    this.flow.setState(state);
    this.wetted.setState(state, this.boat.body);
    this.placeCompanions(state);
    this.placeSky(state);
    this.ghost.setState(state, this.boat.object);
    this.links.setState(state, {
      body: this.boat.body,
      satellite: this.satellite.anchor,
      backupSatellite: this.backupSatellite.anchor,
      station: this.stationAnchor,
      starlinkGlow: this.boat.deck.starlinkGlow,
      backupGlow: this.boat.deck.backupGlow,
    });
    this.rollShip();
    boatRegion(this.boat.object, this.regions.boat);
  }

  private applySea(state: AssemblyState): void {
    this.sea.setWaveScale(state.sea.waveHeight, SEA_FOAM[state.sea.state]);
    if (state.sea.state === this.seaState) return;
    this.seaState = state.sea.state;
    WATER.uWaves.value = waveVectors(state.sea.waveHeight);
  }

  private settleBoats(blend: number): void {
    const { boat, planing, companions } = this.state;
    const response = responseFor(planing.liftShare);
    const scale = boat.held ? MOTION.held : 1;
    const target = waveMotion(boat.position, boat.heading, response);
    applyMotion(this.boat.body, this.boatMotion.follow(target, blend, scale));
    this.sea.followBoat(this.boat.body);
    companions.forEach((reading, index) => {
      const companion = this.companions[index];
      if (!companion) return;
      const wave = waveMotion(reading.position, reading.heading, response);
      applyMotion(companion.part.body, companion.motion.follow(wave, blend, scale));
    });
  }

  private wakeParams(state: AssemblyState): WakeParams {
    return {
      knots: state.boat.knots,
      plane: state.planing.liftShare,
      bowAhead: BOAT.waterlineLength,
      emphasis: state.view.flow,
    };
  }

  private boatTrail(state: AssemblyState): TrailSample[] {
    const { boat } = state;
    return boat.held
      ? straightTrail(boat, WAKE.start, this.spacing)
      : routeTrail(poseAtDistance, boat.distance, WAKE.start, this.spacing);
  }

  private companionTrail(index: number, phase: number): TrailSample[] | null {
    const history = Array.from({ length: HISTORY_STEPS }, (_, step) => phase - step * HISTORY_STEP)
      .filter((time) => time >= FORMATION.joinStart)
      .map((time) => companionsAt(time)[index]);
    if (history.length < 2) return null;
    return pathTrail(history, WAKE.start, this.spacing);
  }

  private placeCompanions(state: AssemblyState): void {
    const { planing, fit } = state;
    this.companions.forEach((companion, index) => {
      const reading = state.companions[index];
      companion.part.object.visible = reading !== undefined;
      companion.wake.mesh.visible = false;
      if (!reading) return;
      companion.part.object.position.set(reading.position[0], planing.heave, reading.position[2]);
      companion.part.object.rotation.set(0, -reading.heading, planing.trim, 'YZX');
      companion.missiles.object.visible = fit === 'missile';
      companion.water.setState(state, companion.part.body);
      const trail = this.companionTrail(index, state.phase);
      if (trail) companion.wake.setTrail(trail, this.wakeParams(state));
    });
  }

  private placeSky(state: AssemblyState): void {
    const { position } = state.boat;
    this.satellite.object.position.set(...skyPoint(position, SATELLITE_OFFSET));
    this.backupSatellite.object.position.set(...skyPoint(position, BACKUP_SATELLITE_OFFSET));
    this.satellite.object.updateMatrixWorld(true);
    this.backupSatellite.object.updateMatrixWorld(true);
  }

  private rollShip(): void {
    applyMotion(
      this.shipRoll,
      waveMotion(SHIP_CENTRE, SHIP_HEADING, MOTION.shipResponse, SHIP_SPAN),
    );
  }

  update(deltaSeconds: number, _cameraDistance: number): boolean {
    const { playing, boat } = this.state;
    if (!playing && !boat.held) return false;
    WATER.uSeaTime.value += deltaSeconds;
    if (boat.held) {
      const travel = knotsToMs(boat.knots) * deltaSeconds;
      WATER.uSeaDrift.value.x += Math.cos(boat.heading) * travel;
      WATER.uSeaDrift.value.y += Math.sin(boat.heading) * travel;
    }
    this.settleBoats(motionBlend(deltaSeconds));
    this.boat.advance(deltaSeconds, this.state);
    this.hullWater.advance(deltaSeconds);
    this.hullWater.setState(this.state, this.boat.body);
    this.jetStream.advance(deltaSeconds, this.state);
    this.flow.advance(deltaSeconds);
    this.wetted.setState(this.state, this.boat.body);
    this.companions.forEach((companion) => {
      if (!companion.part.object.visible) return;
      companion.water.advance(deltaSeconds);
      companion.water.setState(this.state, companion.part.body);
    });
    this.links.advance(deltaSeconds);
    this.ship.radar.rotation.y += ANIMATION.radarRate * deltaSeconds;
    this.rollShip();
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
    const { boat, planing } = this.state;
    const [x, y, z] = boat.position;
    return {
      position: [x, y + planing.heave, z],
      heading: boat.heading,
      length: BOAT.length,
      ship: SHIP_CENTRE,
    };
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

export function createNavalDroneAssembly(
  resources: AssemblyResources,
  state: AssemblyState,
): Assembly {
  return new NavalDroneAssembly(resources, state);
}
