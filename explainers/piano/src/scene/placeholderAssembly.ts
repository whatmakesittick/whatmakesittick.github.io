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
import { toRadians } from '@core/math';
import { UNDIMMED_GROUP, createMaterial } from '@core/scene/materials';
import type { MaterialFinish, MaterialLibrary } from '@core/scene/materials';
import { anchorAt } from '@core/scene/parts';
import { regionFromSpec } from '@core/scene/regions';
import { ResourceTracker } from '@core/scene/resources';
import { ANCHOR_IDS } from '../ids';
import type {
  ActionPose,
  AnchorId,
  AssemblyState,
  ChaseTarget,
  PartId,
  Point,
  RegionId,
  RegisterId,
} from '../ids';
import {
  BACK_CHECK,
  BLOW_MM,
  CAPSTAN,
  CASE,
  DAMPER,
  HAMMER,
  HARPSICHORD,
  INSET,
  KEY,
  KEYS,
  KEY_LEVER,
  KNUCKLE_ARM,
  LEG_SPOTS,
  LET_OFF_BUTTON,
  LID,
  LYRE,
  NOTES,
  PLATE,
  SHANK,
  SOUNDBOARD,
  STAGE_RADIUS,
  STRINGS,
  STRING_Y,
  TUNING_PINS,
  UPRIGHT,
  WIPPEN,
  hasDamper,
  insetCentre,
  isBlackKey,
  jackAnchor,
  keyX,
  mm,
  regionSpecFor,
  restAnchorPoint,
  stringPath,
  stringsPerNote,
} from '../model';
import { THEME } from '../theme';
import type { Assembly, AssemblyResources } from './assembly';
import {
  chaseTargetFor,
  damperHeadTop,
  hammerAngle,
  hammerHeadTop,
  jackAngle,
  keyAngle,
  keyFrontTop,
  playedX,
  repetitionAngle,
  uprightHammerAngle,
  wippenAngle,
} from './pose';

type EmphasisGroup = PartId | typeof UNDIMMED_GROUP;
type LabelEntry = readonly [PartId, Object3D];

interface BoxSpec {
  centre: Point;
  size: Point;
}

interface Paint {
  group: EmphasisGroup;
  finish: MaterialFinish;
}

const ROUGHNESS = 0.7;
const GHOST_OPACITY = 0.35;
const STILL_SHARE = 0.01;
const WAVE_AMPLITUDE_MM = 6;
const VISUAL_WAVE_HZ = 6;
const PEDAL_PRESS_ANGLE = 0.12;
const STRING_THICKNESS = 0.0012;
const PLAYED_STRING_THICKNESS = 0.0016;
const PART_THICKNESS = 0.006;
const HEAD = { width: 0.012, height: 0.04, depth: 0.02 } as const;
const PLATE_BAR = 0.06;
const LEG_SIZE = 0.09;
const ALONG_Z = new Vector3(0, 0, 1);
const STAGE_TILT = -Math.PI / 2;
const STRING_SET_KEY = 60;
const BASS_SET_KEY = 8;
const NEIGHBOUR_KEY_STEP = 12;
const FULL_TURN = 2 * Math.PI;

function paint(group: EmphasisGroup, color: string, extra: MaterialFinish = {}): Paint {
  return { group, finish: { color, roughness: ROUGHNESS, ...extra } };
}

function ghostPaint(group: PartId): Paint {
  return paint(group, THEME.ghost, {
    transparent: true,
    opacity: GHOST_OPACITY,
    depthWrite: false,
  });
}

