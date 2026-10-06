import { CylinderGeometry, Group, Mesh } from 'three';
import type { BufferGeometry, Box3, Object3D } from 'three';
import { clamp } from '@core/math';
import { box } from '@core/scene/geometry/box';
import type { BoxBounds } from '@core/scene/geometry/box';
import { anchorAt } from '@core/scene/parts';
import { regionFromSpec } from '@core/scene/regions';
import type { AnchorId, AssemblyState, GradientAxisId, PartId, Point, RegionId } from '../ids';
import { GRADIENT_AXIS_IDS, PART_IDS } from '../ids';
import {
  BODY_COIL,
  BORE,
  COLD_HEAD,
  FLOOR_Y,
  HEAD_COIL,
  ISOCENTRE,
  LAYERS,
  MAGNET,
  MAIN_COILS,
  MAIN_FIELD_ARROW,
  PATIENT,
  QUENCH_PIPE,
  REGIONS,
  ROOM,
  SCREEN,
  SHIELD_COILS,
  SHIMS,
  SLICE_THICKNESS,
  TABLE,
  VOXEL,
  gradientShell,
} from '../model/layout';
import type { CoilRings, Shell } from '../model/layout';
import { GRADIENT_TONES, THEME } from '../theme';
import type { Assembly, AssemblyResources } from './assembly';

const SEGMENTS = 32;
const FLOOR_THICKNESS = 0.02;
const ARROW_THICKNESS = 0.03;
const SCREEN_DEPTH = 0.03;
const ECHO_GAP = 0.02;
const ECHO_RADIUS = HEAD_COIL.radius + ECHO_GAP;
const FIELD_LINE_REACH = 1.5;
const DIAGONAL = Math.SQRT1_2;
const GRADIENT_PARTS: Readonly<Record<GradientAxisId, PartId>> = {
  x: 'gradientX',
  y: 'gradientY',
  z: 'gradientZ',
};

function bounds(centre: Point, size: Point): BoxBounds {
  const [x, y, z] = centre;
  const [width, height, depth] = size;
  return {
    minX: x - width / 2,
    maxX: x + width / 2,
    minY: y - height / 2,
    maxY: y + height / 2,
    minZ: z - depth / 2,
    maxZ: z + depth / 2,
  };
}

function tube(radius: number, length: number): BufferGeometry {
  return new CylinderGeometry(radius, radius, length, SEGMENTS, 1, true).rotateX(Math.PI / 2);
}

function post(radius: number, from: number, to: number): BufferGeometry {
  return new CylinderGeometry(radius, radius, to - from, SEGMENTS).translate(0, (from + to) / 2, 0);
}

function diagonal(radius: number, z = 0): Point {
  return [radius * DIAGONAL, ISOCENTRE[1] + radius * DIAGONAL, z];
}

const PART_ANCHORS: Readonly<Record<PartId, Point>> = {
  room: [ROOM.x[0], FLOOR_Y, ROOM.z[0]],
  cover: diagonal(MAGNET.radius, MAGNET.halfLength),
  vacuumVessel: diagonal(LAYERS.vacuumVessel.outer),
  radiationShield: diagonal(LAYERS.radiationShield.outer),
  heliumVessel: diagonal(LAYERS.heliumVessel.outer),
  mainCoils: diagonal(MAIN_COILS.outer, MAIN_COILS.z[3]),
  shieldCoils: diagonal(SHIELD_COILS.outer, SHIELD_COILS.z[1]),
  shims: diagonal(SHIMS.radius),
  coldHead: [COLD_HEAD.centre[0], COLD_HEAD.top, COLD_HEAD.centre[2]],
  quenchPipe: [QUENCH_PIPE.x, QUENCH_PIPE.to, QUENCH_PIPE.z],
  gradientX: diagonal(gradientShell('x').outer),
  gradientY: diagonal(gradientShell('y').outer),
  gradientZ: diagonal(gradientShell('z').outer),
  bodyCoil: diagonal(BODY_COIL.radius),
  bore: [0, ISOCENTRE[1] - BORE.radius, BORE.halfLength],
  table: [TABLE.halfWidth, TABLE.top, TABLE.z[1]],
  patient: [0, TABLE.top, PATIENT.feetZ],
  headCoil: [0, ISOCENTRE[1] + HEAD_COIL.radius, 0],
  sliceSlab: [BORE.radius, ISOCENTRE[1], 0],
  spinArrows: VOXEL.centre,
  netMagnet: [VOXEL.centre[0], VOXEL.centre[1] + VOXEL.size / 2, VOXEL.centre[2]],
  mainField: MAIN_FIELD_ARROW.tail,
  rfWave: diagonal(BODY_COIL.radius, -BODY_COIL.halfLength),
  echoWave: diagonal(ECHO_RADIUS),
  fieldLinesGroup: [0, ISOCENTRE[1], -BORE.halfLength - FIELD_LINE_REACH],
  fringeLine: [0, FLOOR_Y, ROOM.z[0]],
  screen: SCREEN.centre,
};

