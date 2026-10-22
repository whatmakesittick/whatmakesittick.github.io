import {
  BoxGeometry,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  PlaneGeometry,
  Quaternion,
  Vector3,
} from 'three';
import type { Box3, Material, Object3D } from 'three';
import { clamp } from '@core/math';
import { createMaterial } from '@core/scene/materials';
import type { MaterialFinish, MaterialLibrary } from '@core/scene/materials';
import { anchorAt } from '@core/scene/parts';
import { localRegions } from '@core/scene/regions';
import type { Extent } from '@core/scene/regions';
import { ResourceTracker } from '@core/scene/resources';
import { ANCHOR_IDS } from '../ids';
import type {
  AnchorId,
  AssemblyState,
  ChaseTarget,
  PartId,
  Point,
  RegionId,
  ViewOptions,
  WaveReading,
} from '../ids';
import {
  ANCHOR_POINTS,
  BEAM_M,
  CUT_X,
  GHOST_TRACK_Z,
  GIRDER,
  GUIDANCE_RAIL,
  GUIDEWAY_TOP,
  INSET,
  INSET_CENTRE,
  LINE_UP,
  LINE_UP_SPACING,
  MAGNETS,
  PIER,
  REGION_SPECS,
  SECTION_EXTENTS,
  SIDE_SIGNS,
  SKIDS,
  STATIONS,
  STATION_IDS,
  STATOR,
  STATOR_BOTTOM,
  TRAIN,
  VIEW_AHEAD_M,
  VIEW_BEHIND_M,
  mm,
} from '../model';
import type { StationId } from '../model';
import { THEME } from '../theme';
import type { Assembly, AssemblyResources } from './assembly';
import { applyTrainPose, chaseTargetFor, lineX, wrapOffset } from './pose';

const LINE_GROUP = 'line';
type EmphasisGroup = PartId | typeof LINE_GROUP;
type LabelEntry = readonly [PartId, Object3D];
type Side = (typeof SIDE_SIGNS)[number];

interface BoxSpec {
  centre: Point;
  size: Point;
}

interface Paint {
  group: EmphasisGroup;
  finish: MaterialFinish;
}

interface Built {
  object: Group;
  labels: readonly LabelEntry[];
}

const NUDGE_SETTLE_SECONDS = 1.5;
const ROUGHNESS = 0.85;
const GHOST_OPACITY = 0.35;
const GROUND_WIDTH_M = 800;
const BEAM_JOINT_M = 0.05;
const SECTION_JOINT_M = 0.3;
const ARM_SKIRT_M = 0.2;
const MODULE_ENVELOPE_SCALE = 1.1;
const SKID_SHARES = [0.25, 0.75] as const;
const PLATFORM = { width: 4, thickness: 1, clearance: 0.3 } as const;
const INSET_PANEL_DEPTH_M = 0.05;
const TRAIN_ANCHOR_IDS: readonly AnchorId[] = ['nose', 'tail', 'arm', 'cut'];
const TRAIN_REGION_IDS: readonly RegionId[] = ['train', 'front', 'rear'];
const WINDOW: Extent = [-VIEW_BEHIND_M, VIEW_AHEAD_M];
const FLAT = new Quaternion();
const GROUND_TILT = -Math.PI / 2;

function paint(group: EmphasisGroup, color: string, extra: MaterialFinish = {}): Paint {
  return { group, finish: { color, roughness: ROUGHNESS, ...extra } };
}

const PAINTS = {
  ground: paint(LINE_GROUP, THEME.ground),
  concrete: paint(LINE_GROUP, THEME.concrete),
  stator: paint('statorPacks', THEME.stator),
  body: paint('train', THEME.trainBody),
  arm: paint('wrapArms', THEME.trainBand),
  supportMagnet: paint('supportMagnets', THEME.magnet),
  guidanceMagnet: paint('guidanceMagnets', THEME.magnet),
  eddyBrake: paint('eddyBrakes', THEME.eddy),
  skid: paint('skids', THEME.skid),
  station: paint('stations', THEME.concrete),
  powered: paint('poweredSection', THEME.powered, { emissive: THEME.powered }),
  inset: paint('gapInset', THEME.inset),
  scmaglev: paint('scmaglev', THEME.trainBody),
  wheelRail: paint('wheelRail', THEME.rest),
  ghost: paint('ghostTrain', THEME.ghost, {
    transparent: true,
    opacity: GHOST_OPACITY,
    depthWrite: false,
  }),
} as const satisfies Record<string, Paint>;
type PaintId = keyof typeof PAINTS;

