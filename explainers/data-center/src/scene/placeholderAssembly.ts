import {
  BoxGeometry,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  PlaneGeometry,
  Quaternion,
  SphereGeometry,
  Vector3,
} from 'three';
import type { Box3, BufferGeometry, Material, Object3D } from 'three';
import { createMaterial } from '@core/scene/materials';
import type { MaterialFinish, MaterialLibrary } from '@core/scene/materials';
import { anchorAt } from '@core/scene/parts';
import { localRegions } from '@core/scene/regions';
import type { Extent } from '@core/scene/regions';
import { ResourceTracker } from '@core/scene/resources';
import type {
  AnchorId,
  AssemblyState,
  ChaseTarget,
  JouleReading,
  PartId,
  Point,
  RegionId,
  ViewOptions,
} from '../ids';
import {
  AIR_HANDLERS,
  ANCHOR_POINTS,
  BATTERIES,
  BUILDING,
  BUSBAR,
  BUSWAY,
  CDUS,
  CHILLER,
  CUTAWAY_ROOF_X,
  DESK,
  DRY_COOLERS,
  DRY_COOLERS_PER_ROW,
  FIBRE_ENTRY,
  GANTRY,
  GENSETS,
  GRID_LINE,
  HALL_RACKS,
  INSET,
  INSET_CENTRE,
  LAPTOP,
  LEAF_RACKS,
  LOWER_COMPUTE_TRAYS,
  MANIFOLD,
  RACK,
  RACK_STACK,
  REGION_SPECS,
  RISER,
  ROOF_PIPE_Y,
  ROOF_Y,
  ROOM_WALL_X,
  ROW_PIPE,
  ROWS_PER_BLOCK,
  SHELVES_PER_GROUP,
  SPINE_RACKS,
  SUBJECT_CDU,
  SUBJECT_LEAF,
  SUBJECT_RACK,
  SUBJECT_RACK_BOX,
  SUBJECT_ROW_INDEX,
  SUBJECT_SLOT,
  SUBJECT_TRAY_Y,
  SUBSTATION_YARD,
  SWITCH_TRAYS,
  SWITCHGEAR,
  TAP_BOX,
  TRANSFORMERS,
  UPPER_COMPUTE_TRAYS,
  UPS,
  WALL_THICKNESS,
  boxCentre,
  boxSpan,
  boxTop,
  standing,
} from '../model';
import type { BoxSpec, FixedAnchorId } from '../model';
import { THEME } from '../theme';
import type { Assembly, AssemblyResources } from './assembly';

const SITE_GROUP = 'site';
type EmphasisGroup = PartId | typeof SITE_GROUP;
type LabelEntry = readonly [PartId, Object3D];