class PlaceholderAssembly implements Assembly {
  readonly root = new Group();
  private readonly resources: AssemblyResources;
  private readonly parts = new Map<PartId, Group>();
  private readonly anchors = new Map<PartId, Object3D>();
  private readonly named: Readonly<Record<AnchorId, Object3D>>;
  private readonly regions: Readonly<Record<RegionId, Box3>>;
  private state: AssemblyState;

  constructor(resources: AssemblyResources, state: AssemblyState) {
    this.resources = resources;
    this.state = state;
    for (const id of PART_IDS) {
      const group = new Group();
      group.name = id;
      this.parts.set(id, group);
      this.root.add(group);
      this.anchors.set(id, anchorAt(group, ...PART_ANCHORS[id]));
    }
    this.buildRoom();
    this.buildMagnet();
    this.buildPatient();
    this.buildInset();
    this.named = {
      isocentre: anchorAt(this.root, ...ISOCENTRE),
      voxel: anchorAt(this.root, ...VOXEL.centre),
      headCoil: anchorAt(this.root, ...PART_ANCHORS.headCoil),
      screen: anchorAt(this.root, ...SCREEN.centre),
      coldHead: anchorAt(this.root, ...PART_ANCHORS.coldHead),
    };
    this.regions = Object.fromEntries(
      Object.entries(REGIONS).map(([id, spec]) => [id, regionFromSpec(spec)]),
    ) as Record<RegionId, Box3>;
    this.setState(state);
  }

  private part(id: PartId): Group {
    const group = this.parts.get(id);
    if (!group) throw new Error(`Unknown part ${id}`);
    return group;
  }

  private add(id: PartId, color: string, geometry: BufferGeometry, at: Point = ISOCENTRE): Mesh {
    const mesh = new Mesh(geometry, this.resources.materials.get(id, { color }));
    mesh.position.set(...at);
    this.part(id).add(mesh);
    return mesh;
  }

  private shell(id: PartId, color: string, { outer, halfLength }: Shell): void {
    this.add(id, color, tube(outer, 2 * halfLength));
  }

  private rings(id: PartId, color: string, { outer, width, z }: CoilRings): void {
    z.forEach((at) => this.add(id, color, tube(outer, width), [0, ISOCENTRE[1], at]));
  }

  private buildRoom(): void {
    const floor: Point = [0, FLOOR_Y - FLOOR_THICKNESS / 2, (ROOM.z[0] + ROOM.z[1]) / 2];
    const size: Point = [ROOM.x[1] - ROOM.x[0], FLOOR_THICKNESS, ROOM.z[1] - ROOM.z[0]];
    this.add('room', THEME.floor, box(bounds(floor, size)), [0, 0, 0]);
    const screen = this.add(
      'screen',
      THEME.screenFrame,
      box(bounds([0, 0, 0], [SCREEN_DEPTH, SCREEN.height, SCREEN.width])),
      SCREEN.centre,
    );
    screen.rotation.y = SCREEN.yawTowardTable;
  }