function middle([from, to]: Extent): number {
  return (from + to) / 2;
}

function around(centre: number, size: number): Extent {
  return [centre - size / 2, centre + size / 2];
}

function shrink([from, to]: Extent, margin: number): Extent {
  return [from + margin, to - margin];
}

function along([from, to]: Extent, share: number): number {
  return from + (to - from) * share;
}

function boxOver(x: Extent, y: Extent, z: Extent): BoxSpec {
  return {
    centre: [middle(x), middle(y), middle(z)],
    size: [x[1] - x[0], y[1] - y[0], z[1] - z[0]],
  };
}

function inWindow(x: number, halfLength: number): boolean {
  return x + halfLength >= WINDOW[0] && x - halfLength <= WINDOW[1];
}

class BoxKit {
  private readonly library: MaterialLibrary;
  private readonly tracker: ResourceTracker;
  private readonly geometry: BoxGeometry;
  private readonly cache = new Map<PaintId, Material>();

  constructor(library: MaterialLibrary, tracker: ResourceTracker) {
    this.library = library;
    this.tracker = tracker;
    this.geometry = tracker.track(new BoxGeometry());
  }

  box(id: PaintId, { centre, size }: BoxSpec): Mesh {
    const mesh = new Mesh(this.geometry, this.material(id));
    mesh.position.set(...centre);
    mesh.scale.set(...size);
    return mesh;
  }

  boxes(id: PaintId, specs: readonly BoxSpec[]): InstancedMesh {
    const mesh = new InstancedMesh(this.geometry, this.material(id), specs.length);
    const matrix = new Matrix4();
    specs.forEach(({ centre, size }, index) =>
      mesh.setMatrixAt(index, matrix.compose(new Vector3(...centre), FLAT, new Vector3(...size))),
    );
    mesh.computeBoundingSphere();
    return this.tracker.track(mesh);
  }

  plane(id: PaintId, width: number, depth: number): Mesh {
    return new Mesh(this.tracker.track(new PlaneGeometry(width, depth)), this.material(id));
  }

  private material(id: PaintId): Material {
    const cached = this.cache.get(id);
    if (cached) return cached;
    const { group, finish } = PAINTS[id];
    const material = this.tracker.track(createMaterial(finish));
    this.library.register(group, material);
    this.cache.set(id, material);
    return material;
  }
}

const TRAIN_SPAN: Extent = [TRAIN.tailX, TRAIN.noseX];
const LINE_UP_SLICE: Extent = [CUT_X - LINE_UP.sliceLength, CUT_X];
const WEB_WIDTH = GIRDER.topWidth - 2 * GIRDER.cantileverDepth;
const LEAD_X = middle(SECTION_EXTENTS[0]);
const SECOND_X = middle(SECTION_EXTENTS[1]);
const LINE_LABEL_X = TRAIN.noseX + BEAM_M;
const PIER_LABEL_X = Math.ceil(LINE_LABEL_X / BEAM_M) * BEAM_M;
const STATOR_SPAN: Extent = [STATOR_BOTTOM, STATOR.top];
const GUIDANCE_OUTER_Z = MAGNETS.guidance.faceZ + MAGNETS.guidance.depth;
const SCMAGLEV_BOTTOM = LINE_UP.plinthTop + mm(LINE_UP.scmaglev.gapMm);
const SCMAGLEV_TOP = SCMAGLEV_BOTTOM + LINE_UP.scmaglev.height;
const WHEEL_RAIL_TOP = LINE_UP.plinthTop + TRAIN.height;
const PLATFORM_Z = TRAIN.width / 2 + PLATFORM.clearance + PLATFORM.width / 2;

