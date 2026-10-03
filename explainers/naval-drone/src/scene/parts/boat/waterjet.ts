import {
  DoubleSide,
  Group,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Quaternion,
  RingGeometry,
  Vector3,
} from 'three';
import type { BufferGeometry, Object3D } from 'three';
import { lerp } from '@core/math';
import { anchorAt } from '@core/scene/parts';
import type { PartId } from '../../../ids';
import { IMPELLER, JET } from '../../../model/layout';
import { JET_SHAPE } from '../../constants';
import { FINISHES, PAINT } from '../../finishes';
import { spread } from '../../geometry/curves';
import { flatPolygon } from '../../geometry/flat';
import { bottomYAt } from '../../geometry/hullLines';
import type { Pair } from '../../geometry/hullLines';
import { thickSheet, turned, turnedCaps } from '../../geometry/sheet';
import type { Arc, ProfilePoint } from '../../geometry/sheet';
import { boxAt, rod } from '../../geometry/solids';
import { gridSurface, orientFrom } from '../../geometry/surface';
import type { Vec3 } from '../../geometry/surface';
import { instanced, mergeParts, partMesh, registered } from '../context';
import type { PartContext } from '../context';
import type { CutawaySwitch } from './cutaway';

export interface Waterjet {
  object: Group;
  impeller: Group;
  blur: Mesh;
  steering: Group;
  bucket: Group;
  stern: Object3D;
  labels: ReadonlyMap<PartId, Object3D>;
  flowPath: readonly Vec3[];
}

const QUARTER_TURN = Math.PI / 2;
const FULL_TURN = Math.PI * 2;
const AXIS = JET.axisY;
const BOLT_SIDES = 6;

function sgnPow(value: number, exponent: number): number {
  return Math.sign(value) * Math.abs(value) ** exponent;
}

function atAxis(geometry: BufferGeometry): BufferGeometry {
  geometry.translate(0, AXIS, 0);
  return geometry;
}

function housingProfile(): ProfilePoint[] {
  const { ringRadius, flange, bowl, aftFace } = JET_SHAPE.housing;
  const [aftX] = JET.housing.x;
  const [, foreX] = JET.housing.x;
  const bowlPoints = [...bowl]
    .reverse()
    .map(([x, r], index): ProfilePoint => [x, r, index > 0 && index < bowl.length - 1]);
  return [
    [aftX, aftFace],
    ...bowlPoints,
    [flange.aft, flange.radius],
    [JET.stator.x[1], flange.radius],
    [JET.stator.x[1], ringRadius],
    [foreX, ringRadius],
    [foreX, JET_SHAPE.bore],
    [aftX, JET_SHAPE.bore],
    [aftX, aftFace],
  ];
}

function nozzleProfile(): ProfilePoint[] {
  const [exitX, inletX] = JET.nozzle.x;
  const wall = JET_SHAPE.nozzle.wall;
  const inlet = JET.nozzle.inletDiameter / 2;
  const exit = JET.nozzle.exitDiameter / 2;
  return [
    [exitX, exit],
    [inletX, inlet],
    [inletX, inlet - wall],
    [exitX, exit - wall],
    [exitX, exit],
  ];
}

function steeringProfile(): ProfilePoint[] {
  const { outer, inner, sleeve, sleeveLength } = JET_SHAPE.steering;
  const length = JET.steeringNozzle.x[1] - JET.steeringNozzle.x[0];
  return [
    [-length, outer],
    [0, outer],
    [0, sleeve],
    [sleeveLength, sleeve],
    [sleeveLength, inner + JET_SHAPE.nozzle.wall / 2],
    [-length, inner],
    [-length, outer],
  ];
}

function halves(
  context: PartContext,
  cutaway: CutawaySwitch,
  profile: readonly ProfilePoint[],
  group: PartId,
  parent: Group,
): void {
  const piece = (arc: Arc) => atAxis(turned(profile, JET_SHAPE.segments / 2, arc));
  parent.add(
    partMesh(context, piece('starboard'), group, FINISHES.jetBlack),
    cutaway.whole(partMesh(context, piece('port'), group, FINISHES.jetBlack)),
    cutaway.opened(partMesh(context, atAxis(turnedCaps(profile)), group, FINISHES.section)),
  );
}