interface Solid {
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

const ROUGHNESS = 0.8;
const GLOW = 1.2;
const GROUND_SIZE: readonly [width: number, depth: number] = [400, 200];
const GROUND_CENTRE: readonly [x: number, z: number] = [-30, -5];
const GROUND_TILT = -Math.PI / 2;
const CONDUCTOR_M = 0.06;
const BUSWAY_M = 0.25;
const PIPE_M = 0.12;
const PANEL_M = 0.02;
const SLAB_M = 0.3;
const PAD_M = 0.1;
const SLAB_GAP = 0.004;
const SHELF_DEPTH_SHARE = 0.9;
const BUSBAR_M = 0.05;
const FAN_SIZE: Point = [0.08, 0.04, 0.02];
const FIBRE_BOX: Point = [0.4, 0.4, 0.2];
const JOULE_RADIUS = 0.12;
const JOULE_SEGMENTS = 16;
const FLAT = new Quaternion();
const SPHERE_DETAIL = JOULE_SEGMENTS / 2;

function paint(group: EmphasisGroup, color: string, extra: MaterialFinish = {}): Paint {
  return { group, finish: { color, roughness: ROUGHNESS, ...extra } };
}

function glowing(group: EmphasisGroup, color: string): Paint {
  return paint(group, color, { emissive: color, emissiveIntensity: GLOW });
}

const PAINTS = {
  ground: paint(SITE_GROUP, THEME.ground),
  line: paint('gridLine', THEME.steel),
  substation: paint('substation', THEME.concrete),
  transformer: paint('transformers', THEME.metal),
  genset: paint('generators', THEME.metalDark),
  hall: paint('hall', THEME.steel),
  switchgear: paint('switchgear', THEME.metalLight),
  ups: paint('ups', THEME.metalLight),
  battery: paint('batteries', THEME.metal),
  busway: paint('busway', THEME.copper),
  rack: paint('racks', THEME.rack),
  subjectRack: paint('subjectRack', THEME.rack),
  shelf: paint('powerShelves', THEME.metalLight),
  busbar: paint('busbar', THEME.copper),
  computeTray: paint('computeTrays', THEME.metal),
  switchTray: paint('switchTrays', THEME.metalDark),
  trayFan: paint('trayFans', THEME.metalDark),
  manifold: paint('manifold', THEME.coolantReturn),
  cdu: paint('cdu', THEME.steel),
  pipe: paint('facilityPipes', THEME.coolantSupply),
  chiller: paint('chiller', THEME.steel),
  dryCooler: paint('dryCoolers', THEME.metalLight),
  airHandler: paint('airHandlers', THEME.steel),
  fibre: glowing('fibreEntry', THEME.packet),
  spine: paint('spineSwitches', THEME.rack),
  leaf: paint('leafSwitches', THEME.rack),
  inset: paint('chipInset', THEME.inset),
  desk: paint('laptop', THEME.concrete),
  laptop: paint('laptop', THEME.metalLight),
  current: glowing('joule', THEME.current),
  heat: glowing('joule', THEME.heat),
} as const satisfies Record<string, Paint>;
type PaintId = keyof typeof PAINTS;

function middle([from, to]: Extent): number {
  return (from + to) / 2;
}

function width([from, to]: Extent): number {
  return to - from;
}

function solidOver(x: Extent, y: Extent, z: Extent): Solid {
  return { centre: [middle(x), middle(y), middle(z)], size: [width(x), width(y), width(z)] };
}

function solidOf(box: BoxSpec): Solid {
  return { centre: boxCentre(box), size: box.size };
}

function run(from: Point, to: Point, thickness: number): Solid {
  const extent = (axis: number): Extent => [
    Math.min(from[axis], to[axis]) - thickness / 2,
    Math.max(from[axis], to[axis]) + thickness / 2,
  ];
  return solidOver(extent(0), extent(1), extent(2));
}

class BoxKit {
  private readonly library: MaterialLibrary;
  private readonly tracker: ResourceTracker;
  private readonly cube: BoxGeometry;
  private readonly cache = new Map<PaintId, Material>();

  constructor(library: MaterialLibrary, tracker: ResourceTracker) {
    this.library = library;
    this.tracker = tracker;
    this.cube = tracker.track(new BoxGeometry());
  }

  box(id: PaintId, { centre, size }: Solid): Mesh {
    const mesh = new Mesh(this.cube, this.material(id));
    mesh.position.set(...centre);
    mesh.scale.set(...size);
    return mesh;
  }

  boxes(id: PaintId, solids: readonly Solid[]): InstancedMesh {
    const mesh = new InstancedMesh(this.cube, this.material(id), solids.length);
    const matrix = new Matrix4();
    solids.forEach(({ centre, size }, index) =>
      mesh.setMatrixAt(index, matrix.compose(new Vector3(...centre), FLAT, new Vector3(...size))),
    );
    mesh.computeBoundingSphere();
    return this.tracker.track(mesh);
  }

  mesh(id: PaintId, geometry: BufferGeometry): Mesh {
    return new Mesh(this.tracker.track(geometry), this.material(id));
  }