const TRAIN_LABELS = {
  train: [LEAD_X, TRAIN.roof, 0],
  wrapArms: [LEAD_X, TRAIN.armBottom, -TRAIN.width / 2],
  supportMagnets: [LEAD_X, MAGNETS.support.top - MAGNETS.support.height, -MAGNETS.support.sideZ],
  guidanceMagnets: [LEAD_X, MAGNETS.guidance.centreY, GUIDANCE_OUTER_Z],
  eddyBrakes: [SECOND_X, MAGNETS.guidance.centreY, GUIDANCE_OUTER_Z],
  skids: [
    along(SECTION_EXTENTS[1], SKID_SHARES[0]),
    TRAIN.bodyBottom - SKIDS.height,
    -SKIDS.stripZ,
  ],
} as const satisfies Partial<Record<PartId, Point>>;

const GUIDEWAY_LABELS = {
  guideway: [LINE_LABEL_X, middle([GIRDER.bottom, GUIDEWAY_TOP]), WEB_WIDTH / 2],
  statorPacks: [LINE_LABEL_X, STATOR_BOTTOM, -STATOR.sideZ],
  guidanceRails: [LINE_LABEL_X, GUIDANCE_RAIL.centreY, GUIDANCE_RAIL.faceZ],
  feederCable: [LINE_LABEL_X, STATOR_BOTTOM, -WEB_WIDTH / 2],
  powerFlow: [LINE_LABEL_X + BEAM_M, STATOR_BOTTOM, WEB_WIDTH / 2],
} as const satisfies Partial<Record<PartId, Point>>;

const LINE_UP_LABELS = {
  scmaglev: [CUT_X, SCMAGLEV_TOP, -LINE_UP_SPACING],
  wheelRail: [CUT_X, WHEEL_RAIL_TOP, LINE_UP_SPACING],
  gapCallouts: [CUT_X, LINE_UP.plinthTop, -LINE_UP_SPACING],
} as const satisfies Partial<Record<PartId, Point>>;

function labelsAt<K extends PartId>(
  parent: Object3D,
  points: Readonly<Record<K, Point>>,
): LabelEntry[] {
  const ids = Object.keys(points) as K[];
  return ids.map((id) => {
    const point: Point = points[id];
    return [id, anchorAt(parent, ...point)];
  });
}

function beamSlots(): number[] {
  const first = Math.floor(WINDOW[0] / BEAM_M);
  const last = Math.ceil(WINDOW[1] / BEAM_M) + 1;
  return Array.from({ length: last - first + 1 }, (_, index) => (first + index) * BEAM_M);
}

function beamSpan(x: number): Extent {
  return shrink([x, x + BEAM_M], BEAM_JOINT_M / 2);
}

function pierBox(x: number): BoxSpec {
  return boxOver(around(x, PIER.depth), [0, PIER.height], around(0, PIER.width));
}

function webBox(x: number): BoxSpec {
  return boxOver(beamSpan(x), [GIRDER.bottom, STATOR.top], around(0, WEB_WIDTH));
}

function deckBox(x: number): BoxSpec {
  return boxOver(beamSpan(x), [STATOR.top, GUIDEWAY_TOP], around(0, GIRDER.topWidth));
}

function statorBoxes(x: number): BoxSpec[] {
  return SIDE_SIGNS.map((side) =>
    boxOver(beamSpan(x), STATOR_SPAN, around(side * STATOR.sideZ, STATOR.width)),
  );
}

function buildBeams(kit: BoxKit): Built {
  const object = new Group();
  const slots = beamSlots();
  object.add(
    kit.boxes('concrete', slots.map(pierBox)),
    kit.boxes('concrete', slots.map(webBox)),
    kit.boxes('concrete', slots.map(deckBox)),
    kit.boxes('stator', slots.flatMap(statorBoxes)),
  );
  const pierLabel = anchorAt(object, PIER_LABEL_X, PIER.height / 2, PIER.width / 2);
  return { object, labels: [['piers', pierLabel]] };
}

function sectionBox(extent: Extent): BoxSpec {
  const body: Extent = [TRAIN.bodyBottom, TRAIN.roof];
  return boxOver(shrink(extent, SECTION_JOINT_M / 2), body, around(0, TRAIN.width));
}