function flangeBolts(context: PartContext): Mesh {
  const { flange } = JET_SHAPE.housing;
  const head = rod('x', flange.bolt, flange.boltHead, [0, 0, 0], BOLT_SIDES);
  const matrices = spread(0, FULL_TURN, flange.bolts)
    .slice(0, -1)
    .map((angle) =>
      new Matrix4().makeTranslation(
        flange.aft - flange.boltHead / 2,
        AXIS + flange.boltRadius * Math.sin(angle),
        flange.boltRadius * Math.cos(angle),
      ),
    );
  return instanced(context, head, 'waterjet', FINISHES.steel, matrices);
}

function bladeGrid(index: number): Vec3[][] {
  const { lead, chord, wrap, sweep, clearance, radial, along } = JET_SHAPE.impeller;
  const hub = IMPELLER.hubRadius;
  const tip = IMPELLER.diameter / 2 - clearance;
  const base = (index / IMPELLER.blades) * FULL_TURN;
  return spread(hub * 0.92, tip, radial).map((radius) => {
    const share = (radius - hub) / (tip - hub);
    const trim = Math.max(share, 0) ** 2 * 0.22;
    return spread(trim, 1, along).map((s): Vec3 => {
      const angle = base + sweep * Math.max(share, 0) + s * wrap;
      return [lead - s * chord, -radius * Math.sin(angle), radius * Math.cos(angle)];
    });
  });
}

function impeller(context: PartContext): { group: Group; blur: Mesh } {
  const hubProfile: ProfilePoint[] = [
    [JET_SHAPE.impeller.hub[JET_SHAPE.impeller.hub.length - 1][0], 0],
    ...[...JET_SHAPE.impeller.hub].reverse().map(([x, r]): ProfilePoint => [x, r, true]),
    [JET_SHAPE.impeller.hub[0][0], 0],
  ];
  const hub = turned(hubProfile, JET_SHAPE.segments);
  const blades = Array.from({ length: IMPELLER.blades }, (_, index) =>
    thickSheet(bladeGrid(index), JET_SHAPE.impeller.thickness),
  );
  const group = new Group();
  group.position.set(0, AXIS, 0);
  group.add(partMesh(context, mergeParts([hub, ...blades]), 'impeller', FINISHES.steelTwoSided));
  const disc = new RingGeometry(IMPELLER.hubRadius, IMPELLER.diameter / 2, JET_SHAPE.segments);
  disc.rotateY(QUARTER_TURN);
  disc.translate(IMPELLER.x, AXIS, 0);
  const blurMaterial = registered(
    context,
    'impeller',
    new MeshStandardMaterial({
      color: PAINT.steel,
      metalness: 0.8,
      roughness: 0.35,
      transparent: true,
      opacity: JET_SHAPE.impeller.blurOpacity,
      depthWrite: false,
      side: DoubleSide,
    }),
  );
  const blur = new Mesh(context.tracker.track(disc), blurMaterial);
  blur.visible = false;
  return { group, blur };
}

function stator(context: PartContext): Mesh {
  const { cone, lead, trail, curl, thickness, radial, along } = JET_SHAPE.stator;
  const coneProfile: ProfilePoint[] = [
    [cone[cone.length - 1][0], 0],
    ...[...cone].reverse().map(([x, r]): ProfilePoint => [x, r, true]),
    [cone[0][0], 0],
  ];
  const coneRadius = (x: number) => {
    const index = cone.findIndex(([at]) => at <= x);
    if (index <= 0) return cone[0][1];
    const [a, b] = [cone[index - 1], cone[index]];
    return lerp(a[1], b[1], (x - a[0]) / (b[0] - a[0]));
  };
  const vanes = Array.from({ length: IMPELLER.statorVanes }, (_, index) => {
    const base = (index / IMPELLER.statorVanes) * FULL_TURN;
    const grid = spread(0, 1, radial).map((share) =>
      spread(0, 1, along).map((s): Vec3 => {
        const x = lerp(lead, trail, s);
        const radius = lerp(coneRadius(x) * 0.95, JET_SHAPE.bore - 0.001, share);
        const angle = base + curl * (1 - s) ** 2;
        return [x, AXIS - radius * Math.sin(angle), radius * Math.cos(angle)];
      }),
    );
    return thickSheet(grid, thickness);
  });
  return partMesh(
    context,
    mergeParts([atAxis(turned(coneProfile, JET_SHAPE.segments / 2)), ...vanes]),
    'stator',
    FINISHES.stator,
  );
}