const PAINTS = {
  floor: paint(UNDIMMED_GROUP, THEME.stage),
  case: paint('case', THEME.caseBlack, { roughness: 0.25 }),
  whiteKey: paint('keyboard', THEME.ivory),
  blackKey: paint('keyboard', THEME.ebony),
  key: paint('key', THEME.ivory),
  capstan: paint('capstan', THEME.brass, { metalness: 0.6 }),
  wippen: paint('wippen', THEME.keyWood),
  jack: paint('jack', THEME.keyWood),
  letOff: paint('letOffButton', THEME.cloth),
  repetition: paint('repetitionLever', THEME.keyWood),
  knuckle: paint('knuckle', THEME.cloth),
  hammer: paint('hammer', THEME.felt),
  backCheck: paint('backCheck', THEME.felt),
  damper: paint('damper', THEME.felt),
  actions: paint('actions', THEME.keyWood),
  strings: paint('strings', THEME.steel, { metalness: 0.8, roughness: 0.3 }),
  stringSet: paint('stringSet', THEME.steel, { metalness: 0.8, roughness: 0.3 }),
  bassStrings: paint('bassStrings', THEME.copper, { metalness: 0.7, roughness: 0.35 }),
  bridge: paint('bridge', THEME.bridgeWood),
  soundboard: paint('soundboard', THEME.spruce),
  plate: paint('plate', THEME.plateGold, { metalness: 0.6, roughness: 0.4 }),
  tuningPins: paint('tuningPins', THEME.steel, { metalness: 0.8 }),
  pedals: paint('pedals', THEME.brass, { metalness: 0.7 }),
  inset: paint('inset', THEME.inset),
  insetLine: paint('inset', THEME.insetLine),
  upright: ghostPaint('upright'),
  harpsichord: ghostPaint('harpsichord'),
} as const satisfies Record<string, Paint>;
type PaintId = keyof typeof PAINTS;

function boxOver(
  x: readonly [number, number],
  y: readonly [number, number],
  z: readonly [number, number],
): BoxSpec {
  return {
    centre: [(x[0] + x[1]) / 2, (y[0] + y[1]) / 2, (z[0] + z[1]) / 2],
    size: [x[1] - x[0], y[1] - y[0], z[1] - z[0]],
  };
}

function boxAt(centre: Point, size: Point): BoxSpec {
  return { centre, size };
}