function armBox(side: Side): BoxSpec {
  const z = side * (TRAIN.width / 2 - ARM_SKIRT_M / 2);
  return boxOver(TRAIN_SPAN, [TRAIN.armBottom, TRAIN.bodyBottom], around(z, ARM_SKIRT_M));
}

function supportMagnetBox(side: Side): BoxSpec {
  const { top, height, sideZ, width } = MAGNETS.support;
  return boxOver(TRAIN_SPAN, [top - height, top], around(side * sideZ, width));
}

function guidanceZ(side: Side): number {
  return side * (MAGNETS.guidance.faceZ + MAGNETS.guidance.depth / 2);
}

function guidanceMagnetBox(side: Side): BoxSpec {
  const { centreY, height, depth } = MAGNETS.guidance;
  return boxOver(TRAIN_SPAN, around(centreY, height), around(guidanceZ(side), depth));
}

function eddyBrakeBoxes(extent: Extent): BoxSpec[] {
  const { centreY, height, depth } = MAGNETS.guidance;
  const x = around(middle(extent), MAGNETS.moduleLength);
  const y = around(centreY, height * MODULE_ENVELOPE_SCALE);
  return SIDE_SIGNS.map((side) =>
    boxOver(x, y, around(guidanceZ(side), depth * MODULE_ENVELOPE_SCALE)),
  );
}

function skidBoxes(extent: Extent): BoxSpec[] {
  const y: Extent = [TRAIN.bodyBottom - SKIDS.height, TRAIN.bodyBottom];
  return SKID_SHARES.flatMap((share) =>
    SIDE_SIGNS.map((side) =>
      boxOver(
        around(along(extent, share), SKIDS.length),
        y,
        around(side * SKIDS.stripZ, SKIDS.width),
      ),
    ),
  );
}

function buildTrain(kit: BoxKit): Built {
  const object = new Group();
  object.add(
    kit.boxes('body', SECTION_EXTENTS.map(sectionBox)),
    kit.boxes('arm', SIDE_SIGNS.map(armBox)),
    kit.boxes('supportMagnet', SIDE_SIGNS.map(supportMagnetBox)),
    kit.boxes('guidanceMagnet', SIDE_SIGNS.map(guidanceMagnetBox)),
    kit.boxes('eddyBrake', SECTION_EXTENTS.flatMap(eddyBrakeBoxes)),
    kit.boxes('skid', SECTION_EXTENTS.flatMap(skidBoxes)),
  );
  return { object, labels: labelsAt(object, TRAIN_LABELS) };
}

function buildGround(kit: BoxKit): Mesh {
  const ground = kit.plane('ground', WINDOW[1] - WINDOW[0], GROUND_WIDTH_M);
  ground.rotation.x = GROUND_TILT;
  ground.position.x = middle(WINDOW);
  return ground;
}

function buildInset(kit: BoxKit): Built {
  const object = new Group();
  const [x, y, z] = INSET_CENTRE;
  const panel = boxOver(
    around(x, INSET.width),
    around(y, INSET.height),
    around(z, INSET_PANEL_DEPTH_M),
  );
  object.add(kit.box('inset', panel));
  return { object, labels: [['gapInset', anchorAt(object, x, y + INSET.height / 2, z)]] };
}

function buildLineUp(kit: BoxKit): Built {
  const object = new Group();
  const { width } = LINE_UP.scmaglev;
  object.add(
    kit.box(
      'scmaglev',
      boxOver(LINE_UP_SLICE, [SCMAGLEV_BOTTOM, SCMAGLEV_TOP], around(-LINE_UP_SPACING, width)),
    ),
    kit.box(
      'wheelRail',
      boxOver(
        LINE_UP_SLICE,
        [LINE_UP.plinthTop, WHEEL_RAIL_TOP],
        around(LINE_UP_SPACING, TRAIN.width),
      ),
    ),
  );
  return { object, labels: labelsAt(object, LINE_UP_LABELS) };
}