function grate(context: PartContext): Mesh {
  const { width, height } = JET_SHAPE.grate;
  const [aft, fore] = JET.intake.x;
  const half = JET.intake.halfWidth;
  const middle = (aft + fore) / 2;
  const bars = spread(-half * 0.8, half * 0.8, JET.intake.bars - 1).map((z) =>
    boxAt([fore - aft, height, width], [middle, bottomYAt(middle, z) + height / 2, z]),
  );
  return partMesh(context, mergeParts(bars), 'intake', FINISHES.steel);
}

function bezier(a: Vec3, b: Vec3, c: Vec3, d: Vec3, t: number): Vec3 {
  const u = 1 - t;
  const w = [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t];
  return [0, 1, 2].map(
    (axis) => w[0] * a[axis] + w[1] * b[axis] + w[2] * c[axis] + w[3] * d[axis],
  ) as unknown as Vec3;
}

function ductPoint(theta: number, t: number, grow: number): Vec3 {
  const { squareness, entry, pull } = JET_SHAPE.duct;
  const [aft, fore] = JET.intake.x;
  const middle = (aft + fore) / 2;
  const s = Math.sin(theta);
  const c = Math.cos(theta);
  const z = (JET.intake.halfWidth + grow) * sgnPow(s, squareness);
  const x = middle + ((fore - aft) / 2 + grow) * sgnPow(c, squareness);
  const start: Vec3 = [x, bottomYAt(x, z), z];
  const radius = JET.duct.innerDiameter / 2 + grow;
  const end: Vec3 = [JET.duct.endX, AXIS + radius * c, radius * s];
  const span = Math.hypot(end[0] - start[0], end[1] - start[1], end[2] - start[2]);
  const slope = lerp(entry[0], entry[1], (1 - c) / 2);
  const length = Math.hypot(1, slope);
  const lift: Vec3 = [
    start[0] - (span * pull[0]) / length,
    start[1] + (span * pull[0] * slope) / length,
    start[2],
  ];
  const ease: Vec3 = [end[0] + span * pull[1], end[1], end[2]];
  return bezier(start, lift, ease, end, t);
}

function ductSurface(from: number, to: number, grow: number): BufferGeometry {
  const { rings, around } = JET_SHAPE.duct;
  const thetas = spread(from, to, around / 2);
  const rows = thetas.map((theta) => spread(0, 1, rings).map((t) => ductPoint(theta, t, grow)));
  return gridSurface(rows);
}

function ductCut(theta: number): BufferGeometry {
  const { rings, wall } = JET_SHAPE.duct;
  const ts = spread(0, 1, rings);
  const inner = ts.map((t): Pair => {
    const [x, y] = ductPoint(theta, t, 0);
    return [x, y];
  });
  const outer = ts.map((t): Pair => {
    const [x, y] = ductPoint(theta, t, wall);
    return [x, y];
  });
  return flatPolygon([...inner, ...outer.reverse()], (a, b) => [a, b, 0]);
}

function duct(context: PartContext, cutaway: CutawaySwitch): Group {
  const wall = JET_SHAPE.duct.wall;
  const group = new Group();
  const half = (from: number, to: number) => ({
    inner: ductSurface(from, to, 0),
    outer: ductSurface(from, to, wall),
  });
  const starboard = half(0, Math.PI);
  const port = half(Math.PI, FULL_TURN);
  group.add(
    partMesh(context, starboard.inner, 'duct', FINISHES.jetInside),
    partMesh(context, starboard.outer, 'duct', FINISHES.inner),
    cutaway.whole(partMesh(context, port.inner, 'duct', FINISHES.jetInside)),
    cutaway.whole(partMesh(context, port.outer, 'duct', FINISHES.inner)),
    cutaway.opened(
      partMesh(context, mergeParts([ductCut(0), ductCut(Math.PI)]), 'duct', FINISHES.section),
    ),
  );
  return group;
}