  material(id: PaintId): Material {
    const cached = this.cache.get(id);
    if (cached) return cached;
    const { group, finish } = PAINTS[id];
    const material = this.tracker.track(createMaterial(finish));
    this.library.register(group, material);
    this.cache.set(id, material);
    return material;
  }
}

function part(object: Group, id: PartId, point: Point): Built {
  return { object, labels: [[id, anchorAt(object, ...point)]] };
}

function grouped(...children: Object3D[]): Group {
  const group = new Group();
  if (children.length > 0) group.add(...children);
  return group;
}

function merge(...parts: Built[]): Built {
  return {
    object: grouped(...parts.map(({ object }) => object)),
    labels: parts.flatMap(({ labels }) => labels),
  };
}

function buildGround(kit: BoxKit): Mesh {
  const ground = kit.mesh('ground', new PlaneGeometry(...GROUND_SIZE));
  ground.rotation.x = GROUND_TILT;
  ground.position.set(GROUND_CENTRE[0], 0, GROUND_CENTRE[1]);
  return ground;
}

function conductorZ(index: number): number {
  return GRID_LINE.z + (index - (GRID_LINE.conductors - 1) / 2) * GRID_LINE.conductorGap;
}

function buildGridLine(kit: BoxKit): Built {
  const conductors = Array.from({ length: GRID_LINE.conductors }, (_, index) =>
    run(
      [GRID_LINE.fromX, GRID_LINE.y, conductorZ(index)],
      [GRID_LINE.toX, GRID_LINE.y, conductorZ(index)],
      CONDUCTOR_M,
    ),
  );
  const object = grouped(kit.boxes('line', conductors), kit.box('line', solidOf(GANTRY)));
  return part(object, 'gridLine', [
    middle([GRID_LINE.fromX, GRID_LINE.toX]),
    GRID_LINE.y,
    GRID_LINE.z,
  ]);
}

function buildSubstation(kit: BoxKit): Built {
  const yard = boxSpan(SUBSTATION_YARD);
  const pad = kit.box('substation', solidOver(yard.x, [0, PAD_M], yard.z));
  const transformers = kit.boxes('transformer', TRANSFORMERS.map(solidOf));
  return merge(
    part(grouped(pad), 'substation', [SUBSTATION_YARD.base[0], yard.y[1], yard.z[1]]),
    part(grouped(transformers), 'transformers', boxTop(TRANSFORMERS[1])),
  );
}

function buildGenerators(kit: BoxKit): Built {
  return part(grouped(kit.boxes('genset', GENSETS.map(solidOf))), 'generators', boxTop(GENSETS[0]));
}

class BuildingPart {
  readonly built: Built;
  private readonly cut: readonly Object3D[];

  constructor(kit: BoxKit) {
    const [west, east] = BUILDING.x;
    const [north, south] = BUILDING.z;
    const wallY: Extent = [0, ROOF_Y - SLAB_M];
    const roofY: Extent = [ROOF_Y - SLAB_M, ROOF_Y];
    const southWall = kit.box(
      'hall',
      solidOver([west, east], wallY, [south - WALL_THICKNESS, south]),
    );
    const westRoof = kit.box('hall', solidOver(CUTAWAY_ROOF_X, roofY, [north, south]));
    const walls = kit.boxes('hall', [
      solidOver([west, east], wallY, [north, north + WALL_THICKNESS]),
      solidOver([west, west + WALL_THICKNESS], wallY, [north, south]),
      solidOver([east - WALL_THICKNESS, east], wallY, [north, south]),
      solidOver([ROOM_WALL_X - WALL_THICKNESS / 2, ROOM_WALL_X + WALL_THICKNESS / 2], wallY, [
        north,
        south,
      ]),
      solidOver([CUTAWAY_ROOF_X[1], east], roofY, [north, south]),
    ]);
    this.cut = [southWall, westRoof];
    this.built = part(grouped(walls, southWall, westRoof), 'hall', [
      middle([ROOM_WALL_X, east]),
      ROOF_Y,
      south,
    ]);
  }

