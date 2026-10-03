import { Box3, Group, Mesh, PlaneGeometry } from 'three';
import type { Object3D } from 'three';
import { box } from '@core/scene/geometry/box';
import type { BoxBounds } from '@core/scene/geometry/box';
import { STRUCTURE_GROUP, UNDIMMED_GROUP } from '@core/scene/materials';
import { anchorAt } from '@core/scene/parts';
import { regionFromSpec } from '@core/scene/regions';
import type { AnchorId, AssemblyState, PartId, Point, RegionId } from '../ids';
import { PART_IDS } from '../ids';
import {
  BACKUP_PANEL_X,
  BACKUP_SATELLITE_OFFSET,
  BOAT,
  BOW_CAMERA,
  DOME,
  ELECTRONICS,
  ENGINE,
  FAIRING,
  FUEL_TANKS,
  GROUND_STATION,
  HULL_DETAIL,
  HULL_STATIONS,
  IMPELLER,
  JET,
  MISSILE_FIT,
  PANEL,
  PAYLOAD_BAY,
  SATELLITE_OFFSET,
  SCENE_BOUNDS,
  SHIP,
  SHORE_BOUNDS,
  SLIPWAY,
  STARLINK_PANEL_XS,
  TRANSOM_X,
  chineHeight,
  skyPoint,
  stemXAt,
} from '../model/layout';
import type { Extent } from '../model/layout';
import { SHIP_BOUNDS, SHIP_CENTRE, SHIP_HEADING } from '../model/run';
import { THEME } from '../theme';
import type { Assembly, AssemblyResources, ChaseTarget } from './assembly';
import { applyBoatPose } from './pose';

const SEA_SIZE = 12000;
const SATELLITE_SIZE = 30;
const STATION_SIZE = 8;
const MARKER_SIZE = 0.2;
const EFFECT_REACH = { jet: 1, spray: 0.8, wake: 4, wetted: 1 } as const;
const MIDSHIP = HULL_STATIONS[3];
const BOW_SECTION = HULL_STATIONS[4];
const RAIL_SECTION = HULL_STATIONS[5];

type Children = readonly Object3D[];

function middle([from, to]: Extent): number {
  return (from + to) / 2;
}

function centredBox(x: Extent, y: Extent, halfWidth: number): BoxBounds {
  return { minX: x[0], maxX: x[1], minY: y[0], maxY: y[1], minZ: -halfWidth, maxZ: halfWidth };
}

function cube(at: Point, size: number): BoxBounds {
  const half = size / 2;
  return {
    minX: at[0] - half,
    maxX: at[0] + half,
    minY: at[1] - half,
    maxY: at[1] + half,
    minZ: at[2] - half,
    maxZ: at[2] + half,
  };
}

const ORIGIN: Point = [0, 0, 0];
const BOW_CAMERA_AT: Point = [middle(BOW_CAMERA.x), BOW_CAMERA.window.y, 0];
const WATERJET_AT: Point = [middle(JET.housing.x), JET.axisY, 0];

const BOAT_ANCHORS: Readonly<Partial<Record<PartId, Point>>> = {
  hull: [0, MIDSHIP.deck, 0],
  chines: [BOW_SECTION.x, chineHeight(BOW_SECTION), -BOW_SECTION.chineHalfBreadth],
  sprayRails: [middle(HULL_DETAIL.sprayRail.x), RAIL_SECTION.knuckle[1], -RAIL_SECTION.knuckle[0]],
  payloadBay: [middle(PAYLOAD_BAY.box.x), middle(PAYLOAD_BAY.box.y), 0],
  fuelTanks: [middle(FUEL_TANKS.x), middle(FUEL_TANKS.y), -FUEL_TANKS.centreZ],
  engine: [middle(ENGINE.x), middle(ENGINE.y), 0],
  electronicsBay: [middle(ELECTRONICS.x), middle(ELECTRONICS.y), 0],
  starlinkPanels: [middle(STARLINK_PANEL_XS), PANEL.top, 0],
  backupPanel: [BACKUP_PANEL_X, PANEL.top, 0],
  cameraDome: [DOME.x, DOME.top, 0],
  bowCamera: BOW_CAMERA_AT,
  intake: [middle(JET.intake.x), JET.intake.y, 0],
  duct: [(JET.intake.x[0] + JET.duct.endX) / 2, (JET.intake.y + JET.axisY) / 2, 0],
  driveShaft: [middle(JET.shaft.x), JET.axisY, 0],
  impeller: [IMPELLER.x, JET.axisY, 0],
  waterjet: WATERJET_AT,
  stator: [middle(JET.stator.x), JET.axisY, 0],
  nozzle: [middle(JET.nozzle.x), JET.axisY, 0],
  steeringNozzle: [middle(JET.steeringNozzle.x), JET.axisY, 0],
  reverseBucket: [JET.bucket.pivot[0], JET.bucket.pivot[1], 0],
  jetStream: [JET.steeringNozzle.x[0] - EFFECT_REACH.jet, JET.axisY, 0],
  bowWave: [stemXAt(0), 0, 0],
  spray: [0, 0, -BOAT.beam / 2 - EFFECT_REACH.spray],
  wake: [TRANSOM_X - EFFECT_REACH.wake, 0, 0],
};