function segmentMatrix(from: Point, to: Point, width: number, height: number): Matrix4 {
  const start = new Vector3(...from);
  const end = new Vector3(...to);
  const direction = end.clone().sub(start);
  const length = direction.length();
  const rotation = new Quaternion().setFromUnitVectors(ALONG_Z, direction.normalize());
  const centre = start.add(end).multiplyScalar(0.5);
  return new Matrix4().compose(centre, rotation, new Vector3(width, height, length));
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

  segment(id: PaintId, from: Point, to: Point, width: number, height = width): Mesh {
    const mesh = new Mesh(this.geometry, this.material(id));
    segmentMatrix(from, to, width, height).decompose(mesh.position, mesh.quaternion, mesh.scale);
    return mesh;
  }

  instanced(id: PaintId, matrices: readonly Matrix4[]): InstancedMesh {
    const mesh = new InstancedMesh(this.geometry, this.material(id), matrices.length);
    matrices.forEach((matrix, index) => mesh.setMatrixAt(index, matrix));
    mesh.computeBoundingSphere();
    return this.tracker.track(mesh);
  }

  plane(id: PaintId, size: number): Mesh {
    return new Mesh(this.tracker.track(new PlaneGeometry(size, size)), this.material(id));
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

function boxMatrix({ centre, size }: BoxSpec): Matrix4 {
  return new Matrix4().compose(new Vector3(...centre), new Quaternion(), new Vector3(...size));
}

const HIDDEN = new Matrix4().makeScale(0, 0, 0);
const ALL_KEYS = Array.from({ length: KEYS }, (_, index) => index + 1);

function keySpec(key: number): BoxSpec {
  const black = isBlackKey(key);
  const length = black ? KEY.blackLength : KEY.length;
  const width = black ? KEY.blackWidth : KEY.whiteWidth;
  const top = KEY.top + (black ? KEY.blackRise : 0);
  return boxAt(
    [keyX(key), top - KEY.thickness / 2, KEY.frontZ - length / 2],
    [width, KEY.thickness, length],
  );
}

function restHeadSpec(key: number): BoxSpec {
  return boxAt(
    [keyX(key), HAMMER.pivotY + HAMMER.headTopRise - HEAD.height / 2, HAMMER.pivotZ - SHANK],
    [HEAD.width, HEAD.height, HEAD.depth],
  );
}

function damperSpec(key: number): BoxSpec {
  return boxAt(
    [keyX(key), STRING_Y + DAMPER.headHeight / 2, DAMPER.z],
    [HEAD.width, DAMPER.headHeight, DAMPER.headDepth],
  );
}

class InstancedRow {
  readonly mesh: InstancedMesh;
  private readonly keys: readonly number[];
  private readonly spec: (key: number) => BoxSpec;
  private hidden: number | null = null;

  constructor(kit: BoxKit, id: PaintId, keys: readonly number[], spec: (key: number) => BoxSpec) {
    this.keys = keys;
    this.spec = spec;
    this.mesh = kit.instanced(
      id,
      keys.map((key) => boxMatrix(spec(key))),
    );
  }

  hide(key: number): void {
    if (this.hidden !== null) this.setKey(this.hidden, boxMatrix(this.spec(this.hidden)));
    this.hidden = this.keys.includes(key) ? key : null;
    if (this.hidden !== null) this.setKey(this.hidden, HIDDEN);
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  private setKey(key: number, matrix: Matrix4): void {
    this.mesh.setMatrixAt(this.keys.indexOf(key), matrix);
  }
}

function pivot(parent: Object3D, y: number, z: number): Group {
  const group = new Group();
  group.position.set(0, y, z);
  parent.add(group);
  return group;
}

interface DetailedAction {
  object: Group;
  key: Group;
  wippen: Group;
  jack: Group;
  repetition: Group;
  hammer: Group;
  damper: Group;
  labels: readonly LabelEntry[];
}

function buildDetailedAction(kit: BoxKit): DetailedAction {
  const object = new Group();
  const key = pivot(object, KEY_LEVER.pivotY, KEY_LEVER.pivotZ);
  key.add(
    kit.box(
      'key',
      boxOver(
        [-KEY.whiteWidth / 2, KEY.whiteWidth / 2],
        [KEY.top - KEY.thickness - KEY_LEVER.pivotY, KEY.top - KEY_LEVER.pivotY],
        [KEY.frontZ - KEY.length - KEY_LEVER.pivotZ, KEY.frontZ - KEY_LEVER.pivotZ],
      ),
    ),
  );
  key.add(
    kit.box(
      'capstan',
      boxAt(
        [0, CAPSTAN.top - KEY_LEVER.pivotY - PART_THICKNESS, CAPSTAN.z - KEY_LEVER.pivotZ],
        [PART_THICKNESS, 2 * PART_THICKNESS, PART_THICKNESS],
      ),
    ),
  );
  key.add(
    kit.box(
      'backCheck',
      boxAt(
        [0, BACK_CHECK.y - KEY_LEVER.pivotY, BACK_CHECK.z - KEY_LEVER.pivotZ],
        [PART_THICKNESS, 3 * PART_THICKNESS, PART_THICKNESS],
      ),
    ),
  );
  const wippen = pivot(object, WIPPEN.pivotY, WIPPEN.pivotZ);
  wippen.add(
    kit.box(
      'wippen',
      boxOver(
        [-PART_THICKNESS, PART_THICKNESS],
        [-PART_THICKNESS, PART_THICKNESS],
        [0, WIPPEN.jackArm],
      ),
    ),
  );
  const jack = pivot(wippen, 0, WIPPEN.jackArm);
  jack.add(
    kit.box(
      'jack',
      boxOver(
        [-PART_THICKNESS / 2, PART_THICKNESS / 2],
        [0, HAMMER.pivotY - WIPPEN.pivotY - PART_THICKNESS],
        [-PART_THICKNESS, 0],
      ),
    ),
  );
  const repetition = pivot(wippen, PART_THICKNESS, WIPPEN.jackArm / 2);
  repetition.add(
    kit.box(
      'repetition',
      boxOver(
        [-PART_THICKNESS / 2, PART_THICKNESS / 2],
        [PART_THICKNESS, 2 * PART_THICKNESS],
        [0, WIPPEN.jackArm / 2 + KNUCKLE_ARM],
      ),
    ),
  );
  object.add(
    kit.box(
      'letOff',
      boxAt(
        [0, LET_OFF_BUTTON.y, LET_OFF_BUTTON.z],
        [PART_THICKNESS, PART_THICKNESS, PART_THICKNESS],
      ),
    ),
  );
  const hammer = pivot(object, HAMMER.pivotY, HAMMER.pivotZ);
  hammer.add(
    kit.box(
      'hammer',
      boxOver(
        [-PART_THICKNESS / 2, PART_THICKNESS / 2],
        [-PART_THICKNESS / 2, PART_THICKNESS / 2],
        [-SHANK, 0],
      ),
    ),
  );
  hammer.add(
    kit.box(
      'hammer',
      boxAt(
        [0, HAMMER.headTopRise - HEAD.height / 2, -SHANK],
        [HEAD.width, HEAD.height, HEAD.depth],
      ),
    ),
  );
  hammer.add(
    kit.box(
      'knuckle',
      boxAt([0, -PART_THICKNESS, -KNUCKLE_ARM], [PART_THICKNESS, PART_THICKNESS, PART_THICKNESS]),
    ),
  );
  const damper = pivot(object, 0, 0);
  damper.add(
    kit.box(
      'damper',
      boxAt(
        [0, STRING_Y + DAMPER.headHeight / 2, DAMPER.z],
        [HEAD.width, DAMPER.headHeight, DAMPER.headDepth],
      ),
    ),
  );
  damper.add(
    kit.segment('damper', [0, KEY.top, DAMPER.z], [0, STRING_Y, DAMPER.z], PART_THICKNESS / 2),
  );
  const labels: LabelEntry[] = [
    ['key', anchorAt(key, 0, KEY.top - KEY_LEVER.pivotY, KEY.frontZ - KEY_LEVER.pivotZ)],
    ['capstan', anchorAt(key, 0, CAPSTAN.top - KEY_LEVER.pivotY, CAPSTAN.z - KEY_LEVER.pivotZ)],
    [
      'backCheck',
      anchorAt(key, 0, BACK_CHECK.y - KEY_LEVER.pivotY, BACK_CHECK.z - KEY_LEVER.pivotZ),
    ],
    ['wippen', anchorAt(wippen, 0, 0, WIPPEN.jackArm / 2)],
    ['jack', anchorAt(jack, 0, 0, 0)],
    ['repetitionLever', anchorAt(repetition, 0, 2 * PART_THICKNESS, WIPPEN.jackArm / 2)],
    ['letOffButton', anchorAt(object, 0, LET_OFF_BUTTON.y, LET_OFF_BUTTON.z)],
    ['knuckle', anchorAt(hammer, 0, -PART_THICKNESS, -KNUCKLE_ARM)],
    ['hammer', anchorAt(hammer, 0, HAMMER.headTopRise, -SHANK)],
    ['damper', anchorAt(damper, 0, STRING_Y + DAMPER.headHeight, DAMPER.z)],
  ];
  return { object, key, wippen, jack, repetition, hammer, damper, labels };
}

function poseDetailedAction(action: DetailedAction, pose: ActionPose): void {
  action.key.rotation.x = keyAngle(pose.keyMm);
  action.wippen.rotation.x = wippenAngle(pose.keyMm);
  action.jack.rotation.x = jackAngle(pose.jackEscape);
  action.repetition.rotation.x = repetitionAngle(pose.repetitionLift);
  action.hammer.rotation.x = hammerAngle(pose.hammerRiseMm);
  action.damper.position.y = mm(pose.damperLiftMm);
}

function stringMatrices(keys: readonly number[], thickness: number): Matrix4[] {
  return keys.map((key) => {
    const { front, back } = stringPath(key);
    return segmentMatrix(front, back, thickness, thickness);
  });
}

function unisonOffsets(count: number): number[] {
  return Array.from(
    { length: count },
    (_, index) => (index - (count - 1) / 2) * STRINGS.unisonSpacing,
  );
}

function midPoint(from: Point, to: Point): Point {
  return [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2, (from[2] + to[2]) / 2];
}

function shifted([x, y, z]: Point, dx: number): Point {
  return [x + dx, y, z];
}

function buildUnison(kit: BoxKit, register: RegisterId): Group {
  const group = new Group();
  const key = NOTES[register].key;
  const { front, back } = stringPath(key);
  unisonOffsets(stringsPerNote(key)).forEach((dx) =>
    group.add(
      kit.segment('strings', shifted(front, dx), shifted(back, dx), PLAYED_STRING_THICKNESS),
    ),
  );
  return group;
}

function buildCase(kit: BoxKit): { object: Group; leftRim: Mesh; lid: Group } {
  const object = new Group();
  const rimY: readonly [number, number] = [CASE.rimBottom, CASE.rimTop];
  const leftRim = kit.box(
    'case',
    boxOver([CASE.leftX - CASE.rimThickness, CASE.leftX], rimY, [CASE.tailZ, CASE.frontZ]),
  );
  const bentEnd: Point = [CASE.leftX + CASE.width / 4, (rimY[0] + rimY[1]) / 2, CASE.tailZ];
  const bentStart: Point = [CASE.rightX, bentEnd[1], CASE.bentsideStartZ];
  object.add(
    leftRim,
    kit.box(
      'case',
      boxOver([CASE.rightX, CASE.rightX + CASE.rimThickness], rimY, [
        CASE.bentsideStartZ,
        CASE.frontZ,
      ]),
    ),
    kit.segment('case', bentStart, bentEnd, CASE.rimThickness, rimY[1] - rimY[0]),
    kit.box(
      'case',
      boxOver([CASE.leftX, bentEnd[0]], rimY, [CASE.tailZ - CASE.rimThickness, CASE.tailZ]),
    ),
    kit.box(
      'case',
      boxOver(
        [CASE.leftX, CASE.rightX],
        [CASE.rimBottom, CASE.keybedY],
        [CASE.bentsideStartZ, CASE.frontZ],
      ),
    ),
    ...LEG_SPOTS.map(([x, z]) =>
      kit.box(
        'case',
        boxOver(
          [x - LEG_SIZE / 2, x + LEG_SIZE / 2],
          [0, CASE.rimBottom],
          [z - LEG_SIZE / 2, z + LEG_SIZE / 2],
        ),
      ),
    ),
  );
  const lid = new Group();
  lid.position.set(CASE.leftX, CASE.rimTop, 0);
  lid.rotation.z = toRadians(LID.angleDeg);
  lid.add(kit.box('case', boxOver([0, CASE.width], [0, LID.thickness], [CASE.tailZ, CASE.frontZ])));
  object.add(lid);
  return { object, leftRim, lid };
}

function buildPedals(kit: BoxKit): { object: Group; left: Mesh; right: Mesh } {
  const object = new Group();
  const pedal = (x: number) =>
    kit.box(
      'pedals',
      boxOver(
        [x - PART_THICKNESS, x + PART_THICKNESS],
        [LYRE.pedalY, LYRE.pedalY + PART_THICKNESS],
        [LYRE.z, LYRE.z + LYRE.pedalLength],
      ),
    );
  const left = pedal(-LYRE.pedalSpacing);
  const right = pedal(LYRE.pedalSpacing);
  object.add(left, pedal(0), right);
  return { object, left, right };
}

function buildInset(kit: BoxKit): Group {
  const object = new Group();
  object.add(kit.box('inset', boxAt([0, 0, 0], [INSET.depth, INSET.height, INSET.width])));
  const scaledJack = INSET.scale * PART_THICKNESS;
  object.add(
    kit.box(
      'insetLine',
      boxAt([-INSET.depth, -INSET.height / 4, 0], [INSET.depth, scaledJack * 2, scaledJack]),
    ),
  );
  object.add(
    kit.box(
      'insetLine',
      boxAt(
        [-INSET.depth, INSET.height / 8, -INSET.width / 8],
        [INSET.depth, scaledJack, INSET.width / 2],
      ),
    ),
  );
  return object;
}

interface Ghost {
  object: Group;
  moving: Group;
  string: Mesh;
}

interface UprightGhost extends Ghost {
  hammer: Group;
}

function buildUpright(kit: BoxKit): UprightGhost {
  const object = new Group();
  const keyBack = UPRIGHT.offsetZ - KEY.length;
  object.add(
    kit.box(
      'upright',
      boxOver(
        [-KEY.whiteWidth / 2, KEY.whiteWidth / 2],
        [KEY.top - KEY.thickness, KEY.top],
        [keyBack, UPRIGHT.offsetZ],
      ),
    ),
  );
  const string = kit.box(
    'upright',
    boxOver(
      [-STRING_THICKNESS, STRING_THICKNESS],
      [UPRIGHT.stringBottom, UPRIGHT.stringTop],
      [UPRIGHT.stringZ - STRING_THICKNESS, UPRIGHT.stringZ + STRING_THICKNESS],
    ),
  );
  object.add(string);
  const hammer = pivot(
    object,
    UPRIGHT.hammerPivotY,
    UPRIGHT.stringZ + mm(BLOW_MM) + HEAD.depth / 2,
  );
  hammer.add(
    kit.box(
      'upright',
      boxOver(
        [-PART_THICKNESS / 2, PART_THICKNESS / 2],
        [0, UPRIGHT.shank],
        [-PART_THICKNESS / 2, PART_THICKNESS / 2],
      ),
    ),
  );
  hammer.add(
    kit.box('upright', boxAt([0, UPRIGHT.shank, 0], [HEAD.width, HEAD.depth, HEAD.depth])),
  );
  const moving = pivot(object, 0, 0);
  moving.add(
    kit.box(
      'upright',
      boxAt(
        [0, STRING_Y, UPRIGHT.stringZ + PART_THICKNESS],
        [HEAD.width, DAMPER.headHeight, PART_THICKNESS],
      ),
    ),
  );
  return { object, hammer, moving, string };
}

function buildHarpsichord(kit: BoxKit): Ghost {
  const object = new Group();
  const keyBack = HARPSICHORD.offsetZ - HARPSICHORD.keyLength;
  object.add(
    kit.box(
      'harpsichord',
      boxOver(
        [-KEY.whiteWidth / 2, KEY.whiteWidth / 2],
        [KEY.top - KEY.thickness, KEY.top],
        [keyBack, HARPSICHORD.offsetZ],
      ),
    ),
  );
  const moving = pivot(object, 0, 0);
  moving.add(
    kit.box(
      'harpsichord',
      boxOver(
        [-PART_THICKNESS, PART_THICKNESS],
        [KEY.top, KEY.top + HARPSICHORD.jackHeight],
        [keyBack, keyBack + 2 * PART_THICKNESS],
      ),
    ),
  );
  const string = kit.segment(
    'harpsichord',
    [-2 * PART_THICKNESS, HARPSICHORD.stringY, keyBack - HARPSICHORD.keyLength / 2],
    [-2 * PART_THICKNESS, HARPSICHORD.stringY, keyBack + HARPSICHORD.keyLength / 2],
    STRING_THICKNESS,
  );
  object.add(string);
  return { object, moving, string };
}

function buildStage(kit: BoxKit): Mesh {
  const floor = kit.plane('floor', 2 * STAGE_RADIUS);
  floor.rotation.x = STAGE_TILT;
  return floor;
}

function buildInterior(kit: BoxKit): { object: Group; labels: LabelEntry[] } {
  const object = new Group();
  const steelKeys = ALL_KEYS.filter((key) => key > STRINGS.bassTopKey);
  const bassKeys = ALL_KEYS.filter((key) => key <= STRINGS.bassTopKey);
  const soundboardY: readonly [number, number] = [
    SOUNDBOARD.topY - SOUNDBOARD.centreThickness,
    SOUNDBOARD.topY,
  ];
  const pinsY: readonly [number, number] = [PLATE.topY - PLATE.thickness, PLATE.topY];
  const bridgePoints = steelKeys.map((key) => stringPath(key).back);
  object.add(
    kit.instanced('stringSet', stringMatrices(steelKeys, STRING_THICKNESS)),
    kit.instanced('bassStrings', stringMatrices(bassKeys, STRING_THICKNESS)),
    kit.segment(
      'bridge',
      bridgePoints[0],
      bridgePoints[bridgePoints.length - 1],
      PART_THICKNESS * 4,
      STRING_Y - SOUNDBOARD.topY,
    ),
    kit.box(
      'soundboard',
      boxOver([CASE.leftX, CASE.rightX], soundboardY, [CASE.tailZ, SOUNDBOARD.bellyRailZ]),
    ),
    kit.box(
      'plate',
      boxOver([CASE.leftX, CASE.leftX + PLATE_BAR], pinsY, [CASE.tailZ, TUNING_PINS.frontZ]),
    ),
    kit.box(
      'plate',
      boxOver([CASE.rightX - PLATE_BAR, CASE.rightX], pinsY, [
        CASE.bentsideStartZ,
        TUNING_PINS.frontZ,
      ]),
    ),
    kit.box(
      'tuningPins',
      boxOver([keyX(1), keyX(KEYS)], pinsY, [TUNING_PINS.backZ, TUNING_PINS.frontZ]),
    ),
  );
  const midSteel = stringPath(STRING_SET_KEY);
  const midBass = stringPath(BASS_SET_KEY);
  const labels: LabelEntry[] = [
    ['stringSet', anchorAt(object, ...midPoint(midSteel.front, midSteel.back))],
    ['bassStrings', anchorAt(object, ...midPoint(midBass.front, midBass.back))],
    ['soundboard', anchorAt(object, 0, SOUNDBOARD.topY, (CASE.tailZ + SOUNDBOARD.bellyRailZ) / 2)],
    ['plate', anchorAt(object, CASE.leftX + PLATE_BAR / 2, PLATE.topY, CASE.tailZ / 2)],
    ['tuningPins', anchorAt(object, 0, PLATE.topY, (TUNING_PINS.frontZ + TUNING_PINS.backZ) / 2)],
  ];
  return { object, labels };
}

export class PlaceholderAssembly implements Assembly {
  readonly root = new Group();
  private readonly tracker = new ResourceTracker();
  private readonly materials: MaterialLibrary;
  private readonly kit: BoxKit;
  private readonly keyRows: readonly InstancedRow[];
  private readonly headRow: InstancedRow;
  private readonly damperRow: InstancedRow;
  private readonly moving = new Group();
  private readonly detailed: DetailedAction;
  private readonly casing: ReturnType<typeof buildCase>;
  private readonly pedals: ReturnType<typeof buildPedals>;
  private readonly inset: Group;
  private readonly upright: UprightGhost;
  private readonly harpsichord: Ghost;
  private readonly unisons: Readonly<Record<RegisterId, Group>>;
  private readonly labels: ReadonlyMap<PartId, Object3D>;
  private readonly named: Readonly<Record<AnchorId, Object3D>>;
  private readonly stringLabel: Object3D;
  private state: AssemblyState;
  private clock = 0;

  constructor(resources: AssemblyResources, state: AssemblyState) {
    this.materials = resources.materials;
    this.kit = new BoxKit(resources.materials, this.tracker);
    const kit = this.kit;
    this.keyRows = [
      new InstancedRow(
        kit,
        'whiteKey',
        ALL_KEYS.filter((key) => !isBlackKey(key)),
        keySpec,
      ),
      new InstancedRow(kit, 'blackKey', ALL_KEYS.filter(isBlackKey), keySpec),
    ];
    this.headRow = new InstancedRow(kit, 'actions', ALL_KEYS, restHeadSpec);
    this.damperRow = new InstancedRow(kit, 'damper', ALL_KEYS.filter(hasDamper), damperSpec);
    this.detailed = buildDetailedAction(kit);
    this.casing = buildCase(kit);
    this.pedals = buildPedals(kit);
    this.inset = buildInset(kit);
    this.upright = buildUpright(kit);
    this.harpsichord = buildHarpsichord(kit);
    this.unisons = {
      bass: buildUnison(kit, 'bass'),
      middle: buildUnison(kit, 'middle'),
      treble: buildUnison(kit, 'treble'),
    };
    const interior = buildInterior(kit);
    this.moving.add(...this.keyRows.map((row) => row.mesh), this.headRow.mesh, this.damperRow.mesh);
    this.root.add(
      buildStage(kit),
      this.casing.object,
      this.pedals.object,
      interior.object,
      this.moving,
      this.detailed.object,
      this.inset,
      this.upright.object,
      this.harpsichord.object,
      ...Object.values(this.unisons),
    );
    this.named = Object.fromEntries(
      ANCHOR_IDS.map((id) => [id, anchorAt(this.root, 0, 0, 0)]),
    ) as Record<AnchorId, Object3D>;
    this.stringLabel = anchorAt(this.root, 0, 0, 0);
    this.labels = new Map<PartId, Object3D>([
      ...this.detailed.labels,
      ...interior.labels,
      ['keyboard', anchorAt(this.root, keyX(KEYS - NEIGHBOUR_KEY_STEP), KEY.top, KEY.frontZ)],
      ['actions', anchorAt(this.root, ...restHeadSpec(KEYS - NEIGHBOUR_KEY_STEP).centre)],
      [
        'case',
        anchorAt(
          this.casing.object,
          CASE.rightX,
          CASE.rimTop,
          CASE.frontZ + CASE.bentsideStartZ / 2,
        ),
      ],
      ['pedals', anchorAt(this.pedals.object, 0, LYRE.pedalY, LYRE.z + LYRE.pedalLength)],
      ['inset', anchorAt(this.inset, 0, INSET.height / 2, 0)],
      ['upright', anchorAt(this.upright.hammer, 0, UPRIGHT.shank, 0)],
      [
        'harpsichord',
        anchorAt(
          this.harpsichord.moving,
          0,
          KEY.top + HARPSICHORD.jackHeight,
          HARPSICHORD.offsetZ - HARPSICHORD.keyLength,
        ),
      ],
      ['strings', this.stringLabel],
      ['bridge', this.named.bridge],
    ]);
    this.state = state;
    this.setState(state);
  }

  setState(state: AssemblyState): void {
    this.state = state;
    const key = NOTES[state.register].key;
    const { action, view } = state;
    this.placePlayedKey(state.register, action.shiftMm);
    poseDetailedAction(this.detailed, action);
    this.damperRow.mesh.position.y = state.pedal === 'sustain' ? mm(action.damperLiftMm) : 0;
    this.pedals.right.rotation.x = state.pedal === 'sustain' ? PEDAL_PRESS_ANGLE : 0;
    this.pedals.left.rotation.x = state.pedal === 'unaCorda' ? PEDAL_PRESS_ANGLE : 0;
    this.detailed.damper.visible = hasDamper(key);
    this.poseGhosts(state);
    this.casing.leftRim.visible = !view.cutaway;
    this.inset.visible = view.inset;
    this.upright.object.visible = view.ghost || view.lineUp;
    this.harpsichord.object.visible = view.lineUp;
    this.placeAnchors(key, action);
    this.root.updateMatrixWorld(true);
  }

  update(deltaSeconds: number, _cameraDistance: number): boolean {
    this.clock += deltaSeconds;
    const { stroke, harpsichord, view } = this.state;
    const unison = this.unisons[this.state.register];
    const ringing = view.wave && stroke.stringShare > STILL_SHARE;
    const plucked = view.lineUp && harpsichord.stringShare > STILL_SHARE;
    const swing = Math.sin(FULL_TURN * VISUAL_WAVE_HZ * this.clock);
    unison.position.y = ringing ? mm(WAVE_AMPLITUDE_MM * stroke.stringShare) * swing : 0;
    this.harpsichord.string.position.y =
      HARPSICHORD.stringY + (plucked ? mm(WAVE_AMPLITUDE_MM * harpsichord.stringShare) * swing : 0);
    return ringing || plucked;
  }

  labelAnchors(): ReadonlyMap<PartId, Object3D> {
    return this.labels;
  }

  anchor(id: AnchorId): Object3D {
    return this.named[id];
  }

  region(id: RegionId): Box3 {
    const { register, view } = this.state;
    return regionFromSpec(regionSpecFor(id, NOTES[register].key, view));
  }

  chaseTarget(): ChaseTarget {
    return chaseTargetFor(NOTES[this.state.register].key, this.state.action);
  }

  warmUp(compile: (object: Object3D) => void): void {
    [this.detailed.object, this.inset, this.upright.object, this.harpsichord.object].forEach(
      compile,
    );
  }

  dispose(): void {
    this.root.removeFromParent();
    this.materials.clearRegistered();
    this.tracker.dispose();
  }

  private placePlayedKey(register: RegisterId, shiftMm: number): void {
    const key = NOTES[register].key;
    const x = playedX(key, shiftMm);
    this.keyRows.forEach((row) => row.hide(key));
    this.headRow.hide(key);
    this.damperRow.hide(key);
    this.moving.position.x = mm(shiftMm);
    this.detailed.object.position.x = x;
    this.upright.object.position.x = x;
    this.harpsichord.object.position.x = x;
    Object.entries(this.unisons).forEach(([id, unison]) => (unison.visible = id === register));
    this.unisons[register].position.x = mm(shiftMm);
  }

  private poseGhosts({ upright, harpsichord }: AssemblyState): void {
    this.upright.hammer.rotation.x = uprightHammerAngle(upright.hammerTravelMm);
    this.upright.moving.position.y = mm(upright.damperLiftMm);
    this.harpsichord.moving.position.y = mm(harpsichord.jackRiseMm);
  }

  private placeAnchors(key: number, action: ActionPose): void {
    const points: Record<AnchorId, Point> = {
      key: keyFrontTop(key, action),
      hammer: hammerHeadTop(key, action),
      jack: shifted(jackAnchor(key), mm(action.shiftMm)),
      damper: damperHeadTop(key, action),
      inset: insetCentre(key),
      bridge: restAnchorPoint('bridge', key),
      lineUp: restAnchorPoint('lineUp', key),
    };
    ANCHOR_IDS.forEach((id) => this.named[id].position.set(...points[id]));
    this.inset.position.set(...points.inset);
    const { front, back } = stringPath(key);
    this.stringLabel.position.set(...shifted(midPoint(front, back), mm(action.shiftMm)));
  }
}

export function createPlaceholderAssembly(
  resources: AssemblyResources,
  state: AssemblyState,
): Assembly {
  return new PlaceholderAssembly(resources, state);
}