  applyCutaway(open: boolean): void {
    this.cut.forEach((object) => (object.visible = !open));
  }
}

function buildElectricalRoom(kit: BoxKit): Built {
  return merge(
    part(grouped(kit.box('switchgear', solidOf(SWITCHGEAR))), 'switchgear', boxTop(SWITCHGEAR)),
    part(grouped(kit.box('ups', solidOf(UPS))), 'ups', boxTop(UPS)),
    part(grouped(kit.box('battery', solidOf(BATTERIES))), 'batteries', boxTop(BATTERIES)),
  );
}

function buildBusway(kit: BoxKit): Built {
  const [, , rackZ] = SUBJECT_RACK;
  const mainStart: Point = [ROOM_WALL_X, BUSWAY.mainY, BUSWAY.mainZ];
  const mainEnd: Point = [BUSWAY.endX, BUSWAY.mainY, BUSWAY.mainZ];
  const feederEnd: Point = [BUSWAY.endX, BUSWAY.rowY, rackZ];
  const rowEnd: Point = [SUBJECT_CDU.base[0], BUSWAY.rowY, rackZ];
  const runs = [
    run(mainStart, mainEnd, BUSWAY_M),
    run(mainEnd, [BUSWAY.endX, BUSWAY.mainY, rackZ], BUSWAY_M),
    run([BUSWAY.endX, BUSWAY.mainY, rackZ], feederEnd, BUSWAY_M),
    run(feederEnd, rowEnd, BUSWAY_M),
    run(TAP_BOX, [TAP_BOX[0], RACK.height, rackZ], CONDUCTOR_M),
  ];
  return part(grouped(kit.boxes('busway', runs)), 'busway', [
    middle([ROOM_WALL_X, BUSWAY.endX]),
    BUSWAY.mainY,
    BUSWAY.mainZ,
  ]);
}

function isSubject(row: number, slot: number): boolean {
  return row === SUBJECT_ROW_INDEX && slot === SUBJECT_SLOT;
}

function buildHallRacks(kit: BoxKit): Built {
  const racks = HALL_RACKS.filter(({ row, slot }) => !isSubject(row, slot)).map(({ base }) =>
    solidOf(standing(base, RACK)),
  );
  const farRow = HALL_RACKS.filter(({ row }) => row === SUBJECT_ROW_INDEX + ROWS_PER_BLOCK);
  const middleRack = farRow[Math.floor(farRow.length / 2)];
  return part(grouped(kit.boxes('rack', racks)), 'racks', [
    middleRack.base[0],
    RACK.height,
    middleRack.base[2],
  ]);
}

const RACK_SPAN = boxSpan(SUBJECT_RACK_BOX);
const RACK_FRONT_Z = RACK_SPAN.z[0];

function slab([from, to]: Extent, depthShare = 1): Solid {
  const depth = RACK.depth * depthShare;
  return solidOver(
    [RACK_SPAN.x[0] + PANEL_M, RACK_SPAN.x[1] - PANEL_M],
    [from + SLAB_GAP, to - SLAB_GAP],
    [RACK_FRONT_Z, RACK_FRONT_Z + depth],
  );
}

function stackOf(band: Extent, count: number): Extent[] {
  const pitch = width(band) / count;
  return Array.from({ length: count }, (_, index) => [
    band[0] + index * pitch,
    band[0] + (index + 1) * pitch,
  ]);
}

function computeBands(): Extent[] {
  const lower = stackOf(RACK_STACK.lowerCompute, LOWER_COMPUTE_TRAYS);
  return [...lower, ...stackOf(RACK_STACK.upperCompute, UPPER_COMPUTE_TRAYS)];
}

class SubjectRackPart {
  readonly built: Built;
  readonly manifold: Group;
  readonly westPanel: Mesh;