class PlaceholderAssembly implements Assembly {
  readonly root = new Group();
  private readonly resources: AssemblyResources;
  private readonly boat = new Group();
  private readonly rails = new Group();
  private readonly wettedBar = new Group();
  private readonly ship = new Group();
  private readonly ghost = new Group();
  private readonly satLink = new Group();
  private readonly backupLink = new Group();
  private readonly satellite: Mesh;
  private readonly backupSatellite: Mesh;
  private readonly groundStation: Mesh;
  private readonly companions: readonly Mesh[];
  private readonly anchors = new Map<PartId, Object3D>();
  private readonly named: Readonly<Record<AnchorId, Object3D>>;
  private readonly regions: Readonly<Record<RegionId, Box3>>;
  private state: AssemblyState;

  constructor(resources: AssemblyResources, state: AssemblyState) {
    this.resources = resources;
    this.state = state;
    this.satellite = this.mesh('satellite', THEME.panel, cube(ORIGIN, SATELLITE_SIZE));
    this.backupSatellite = this.mesh(
      'backupSatellite',
      THEME.backupLink,
      cube(ORIGIN, SATELLITE_SIZE),
    );
    this.groundStation = this.mesh('groundStation', THEME.radome, cube(ORIGIN, STATION_SIZE));
    this.groundStation.position.set(...GROUND_STATION);
    this.companions = [this.boatBody('companions'), this.boatBody('companions')];
    this.buildWorld();
    this.buildBoat();
    this.buildEffects();
    this.named = {
      boat: this.boat,
      dome: anchorAt(this.boat, DOME.x, DOME.lens, 0),
      stern: anchorAt(this.boat, JET.steeringNozzle.x[0], JET.axisY, 0),
      ship: this.ship,
      satellite: this.satellite,
      backupSatellite: this.backupSatellite,
      groundStation: this.groundStation,
    };
    this.regions = {
      scene: regionFromSpec(SCENE_BOUNDS),
      boat: new Box3(),
      ship: regionFromSpec(SHIP_BOUNDS),
      shore: regionFromSpec(SHORE_BOUNDS),
    };
    this.attachAnchors();
    this.setState(state);
  }

  private mesh(group: string, color: string, bounds: BoxBounds): Mesh {
    return new Mesh(box(bounds), this.resources.materials.get(group, { color }));
  }

  private boatBody(group: string): Mesh {
    return this.mesh(
      group,
      THEME.hull,
      centredBox([TRANSOM_X, BOAT.halfLength], [-BOAT.staticDraft, MIDSHIP.deck], BOAT.beam / 2),
    );
  }

  private add(parent: Object3D, children: Children): void {
    children.forEach((child) => parent.add(child));
  }

  private buildWorld(): void {
    const sea = new Mesh(
      new PlaneGeometry(SEA_SIZE, SEA_SIZE),
      this.resources.materials.get(UNDIMMED_GROUP, { color: THEME.seaDeep }),
    );
    sea.rotation.x = -Math.PI / 2;
    const slipway = this.mesh(
      STRUCTURE_GROUP,
      THEME.concrete,
      centredBox(SLIPWAY.x, [SLIPWAY.foot, SLIPWAY.top], SLIPWAY.z[1]),
    );
    this.ship.position.set(SHIP_CENTRE[0], 0, SHIP_CENTRE[2]);
    this.ship.rotation.y = -SHIP_HEADING;
    this.add(this.ship, [
      this.mesh(
        'ship',
        THEME.ship,
        centredBox(
          [-SHIP.length / 2, SHIP.length / 2],
          [-SHIP.draft, SHIP.bridgeTop],
          SHIP.beam / 2,
        ),
      ),
      this.mesh('shipRadar', THEME.ship, cube([SHIP.mastX, SHIP.radarHeight, 0], 1)),
    ]);
    this.add(this.root, [
      sea,
      slipway,
      this.ship,
      this.satellite,
      this.backupSatellite,
      this.groundStation,
      ...this.companions,
    ]);
  }