function buildGhost(kit: BoxKit): Built {
  const object = new Group();
  const track = around(-GHOST_TRACK_Z, TRAIN.width);
  object.add(kit.box('ghost', boxOver(around(0, TRAIN.length), [0, TRAIN.height], track)));
  return {
    object,
    labels: [['ghostTrain', anchorAt(object, 0, TRAIN.height, -GHOST_TRACK_Z)]],
  };
}

function namedAnchors(train: Object3D, frame: Object3D): Record<AnchorId, Object3D> {
  const entries = ANCHOR_IDS.map((id) => {
    const parent = TRAIN_ANCHOR_IDS.includes(id) ? train : frame;
    return [id, anchorAt(parent, ...ANCHOR_POINTS[id])] as const;
  });
  return Object.fromEntries(entries) as Record<AnchorId, Object3D>;
}

export function stationName(id: StationId): string {
  return `station-${id}`;
}

class StationsPart {
  readonly object = new Group();
  readonly label: Object3D;
  private readonly platforms: ReadonlyMap<StationId, Group>;

  constructor(kit: BoxKit) {
    this.platforms = new Map(STATION_IDS.map((id) => [id, this.buildStation(kit, id)]));
    this.label = anchorAt(this.object, 0, STATIONS.platformFloor, -PLATFORM_Z);
  }

  place(distance: number): void {
    const halfLength = STATIONS.platformLength / 2;
    this.platforms.forEach((station, id) => {
      station.position.x = lineX(STATIONS.line[id], distance);
      station.visible = inWindow(station.position.x, halfLength);
    });
    const nearest = this.nearest();
    this.label.position.x = nearest.position.x;
    this.label.visible = nearest.visible;
  }

  private nearest(): Group {
    const stations = [...this.platforms.values()];
    return stations.reduce((best, station) =>
      Math.abs(station.position.x) < Math.abs(best.position.x) ? station : best,
    );
  }

  private buildStation(kit: BoxKit, id: StationId): Group {
    const station = new Group();
    station.name = stationName(id);
    const floor = STATIONS.platformFloor;
    const slabs = SIDE_SIGNS.map((side) =>
      boxOver(
        around(0, STATIONS.platformLength),
        [floor - PLATFORM.thickness, floor],
        around(side * PLATFORM_Z, PLATFORM.width),
      ),
    );
    station.add(kit.boxes('station', slabs));
    this.object.add(station);
    return station;
  }
}

class PoweredPart {
  readonly object = new Group();
  readonly labels: readonly LabelEntry[];
  private readonly strips: readonly Mesh[];
  private readonly sectionLabel: Object3D;
  private readonly waveLabel: Object3D;

  constructor(kit: BoxKit) {
    this.strips = SIDE_SIGNS.map((side) => this.buildStrip(kit, side));
    this.sectionLabel = anchorAt(this.object, 0, STATOR_BOTTOM, -STATOR.sideZ);
    this.waveLabel = anchorAt(this.object, 0, STATOR_BOTTOM, STATOR.sideZ);
    this.labels = [
      ['poweredSection', this.sectionLabel],
      ['travellingWave', this.waveLabel],
    ];
  }

  place(wave: WaveReading, distance: number): void {
    const from = Math.max(lineX(wave.sectionStart, distance), WINDOW[0]);
    const to = Math.min(lineX(wave.sectionEnd, distance), WINDOW[1]);
    const seen = to > from;
    this.strips.forEach((strip) => {
      strip.visible = seen;
      strip.position.x = middle([from, to]);
      strip.scale.x = seen ? to - from : 1;
    });
    this.sectionLabel.position.x = clamp(LINE_LABEL_X, from, Math.max(from, to));
    this.waveLabel.position.x = clamp(LEAD_X, from, Math.max(from, to));
  }

  private buildStrip(kit: BoxKit, side: Side): Mesh {
    const glow = boxOver(
      around(0, 1),
      around(middle(STATOR_SPAN), STATOR.height * MODULE_ENVELOPE_SCALE),
      around(side * STATOR.sideZ, STATOR.width * MODULE_ENVELOPE_SCALE),
    );
    const strip = kit.box('powered', glow);
    this.object.add(strip);
    return strip;
  }
}