  constructor(kit: BoxKit) {
    const [rackX, , rackZ] = SUBJECT_RACK;
    this.westPanel = kit.box(
      'subjectRack',
      solidOver([RACK_SPAN.x[0], RACK_SPAN.x[0] + PANEL_M], RACK_SPAN.y, RACK_SPAN.z),
    );
    const frame = kit.boxes('subjectRack', [
      solidOver([RACK_SPAN.x[1] - PANEL_M, RACK_SPAN.x[1]], RACK_SPAN.y, RACK_SPAN.z),
      solidOver(RACK_SPAN.x, [RACK.height - PANEL_M, RACK.height], RACK_SPAN.z),
      solidOver(RACK_SPAN.x, RACK_STACK.base, RACK_SPAN.z),
      solidOver(RACK_SPAN.x, RACK_SPAN.y, [RACK_SPAN.z[1] - PANEL_M, RACK_SPAN.z[1]]),
    ]);
    const shelves = [RACK_STACK.lowerShelves, RACK_STACK.upperShelves].flatMap((band) =>
      stackOf(band, SHELVES_PER_GROUP).map((shelf) => slab(shelf, SHELF_DEPTH_SHARE)),
    );
    const busbar = [BUSBAR.lower, BUSBAR.upper].map((zone) =>
      solidOver([rackX - BUSBAR_M, rackX + BUSBAR_M], zone, [
        BUSBAR.z - BUSBAR_M / 2,
        BUSBAR.z + BUSBAR_M / 2,
      ]),
    );
    const compute = computeBands();
    const fans = compute.map(([from]): Solid => ({
      centre: [rackX, from + FAN_SIZE[1], RACK_FRONT_Z + FAN_SIZE[2]],
      size: FAN_SIZE,
    }));
    const manifoldRuns = [MANIFOLD.supplyX, MANIFOLD.returnX].map((x) =>
      run([x, RACK_STACK.base[1], MANIFOLD.z], [x, RACK.height, MANIFOLD.z], PIPE_M / 2),
    );
    this.manifold = grouped(kit.boxes('manifold', manifoldRuns));
    const switchBands = stackOf(RACK_STACK.switchTrays, SWITCH_TRAYS);
    const westX = RACK_SPAN.x[0];
    const parts = [
      part(grouped(frame, this.westPanel), 'subjectRack', [rackX, RACK.height, rackZ]),
      part(grouped(kit.boxes('shelf', shelves)), 'powerShelves', [
        westX,
        middle(RACK_STACK.upperShelves),
        rackZ,
      ]),
      part(grouped(kit.boxes('busbar', busbar)), 'busbar', [rackX, middle(BUSBAR.upper), BUSBAR.z]),
      part(
        grouped(
          kit.boxes(
            'computeTray',
            compute.map((band) => slab(band)),
          ),
        ),
        'computeTrays',
        [westX, SUBJECT_TRAY_Y, rackZ],
      ),
      part(
        grouped(
          kit.boxes(
            'switchTray',
            switchBands.map((band) => slab(band)),
          ),
        ),
        'switchTrays',
        [westX, middle(RACK_STACK.switchTrays), rackZ],
      ),
      part(grouped(kit.boxes('trayFan', fans)), 'trayFans', [rackX, SUBJECT_TRAY_Y, RACK_FRONT_Z]),
      part(this.manifold, 'manifold', [MANIFOLD.returnX, middle(BUSBAR.lower), MANIFOLD.z]),
    ];
    this.built = merge(...parts);
  }
}

function buildFacilityPipes(kit: BoxKit): Built {
  const riserBottom: Point = [RISER.x, RISER.bottom, RISER.z];
  const riserTop: Point = [RISER.x, ROOF_PIPE_Y, RISER.z];
  const runs = [
    run([MANIFOLD.returnX, ROW_PIPE.y, ROW_PIPE.z], [RISER.x, ROW_PIPE.y, ROW_PIPE.z], PIPE_M),
    run(riserBottom, riserTop, PIPE_M),
    run(riserTop, [RISER.x, ROOF_PIPE_Y, CHILLER.base[2]], PIPE_M),
    run(
      [RISER.x, ROOF_PIPE_Y, CHILLER.base[2]],
      [boxSpan(CHILLER).x[0], ROOF_PIPE_Y, CHILLER.base[2]],
      PIPE_M,
    ),
  ];
  return part(grouped(kit.boxes('pipe', runs)), 'facilityPipes', [
    RISER.x,
    middle([RISER.bottom, RISER.top]),
    RISER.z,
  ]);
}

function buildPlant(kit: BoxKit): Built {
  const northMiddle = DRY_COOLERS[Math.floor(DRY_COOLERS_PER_ROW / 2)];
  return merge(
    part(grouped(kit.box('chiller', solidOf(CHILLER))), 'chiller', boxTop(CHILLER)),
    part(
      grouped(kit.boxes('dryCooler', DRY_COOLERS.map(solidOf))),
      'dryCoolers',
      boxTop(northMiddle),
    ),
  );
}

function buildCdus(kit: BoxKit): Built {
  return part(grouped(kit.boxes('cdu', CDUS.map(solidOf))), 'cdu', boxTop(SUBJECT_CDU));
}

function buildAirHandlers(kit: BoxKit): Built {
  const middleUnit = AIR_HANDLERS[Math.floor(AIR_HANDLERS.length / 2)];
  return part(
    grouped(kit.boxes('airHandler', AIR_HANDLERS.map(solidOf))),
    'airHandlers',
    boxTop(middleUnit),
  );
}

function buildNetwork(kit: BoxKit): Built {
  const fibre = kit.box('fibre', { centre: FIBRE_ENTRY, size: FIBRE_BOX });
  return merge(
    part(grouped(fibre), 'fibreEntry', FIBRE_ENTRY),
    part(
      grouped(kit.boxes('spine', SPINE_RACKS.map(solidOf))),
      'spineSwitches',
      boxTop(SPINE_RACKS[1]),
    ),
    part(grouped(kit.boxes('leaf', LEAF_RACKS.map(solidOf))), 'leafSwitches', boxTop(SUBJECT_LEAF)),
  );
}

function buildInset(kit: BoxKit): Built {
  const [x, y, z] = INSET_CENTRE;
  const panel = kit.box('inset', {
    centre: INSET_CENTRE,
    size: [INSET.depth, INSET.height, INSET.width],
  });
  return part(grouped(panel), 'chipInset', [x, y + INSET.height / 2, z]);
}

function buildLineUp(kit: BoxKit): Built {
  const object = grouped(kit.box('desk', solidOf(DESK)), kit.box('laptop', solidOf(LAPTOP)));
  return part(object, 'laptop', boxTop(LAPTOP));
}

function fixedAnchors(frame: Object3D): Record<FixedAnchorId, Object3D> {
  const ids = Object.keys(ANCHOR_POINTS) as FixedAnchorId[];
  return Object.fromEntries(ids.map((id) => [id, anchorAt(frame, ...ANCHOR_POINTS[id])])) as Record<
    FixedAnchorId,
    Object3D
  >;
}

function chaseFor(joule: JouleReading): ChaseTarget {
  return { position: joule.position, heading: joule.heading, pitch: 0, roll: 0, span: joule.span };
}

export class PlaceholderAssembly implements Assembly {
  readonly root = new Group();
  private readonly tracker = new ResourceTracker();
  private readonly materials: MaterialLibrary;
  private readonly kit: BoxKit;
  private readonly building: BuildingPart;
  private readonly subject: SubjectRackPart;
  private readonly cdus: Group;
  private readonly airHandlers: Group;
  private readonly inset: Group;
  private readonly lineUp: Group;
  private readonly bead = new Group();
  private readonly beadMesh: Mesh;
  private readonly labels: ReadonlyMap<PartId, Object3D>;
  private readonly named: Readonly<Record<AnchorId, Object3D>>;
  private readonly regionOf = localRegions(REGION_SPECS);
  private chase: ChaseTarget;