  private buildBoat(): void {
    const panel = (x: number): BoxBounds =>
      centredBox(
        [x - PANEL.length / 2, x + PANEL.length / 2],
        [FAIRING.top, PANEL.top],
        PANEL.width / 2,
      );
    this.rails.add(
      this.mesh(
        'missileRails',
        THEME.metal,
        centredBox(
          MISSILE_FIT.x,
          [MISSILE_FIT.railTop - MARKER_SIZE, MISSILE_FIT.railTop],
          MISSILE_FIT.railZ,
        ),
      ),
    );
    this.add(this.boat, [
      this.boatBody('hull'),
      ...STARLINK_PANEL_XS.map((x) => this.mesh('starlinkPanels', THEME.panel, panel(x))),
      this.mesh('backupPanel', THEME.panel, panel(BACKUP_PANEL_X)),
      this.mesh(
        'cameraDome',
        THEME.glass,
        cube([DOME.x, DOME.base + DOME.height, 0], DOME.radius * 2),
      ),
      this.mesh('bowCamera', THEME.glass, cube(BOW_CAMERA_AT, BOW_CAMERA.width)),
      this.mesh('waterjet', THEME.jetBlack, cube(WATERJET_AT, JET.housing.outerDiameter)),
      this.rails,
      this.wettedBar,
    ]);
    this.root.add(this.boat);
  }

  private buildEffects(): void {
    this.ghost.add(this.boatBody('videoGhost'));
    this.add(this.root, [this.ghost, this.satLink, this.backupLink]);
  }

  private attachAnchors(): void {
    for (const id of PART_IDS) {
      const at = BOAT_ANCHORS[id];
      if (at) this.anchors.set(id, anchorAt(this.boat, at[0], at[1], at[2]));
    }
    const wetted: Point = [TRANSOM_X + EFFECT_REACH.wetted, 0, -BOAT.beam / 2];
    this.anchors.set('wettedLength', anchorAt(this.wettedBar, ...wetted));
    this.anchors.set(
      'missileRails',
      anchorAt(this.rails, 0, MISSILE_FIT.railTop, -MISSILE_FIT.railZ),
    );
    this.anchors.set('videoGhost', anchorAt(this.ghost, 0, MIDSHIP.deck, 0));
    this.anchors.set('satLink', anchorAt(this.satLink, ...ORIGIN));
    this.anchors.set('backupLink', anchorAt(this.backupLink, ...ORIGIN));
    this.anchors.set('satellite', anchorAt(this.satellite, ...ORIGIN));
    this.anchors.set('backupSatellite', anchorAt(this.backupSatellite, ...ORIGIN));
    this.anchors.set('groundStation', anchorAt(this.groundStation, ...ORIGIN));
    this.anchors.set('ship', anchorAt(this.ship, 0, SHIP.deck, 0));
    this.anchors.set('shipRadar', anchorAt(this.ship, SHIP.mastX, SHIP.radarHeight, 0));
    this.anchors.set('companions', anchorAt(this.companions[0], 0, MIDSHIP.deck, 0));
  }

  setState(state: AssemblyState): void {
    this.state = state;
    const { boat, planing, link, view } = state;
    applyBoatPose(this.boat, boat, planing);
    this.boat.updateMatrixWorld(true);
    this.regions.boat.setFromObject(this.boat);
    this.rails.visible = state.fit === 'missile';
    this.wettedBar.visible = state.wettedBar;
    this.placeSky(boat.position, view.links ? link.mode : 'lost');
    this.ghost.visible = link.ghost !== null;
    if (link.ghost) applyBoatPose(this.ghost, link.ghost, planing);
    this.companions.forEach((companion, index) => {
      const reading = state.companions[index];
      companion.visible = reading !== undefined;
      if (reading) applyBoatPose(companion, reading, planing);
    });
  }

  private placeSky(position: Point, beam: AssemblyState['link']['mode']): void {
    const main = skyPoint(position, SATELLITE_OFFSET);
    const backup = skyPoint(position, BACKUP_SATELLITE_OFFSET);
    this.satellite.position.set(...main);
    this.backupSatellite.position.set(...backup);
    this.satLink.position.set(
      (position[0] + main[0]) / 2,
      main[1] / 2,
      (position[2] + main[2]) / 2,
    );
    this.backupLink.position.set(
      (position[0] + backup[0]) / 2,
      backup[1] / 2,
      (position[2] + backup[2]) / 2,
    );
    this.satLink.visible = beam === 'satellite';
    this.backupLink.visible = beam === 'backup';
  }

  update(): boolean {
    return this.state.playing || this.state.boat.held;
  }

  labelAnchors(): ReadonlyMap<PartId, Object3D> {
    return this.anchors;
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

  dispose(): void {
    this.root.traverse((object) => {
      if (object instanceof Mesh) object.geometry.dispose();
    });
    this.root.clear();
  }
}

export function createPlaceholderAssembly(
  resources: AssemblyResources,
  state: AssemblyState,
): Assembly {
  return new PlaceholderAssembly(resources, state);
}