export class PlaceholderAssembly implements Assembly {
  readonly root = new Group();
  private readonly tracker = new ResourceTracker();
  private readonly materials: MaterialLibrary;
  private readonly beams: Group;
  private readonly train: Group;
  private readonly inset: Group;
  private readonly lineUp: Group;
  private readonly ghost: Group;
  private readonly stations: StationsPart;
  private readonly powered: PoweredPart;
  private readonly labels: ReadonlyMap<PartId, Object3D>;
  private readonly named: Readonly<Record<AnchorId, Object3D>>;
  private readonly regionOf = localRegions(REGION_SPECS);
  private chase: ChaseTarget;
  private nudgeToken: number;
  private sinceNudge = NUDGE_SETTLE_SECONDS;

  constructor(resources: AssemblyResources, state: AssemblyState) {
    this.materials = resources.materials;
    const kit = new BoxKit(resources.materials, this.tracker);
    const frame = new Group();
    const beams = buildBeams(kit);
    const train = buildTrain(kit);
    const inset = buildInset(kit);
    const lineUp = buildLineUp(kit);
    const ghost = buildGhost(kit);
    this.stations = new StationsPart(kit);
    this.powered = new PoweredPart(kit);
    this.beams = beams.object;
    this.train = train.object;
    this.inset = inset.object;
    this.lineUp = lineUp.object;
    this.ghost = ghost.object;
    this.root.add(
      buildGround(kit),
      frame,
      this.beams,
      this.train,
      this.inset,
      this.lineUp,
      this.ghost,
      this.stations.object,
      this.powered.object,
    );
    this.labels = new Map<PartId, Object3D>([
      ...train.labels,
      ...beams.labels,
      ...labelsAt(frame, GUIDEWAY_LABELS),
      ['stations', this.stations.label],
      ...this.powered.labels,
      ...inset.labels,
      ...lineUp.labels,
      ...ghost.labels,
    ]);
    this.named = namedAnchors(this.train, frame);
    this.chase = chaseTargetFor(state.motion);
    this.nudgeToken = state.nudge.token;
    this.setState(state);
  }

  setState(state: AssemblyState): void {
    const { motion, view } = state;
    this.beams.position.x = wrapOffset(motion.distance, BEAM_M);
    applyTrainPose(this.train, motion);
    this.stations.place(motion.distance);
    this.powered.place(state.wave, motion.distance);
    this.placeGhost(state.ghost.distance, motion.distance, view);
    this.applyView(state, view);
    this.trackNudge(state.nudge.token);
    this.chase = chaseTargetFor(motion);
    this.root.updateMatrixWorld();
  }

  update(deltaSeconds: number): boolean {
    this.sinceNudge += deltaSeconds;
    return this.sinceNudge < NUDGE_SETTLE_SECONDS;
  }

  labelAnchors(): ReadonlyMap<PartId, Object3D> {
    return this.labels;
  }

  anchor(id: AnchorId): Object3D {
    return this.named[id];
  }

  region(id: RegionId): Box3 {
    if (!TRAIN_REGION_IDS.includes(id)) return this.regionOf(id);
    this.train.updateWorldMatrix(true, false);
    return this.regionOf(id, this.train.matrixWorld);
  }

  chaseTarget(): ChaseTarget {
    return this.chase;
  }

  dispose(): void {
    this.root.removeFromParent();
    this.materials.clearRegistered();
    this.tracker.dispose();
  }

  private placeGhost(ghostDistance: number, distance: number, view: ViewOptions): void {
    this.ghost.position.x = lineX(ghostDistance, distance);
    this.ghost.visible = view.ghost && inWindow(this.ghost.position.x, TRAIN.length / 2);
  }

  private applyView({ wave }: AssemblyState, view: ViewOptions): void {
    this.inset.visible = view.gap;
    this.lineUp.visible = view.lineUp;
    this.powered.object.visible = view.wave && wave.on;
  }

  private trackNudge(token: number): void {
    if (token === this.nudgeToken) return;
    this.nudgeToken = token;
    this.sinceNudge = 0;
  }
}

export function createPlaceholderAssembly(
  resources: AssemblyResources,
  state: AssemblyState,
): Assembly {
  return new PlaceholderAssembly(resources, state);
}