  constructor(resources: AssemblyResources, state: AssemblyState) {
    this.materials = resources.materials;
    this.kit = new BoxKit(resources.materials, this.tracker);
    const kit = this.kit;
    const frame = new Group();
    this.building = new BuildingPart(kit);
    this.subject = new SubjectRackPart(kit);
    const cdus = buildCdus(kit);
    const airHandlers = buildAirHandlers(kit);
    const inset = buildInset(kit);
    const lineUp = buildLineUp(kit);
    this.cdus = cdus.object;
    this.airHandlers = airHandlers.object;
    this.inset = inset.object;
    this.lineUp = lineUp.object;
    this.beadMesh = kit.mesh(
      'current',
      new SphereGeometry(JOULE_RADIUS, JOULE_SEGMENTS, SPHERE_DETAIL),
    );
    this.bead.add(this.beadMesh);
    const parts = [
      buildGridLine(kit),
      buildSubstation(kit),
      buildGenerators(kit),
      this.building.built,
      buildElectricalRoom(kit),
      buildBusway(kit),
      buildHallRacks(kit),
      this.subject.built,
      cdus,
      buildFacilityPipes(kit),
      buildPlant(kit),
      airHandlers,
      buildNetwork(kit),
      inset,
      lineUp,
    ];
    this.root.add(buildGround(kit), frame, this.bead, ...parts.map(({ object }) => object));
    this.labels = new Map<PartId, Object3D>([
      ...parts.flatMap(({ labels }) => labels),
      ['joule', this.bead],
    ]);
    this.named = { ...fixedAnchors(frame), joule: this.bead };
    this.chase = chaseFor(state.joule);
    this.setState(state);
  }

  setState(state: AssemblyState): void {
    const { joule, view } = state;
    this.bead.position.set(...joule.position);
    this.beadMesh.material = this.kit.material(joule.form === 'heat' ? 'heat' : 'current');
    this.applyCooling(state.cooling === 'air');
    this.applyView(view);
    this.chase = chaseFor(joule);
    this.root.updateMatrixWorld();
  }

  update(_deltaSeconds: number, _cameraDistance: number): boolean {
    return false;
  }

  labelAnchors(): ReadonlyMap<PartId, Object3D> {
    return this.labels;
  }

  anchor(id: AnchorId): Object3D {
    return this.named[id];
  }

  region(id: RegionId): Box3 {
    return this.regionOf(id);
  }

  chaseTarget(): ChaseTarget {
    return this.chase;
  }

  dispose(): void {
    this.root.removeFromParent();
    this.materials.clearRegistered();
    this.tracker.dispose();
  }

  private applyCooling(air: boolean): void {
    this.airHandlers.visible = air;
    this.cdus.visible = !air;
    this.subject.manifold.visible = !air;
  }

  private applyView(view: ViewOptions): void {
    this.inset.visible = view.inset;
    this.lineUp.visible = view.lineUp;
    this.building.applyCutaway(view.cutaway);
    this.subject.westPanel.visible = !view.cutaway;
  }
}

export function createPlaceholderAssembly(
  resources: AssemblyResources,
  state: AssemblyState,
): Assembly {
  return new PlaceholderAssembly(resources, state);
}