export function ductCentreline(): Vec3[] {
  const thetas = spread(0, FULL_TURN, JET_SHAPE.duct.around).slice(0, -1);
  return spread(0, 1, JET_SHAPE.duct.rings).map((t) => {
    const points = thetas.map((theta) => ductPoint(theta, t, 0));
    return [0, 1, 2].map(
      (axis) => points.reduce((sum, point) => sum + point[axis], 0) / points.length,
    ) as unknown as Vec3;
  });
}

function shaft(context: PartContext): Mesh {
  const { collar, collarLength, coupler, couplerLength } = JET_SHAPE.shaft;
  const [from, to] = JET.shaft.x;
  const along = (radius: number, length: number, centre: number) =>
    rod('x', radius, length, [centre, AXIS, 0]);
  return partMesh(
    context,
    mergeParts([
      along(JET.shaft.radius, to - from, (from + to) / 2),
      along(collar, collarLength, JET.shaft.entryX),
      along(coupler, couplerLength, to - couplerLength / 2),
    ]),
    'driveShaft',
    FINISHES.steel,
  );
}

function steering(context: PartContext): { group: Group; stern: Object3D } {
  const { sleeve, pin, arm } = JET_SHAPE.steering;
  const group = new Group();
  group.position.set(JET.steeringNozzle.pivotX, AXIS, 0);
  const pins = [-1, 1].map((side) =>
    rod('y', pin.radius, pin.height, [0, side * (sleeve + pin.height / 2), 0]),
  );
  const lever = boxAt(
    [arm.width, arm.thickness, arm.length],
    [0, sleeve + pin.height - arm.thickness / 2, arm.length / 2],
  );
  const knob = rod('y', arm.ball, arm.thickness * 2, [0, sleeve + pin.height, arm.length]);
  group.add(
    partMesh(
      context,
      turned(steeringProfile(), JET_SHAPE.segments),
      'steeringNozzle',
      FINISHES.jetBlack,
    ),
    partMesh(context, mergeParts([...pins, lever, knob]), 'steeringNozzle', FINISHES.steel),
  );
  const stern = new Group();
  stern.position.set(JET.steeringNozzle.x[0] - JET.steeringNozzle.pivotX, 0, 0);
  group.add(stern);
  return { group, stern };
}

function barBetween(from: Vec3, to: Vec3, width: number, thickness: number): BufferGeometry {
  const start = new Vector3(...from);
  const direction = new Vector3(...to).sub(start);
  const bar = boxAt([direction.length(), width, thickness], [0, 0, 0]);
  bar.applyQuaternion(
    new Quaternion().setFromUnitVectors(new Vector3(1, 0, 0), direction.clone().normalize()),
  );
  bar.translate(...start.add(direction.multiplyScalar(0.5)).toArray());
  return bar;
}