  private buildMagnet(): void {
    this.shell('cover', THEME.cover, LAYERS.cover);
    this.shell('vacuumVessel', THEME.vacuumVessel, LAYERS.vacuumVessel);
    this.shell('radiationShield', THEME.radiationShield, LAYERS.radiationShield);
    this.shell('heliumVessel', THEME.helium, LAYERS.heliumVessel);
    this.rings('mainCoils', THEME.winding, MAIN_COILS);
    this.rings('shieldCoils', THEME.shieldWinding, SHIELD_COILS);
    this.add('shims', THEME.shim, tube(SHIMS.radius, 2 * SHIMS.halfLength));
    for (const axis of GRADIENT_AXIS_IDS) {
      this.shell(GRADIENT_PARTS[axis], GRADIENT_TONES[axis], gradientShell(axis));
    }
    this.add('bodyCoil', THEME.metal, tube(BODY_COIL.radius, 2 * BODY_COIL.halfLength));
    this.add('bore', THEME.boreLiner, tube(BORE.radius, 2 * BORE.halfLength));
    const turretFoot = 2 * COLD_HEAD.centre[1] - COLD_HEAD.top;
    this.add('coldHead', THEME.metal, post(COLD_HEAD.radius, turretFoot, COLD_HEAD.top), [
      COLD_HEAD.centre[0],
      0,
      COLD_HEAD.centre[2],
    ]);
    this.add(
      'quenchPipe',
      THEME.metalDark,
      post(QUENCH_PIPE.radius, QUENCH_PIPE.from, QUENCH_PIPE.to),
      [QUENCH_PIPE.x, 0, QUENCH_PIPE.z],
    );
    this.add('rfWave', THEME.rf, tube(BODY_COIL.radius, 2 * BODY_COIL.halfLength));
    this.add(
      'sliceSlab',
      THEME.slice,
      box(bounds([0, 0, 0], [2 * BORE.radius, 2 * BORE.radius, SLICE_THICKNESS])),
    );
    this.add(
      'fieldLinesGroup',
      THEME.fieldLine,
      box(
        bounds(
          [0, 0, 0],
          [ARROW_THICKNESS, ARROW_THICKNESS, 2 * (BORE.halfLength + FIELD_LINE_REACH)],
        ),
      ),
    );
    this.add('fringeLine', THEME.fringe, box(bounds([0, 0, 0], [2, FLOOR_THICKNESS, 2])), [
      0,
      FLOOR_Y,
      0,
    ]);
  }

  private buildPatient(): void {
    const [tableFrom, tableTo] = TABLE.z;
    const [cradleFrom, cradleTo] = TABLE.cradleZ;
    const cradleBase = TABLE.top - TABLE.cradleThickness;
    const tableSize: Point = [2 * TABLE.halfWidth, cradleBase, tableTo - tableFrom];
    this.add(
      'table',
      THEME.table,
      box(bounds([0, cradleBase / 2, (tableFrom + tableTo) / 2], tableSize)),
      [0, 0, 0],
    );
    const cradleSize: Point = [
      2 * TABLE.cradleHalfWidth,
      TABLE.cradleThickness,
      cradleTo - cradleFrom,
    ];
    this.add(
      'table',
      THEME.cradle,
      box(
        bounds(
          [0, cradleBase + TABLE.cradleThickness / 2, (cradleFrom + cradleTo) / 2],
          cradleSize,
        ),
      ),
      [0, 0, 0],
    );
    const headSize = 2 * PATIENT.headRadius;
    this.add('patient', THEME.skin, box(bounds([0, 0, 0], [headSize, headSize, headSize])));
    const bodyFrom = PATIENT.head[2] + PATIENT.headRadius;
    const bodySize: Point = [2 * PATIENT.halfWidth, headSize, PATIENT.feetZ - bodyFrom];
    this.add(
      'patient',
      THEME.blanket,
      box(bounds([0, TABLE.top + PATIENT.headRadius, (bodyFrom + PATIENT.feetZ) / 2], bodySize)),
      [0, 0, 0],
    );
    this.add('headCoil', THEME.headCoil, tube(HEAD_COIL.radius, HEAD_COIL.length));
    this.add('echoWave', THEME.echo, tube(ECHO_RADIUS, HEAD_COIL.length));
  }

  private buildInset(): void {
    const { centre, size } = VOXEL;
    this.add('spinArrows', THEME.spinArrow, box(bounds([0, 0, 0], [size, size, size])), centre);
    this.add(
      'netMagnet',
      THEME.netMagnet,
      box(bounds([0, 0, 0], [ARROW_THICKNESS, ARROW_THICKNESS, size])),
      centre,
    );
    const { tail, length } = MAIN_FIELD_ARROW;
    this.add(
      'mainField',
      THEME.mainField,
      box(bounds([0, 0, -length / 2], [ARROW_THICKNESS, ARROW_THICKNESS, length])),
      tail,
    );
  }

  setState(state: AssemblyState): void {
    this.state = state;
    const { view, sequence, fringe } = state;
    const show = (id: PartId, visible: boolean): void => {
      this.part(id).visible = visible;
    };
    show('cover', !view.cutaway);
    show('fieldLinesGroup', view.fieldLines);
    show('fringeLine', view.fieldLines);
    for (const id of ['spinArrows', 'netMagnet', 'mainField'] as const) show(id, view.voxel);
    show('rfWave', sequence.rf !== null);
    show('echoWave', sequence.echo > 0);
    show('sliceSlab', sequence.rf !== null);
    this.part('fringeLine').scale.set(
      clamp(fringe.side, 0, ROOM.x[1]),
      1,
      clamp(fringe.along, 0, Math.min(-ROOM.z[0], ROOM.z[1])),
    );
  }

  update(): boolean {
    const { playing, view } = this.state;
    return playing && (view.voxel || view.fieldLines);
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