function bucket(context: PartContext): { group: Group; brackets: Mesh } {
  const { radius, arc, centre, thickness, arm, boss, bracket, samples } = JET_SHAPE.bucket;
  const [pivotX, pivotY] = JET.bucket.pivot;
  const halfWidth = JET.bucket.width / 2;
  const cx = centre[0] - pivotX;
  const cy = centre[1] - pivotY;
  const hood = thickSheet(
    spread(-halfWidth, halfWidth, samples[1]).map((z) =>
      spread(arc[0], arc[1], samples[0]).map((angle): Vec3 => [
        cx + radius * Math.cos(angle),
        cy + radius * Math.sin(angle),
        z,
      ]),
    ),
    thickness,
  );
  const splitterArc = spread(arc[0] + 0.5, arc[1] - 0.25, samples[0]).map((angle): Pair => [
    cx + radius * 0.97 * Math.cos(angle),
    cy + radius * 0.97 * Math.sin(angle),
  ]);
  const splitter = flatPolygon([[cx + radius * 0.35, cy], ...splitterArc], (a, b) => [a, b, 0]);
  const armEnd = (side: number): Vec3 => [
    cx + radius * Math.cos(arc[0] + 0.45),
    cy + radius * Math.sin(arc[0] + 0.45),
    side * (halfWidth + arm.thickness / 2),
  ];
  const arms = [-1, 1].map((side) =>
    barBetween(
      [0, 0, side * (halfWidth + arm.thickness / 2)],
      armEnd(side),
      arm.width,
      arm.thickness,
    ),
  );
  const pin = rod('z', boss, JET.bucket.width + 4 * arm.thickness, [0, 0, 0]);
  const group = new Group();
  group.position.set(pivotX, pivotY, 0);
  group.add(
    partMesh(context, mergeParts([hood, splitter]), 'reverseBucket', FINISHES.jetTwoSided),
    partMesh(context, mergeParts([...arms, pin]), 'reverseBucket', FINISHES.steel),
  );
  const plate = (side: number) => {
    const outline: Pair[] = [
      [bracket.x[1], AXIS + JET_SHAPE.housing.aftFace * 0.4],
      [bracket.x[1], bracket.bottom],
      [bracket.x[0], bracket.bottom],
      [pivotX - boss, pivotY + boss],
      [pivotX + boss, pivotY + boss],
    ];
    const z = side * (halfWidth + 2.5 * arm.thickness);
    return mergeParts(
      [-1, 1].map((face) =>
        orientFrom(
          flatPolygon(outline, (a, b) => [a, b, z + (face * bracket.thickness) / 2]),
          [pivotX, pivotY, z - face],
        ),
      ),
    );
  };
  const brackets = partMesh(
    context,
    mergeParts([plate(-1), plate(1)]),
    'reverseBucket',
    FINISHES.jetTwoSided,
  );
  return { group, brackets };
}

function labelSpots(
  object: Group,
  steeringGroup: Group,
  bucketGroup: Group,
): Map<PartId, Object3D> {
  const at = anchorAt;
  const middle = ([a, b]: readonly [number, number]) => (a + b) / 2;
  const [pivotX, pivotY] = JET.bucket.pivot;
  const [cx, cy] = JET_SHAPE.bucket.centre;
  return new Map<PartId, Object3D>([
    ['intake', at(object, middle(JET.intake.x), JET.intake.y, 0)],
    ['duct', at(object, (JET.intake.x[0] + JET.duct.endX) / 2, (JET.intake.y + AXIS) / 2, 0)],
    ['driveShaft', at(object, middle(JET.shaft.x), AXIS, 0)],
    ['impeller', at(object, IMPELLER.x, AXIS, 0)],
    ['waterjet', at(object, middle(JET.housing.x), AXIS + JET_SHAPE.housing.ringRadius, 0)],
    ['stator', at(object, middle(JET.stator.x), AXIS, 0)],
    ['nozzle', at(object, middle(JET.nozzle.x), AXIS, 0)],
    [
      'steeringNozzle',
      at(steeringGroup, middle(JET.steeringNozzle.x) - JET.steeringNozzle.pivotX, 0, 0),
    ],
    ['reverseBucket', at(bucketGroup, cx - pivotX, cy - pivotY + JET_SHAPE.bucket.radius, 0)],
  ]);
}

export function buildWaterjet(context: PartContext, cutaway: CutawaySwitch): Waterjet {
  const object = new Group();
  halves(context, cutaway, housingProfile(), 'waterjet', object);
  halves(context, cutaway, nozzleProfile(), 'nozzle', object);
  const spinner = impeller(context);
  const steer = steering(context);
  const hood = bucket(context);
  object.add(
    flangeBolts(context),
    spinner.group,
    spinner.blur,
    stator(context),
    grate(context),
    duct(context, cutaway),
    shaft(context),
    steer.group,
    hood.group,
    hood.brackets,
  );
  const centreline = ductCentreline();
  const exit = JET.steeringNozzle.x[0];
  return {
    object,
    impeller: spinner.group,
    blur: spinner.blur,
    steering: steer.group,
    bucket: hood.group,
    stern: steer.stern,
    labels: labelSpots(object, steer.group, hood.group),
    flowPath: [...centreline, [IMPELLER.x, AXIS, 0], [JET.stator.x[0], AXIS, 0], [exit, AXIS, 0]],
  };
}
