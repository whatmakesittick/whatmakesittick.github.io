import type { Steps } from '@core/scene/pacing';
import { BoxGeometry, CylinderGeometry, DoubleSide, TorusGeometry, Vector3 } from 'three';
import type { BufferGeometry, CatmullRomCurve3, Group } from 'three';
import { FULL_TURN, toRadians } from '@core/math';
import type { MaterialFinish } from '@core/scene/materials';
import {
  barBetween,
  curveThrough,
  merged,
  radialPiece,
  ringAround,
  rodBetween,
  spot,
  tubeAlong,
} from '../geometry/pipes';
import { casingAt, cowlAt, radiusCurve, turbineCasingAt } from '../geometry/profiles';
import { BLADE_ROWS } from '../geometry/rows';
import type { PartContext } from './context';
import { coreMaterial, mesh, namedGroup, STRUCTURE_GROUP } from './context';

const solid = (finish: MaterialFinish): MaterialFinish => ({
  ...finish,
  side: DoubleSide,
  forceSinglePass: true,
});

const PIPE_STEEL = solid({ color: '#c9ced3', roughness: 0.35, metalness: 0.9 });
const BOLT_STEEL = solid({ color: '#8d949b', roughness: 0.42, metalness: 0.9 });
const HARNESS = solid({ color: '#2a2e34', roughness: 0.92, metalness: 0.05 });
const ANODISED_BLUE = solid({ color: '#3f6d9a', roughness: 0.36, metalness: 0.8 });
const ANODISED_GOLD = solid({ color: '#c4a050', roughness: 0.34, metalness: 0.85 });

const WALL = { compressor: 0.04, combustor: 0.035, hpt: 0.05, lpt: 0.035 } as const;
const COMPRESSOR_END = 0.15;
const HPT_FROM = 0.72;
const LPT_FROM = 1.05;
const COMBUSTOR_CASE = radiusCurve([
  [0.15, 0.565],
  [0.2, 0.66],
  [0.27, 0.79],
  [0.45, 0.8],
  [0.62, 0.79],
  [0.72, 0.695],
]);
const COWL_CLEARANCE = 0.075;
const ROUND = 12;
const PIPE_RADIAL = 8;
const HEX = 6;

function skinAt(x: number): number {
  if (x < COMPRESSOR_END) return casingAt(x) + WALL.compressor;
  if (x < HPT_FROM) return COMBUSTOR_CASE(x) + WALL.combustor;
  return turbineCasingAt(x) + (x < LPT_FROM ? WALL.hpt : WALL.lpt);
}

function ceilingAt(x: number): number {
  return cowlAt(x) - COWL_CLEARANCE;
}

function stators(): readonly { x: number }[] {
  return BLADE_ROWS.filter((row) => row.part === 'compressorStator').map((row) => ({
    x: (row.from + row.to) / 2,
  }));
}

interface Kit {
  readonly steel: BufferGeometry[];
  readonly bolts: BufferGeometry[];
  readonly harness: BufferGeometry[];
  readonly blue: BufferGeometry[];
  readonly gold: BufferGeometry[];
}

function createKit(): Kit {
  return { steel: [], bolts: [], harness: [], blue: [], gold: [] };
}

function alongAxis(geometry: BufferGeometry, at: Vector3): BufferGeometry {
  geometry.rotateZ(-Math.PI / 2);
  return geometry.translate(at.x, at.y, at.z);
}

function drum(radius: number, length: number, at: Vector3): BufferGeometry {
  return alongAxis(new CylinderGeometry(radius, radius, length, ROUND, 1), at);
}

const FLANGE_RINGS = [0.17, 0.72, 1.03] as const;
const FLANGES = [-1.1, -0.62, -0.18, 0.1, 1.06, 1.45, 1.8, 2.12] as const;
const BOLT = { radius: 0.012, height: 0.01, count: 64, lift: 0.022, offset: 0.016 } as const;
const FLANGE_RING = { tube: 0.017, lift: 0.012, offset: 0.019, segments: 64 } as const;

function boltRing(kit: Kit, x: number, radius: number): void {
  const template = alongAxis(
    new CylinderGeometry(BOLT.radius, BOLT.radius, BOLT.height, HEX, 1),
    new Vector3(x, radius, 0),
  );
  for (let index = 0; index < BOLT.count; index += 1) {
    kit.bolts.push(template.clone().rotateX((FULL_TURN * index) / BOLT.count));
  }
  template.dispose();
}

function flangeRing(kit: Kit, x: number): void {
  const ring = new TorusGeometry(
    skinAt(x) + FLANGE_RING.lift,
    FLANGE_RING.tube,
    HEX,
    FLANGE_RING.segments,
  );
  ring.rotateY(Math.PI / 2);
  kit.steel.push(ring.translate(x, 0, 0));
}

function addFlanges(kit: Kit): void {
  FLANGE_RINGS.forEach((x) => {
    flangeRing(kit, x);
    boltRing(kit, x + FLANGE_RING.offset + BOLT.height / 2, skinAt(x) + FLANGE_RING.lift);
  });
  FLANGES.forEach((x) => boltRing(kit, x + BOLT.offset, skinAt(x) + BOLT.lift));
}

const VSV = {
  rings: 4,
  vanes: 36,
  ringLift: 0.07,
  boss: { radius: 0.007, height: 0.035 },
  lever: 0.008,
  slip: 0.018,
  clevis: [0.02, 0.016, 0.014],
  link: { lift: 0.045, tube: 0.007, tie: 0.005 },
  crank: [0.07, 0.07, 0.012],
  crankGap: 0.035,
  actuator: { radius: 0.024, length: 0.16, rod: 0.008, stroke: 0.06, rise: 0.02, foot: 0.005 },
  angles: [132, 150],
} as const;

interface VsvRing {
  x: number;
  base: number;
  ring: number;
}

function vsvRings(): VsvRing[] {
  return stators()
    .slice(0, VSV.rings)
    .map(({ x }) => {
      const base = casingAt(x) + WALL.compressor;
      return { x, base, ring: base + VSV.ringLift };
    });
}

function vsvLevers(kit: Kit, { x, base, ring }: VsvRing): void {
  const slip = VSV.slip / ring;
  const stem = base + VSV.boss.height;
  for (let index = 0; index < VSV.vanes; index += 1) {
    const angle = (FULL_TURN * index) / VSV.vanes;
    kit.steel.push(
      radialPiece(
        new CylinderGeometry(VSV.boss.radius, VSV.boss.radius, VSV.boss.height, HEX, 1),
        x,
        base + VSV.boss.height / 2,
        angle,
      ),
      barBetween(spot(x, stem, angle), spot(x, ring, angle + slip), VSV.lever),
      radialPiece(new BoxGeometry(...VSV.clevis), x, ring, angle + slip),
    );
  }
}

function vsvActuator(kit: Kit, rings: readonly VsvRing[], angle: number): void {
  const theta = toRadians(angle);
  const { link, crank, crankGap, actuator } = VSV;
  kit.steel.push(
    tubeAlong(
      rings.map(({ x, ring }) => spot(x, ring + link.lift, theta)),
      link.tube,
    ),
  );
  rings.forEach(({ x, ring }) =>
    kit.steel.push(rodBetween(spot(x, ring, theta), spot(x, ring + link.lift, theta), link.tie)),
  );
  const crankX = rings[0].x - crankGap;
  const crankRadius = rings[0].ring + link.lift;
  kit.gold.push(radialPiece(new BoxGeometry(...crank), crankX, crankRadius, theta));
  const rodEnd = crankX - actuator.rise / 2;
  const bodyEnd = rodEnd - actuator.stroke;
  const tail = bodyEnd - actuator.length;
  const bodyRadius = crankRadius;
  kit.blue.push(
    drum(actuator.radius, actuator.length, spot(bodyEnd - actuator.length / 2, bodyRadius, theta)),
  );
  kit.steel.push(
    rodBetween(spot(bodyEnd, bodyRadius, theta), spot(rodEnd, crankRadius, theta), actuator.rod),
    rodBetween(spot(tail, bodyRadius, theta), spot(tail, skinAt(tail), theta), actuator.foot),
  );
}

function addVsv(kit: Kit): void {
  const rings = vsvRings();
  rings.forEach((ring) => vsvLevers(kit, ring));
  VSV.angles.forEach((angle) => vsvActuator(kit, rings, angle));
}

const BLEED = {
  pipe: 0.026,
  valve: { radius: 0.045, length: 0.17, flange: 0.062, flangeThickness: 0.012 },
  box: [0.08, 0.05, 0.06],
  stem: 0.012,
  cap: { radius: 0.05, thickness: 0.01 },
  ports: [
    { row: 3, angle: 120 },
    { row: 6, angle: 160 },
  ],
  valveDistance: 0.3,
  valveLift: 0.2,
  turn: 0.03,
} as const;

function bleedValve(kit: Kit, x: number, radius: number, theta: number): void {
  const { valve, box, stem } = BLEED;
  const at = (dx: number, r: number) => spot(x + dx, r, theta);
  kit.blue.push(drum(valve.radius, valve.length, at(valve.length / 2, radius)));
  [0, valve.length].forEach((dx) =>
    kit.steel.push(drum(valve.flange, valve.flangeThickness, at(dx, radius))),
  );
  const top = radius + valve.radius;
  kit.steel.push(rodBetween(at(valve.length / 2, top), at(valve.length / 2, top + 0.03), stem));
  kit.gold.push(
    radialPiece(new BoxGeometry(...box), x + valve.length / 2, top + 0.03 + box[1] / 2, theta),
  );
}

function bleedDuct(kit: Kit, rowIndex: number, angle: number): void {
  const { x } = stators()[rowIndex];
  const theta = toRadians(angle);
  const base = casingAt(x) + WALL.compressor;
  const valveX = x + BLEED.valveDistance;
  const valveRadius = casingAt(valveX) + WALL.compressor + BLEED.valveLift;
  const turned = theta + BLEED.turn;
  kit.steel.push(
    tubeAlong(
      [
        spot(x, base - 0.005, theta),
        spot(x, base + 0.08, theta),
        spot(x + 0.09, base + 0.16, theta + BLEED.turn / 2),
        spot(valveX, valveRadius, turned),
      ],
      BLEED.pipe,
      PIPE_RADIAL,
    ),
  );
  bleedValve(kit, valveX, valveRadius, turned);
  const outX = valveX + BLEED.valve.length;
  const endX = outX + 0.16;
  kit.steel.push(
    tubeAlong(
      [
        spot(outX, valveRadius, turned),
        spot(outX + 0.06, valveRadius + 0.04, turned),
        spot(endX, ceilingAt(endX) - 0.12, turned),
        spot(endX, ceilingAt(endX), turned),
      ],
      BLEED.pipe,
      PIPE_RADIAL,
    ),
  );
  kit.blue.push(
    radialPiece(
      new CylinderGeometry(BLEED.cap.radius, BLEED.cap.radius, BLEED.cap.thickness, ROUND, 1),
      endX,
      ceilingAt(endX),
      turned,
    ),
  );
}

function addBleeds(kit: Kit): void {
  BLEED.ports.forEach(({ row, angle }) => bleedDuct(kit, row, angle));
}

function clampOn(
  kit: Kit,
  curve: CatmullRomCurve3,
  at: number,
  radius: number,
  tube: number,
): void {
  kit.steel.push(ringAround(curve.getPointAt(at), curve.getTangentAt(at), radius, tube));
}

function standOff(kit: Kit, point: Vector3, radius: number): void {
  const out = Math.hypot(point.y, point.z);
  const skin = skinAt(point.x);
  const anchor = new Vector3(point.x, (point.y * skin) / out, (point.z * skin) / out);
  kit.steel.push(rodBetween(point, anchor, radius));
}

const MANIFOLD = { x: 0.25, radius: 0.875, tube: 0.02 } as const;
const FUEL = {
  tube: 0.014,
  angle: 148,
  clamp: 0.021,
  clampTube: 0.005,
  clamps: [0.4, 0.75],
  stand: 0.004,
  fitting: { radius: 0.024, length: 0.06 },
  path: [
    [0.25, 0.89, 148],
    [0.23, 0.97, 150],
    [0.0, 1.0, 154],
    [-0.35, 0.98, 158],
    [-0.65, 0.9, 162],
    [-0.8, 0.82, 164],
  ],
} as const;

function addFuelLine(kit: Kit): void {
  const curve = curveThrough(FUEL.path.map(([x, r, a]) => spot(x, r, toRadians(a))));
  kit.steel.push(tubeAlong(curve, FUEL.tube, PIPE_RADIAL, 10));
  FUEL.clamps.forEach((at) => {
    clampOn(kit, curve, at, FUEL.clamp, FUEL.clampTube);
    standOff(kit, curve.getPointAt(at), FUEL.stand);
  });
  const end = FUEL.path[FUEL.path.length - 1];
  kit.blue.push(
    drum(FUEL.fitting.radius, FUEL.fitting.length, spot(end[0] - 0.01, end[1], toRadians(end[2]))),
  );
  kit.steel.push(
    drum(
      MANIFOLD.tube * 1.5,
      FUEL.clamp,
      spot(MANIFOLD.x, MANIFOLD.radius + MANIFOLD.tube, toRadians(FUEL.angle)),
    ),
  );
}

const IGNITER = {
  x: 0.4,
  plug: 0.021,
  plugHeight: 0.055,
  nut: 0.03,
  nutHeight: 0.014,
  lead: 0.007,
  angles: [136, 160],
  box: { x: -0.1, radius: 0.77, size: [0.11, 0.05, 0.075], angle: 148, post: 0.01 },
} as const;

function igniterLead(kit: Kit, angle: number): void {
  const theta = toRadians(angle);
  const skin = skinAt(IGNITER.x);
  const top = skin + IGNITER.plugHeight;
  kit.blue.push(
    radialPiece(
      new CylinderGeometry(IGNITER.plug, IGNITER.plug, IGNITER.plugHeight, HEX, 1),
      IGNITER.x,
      skin + IGNITER.plugHeight / 2,
      theta,
    ),
  );
  kit.steel.push(
    radialPiece(
      new CylinderGeometry(IGNITER.nut, IGNITER.nut, IGNITER.nutHeight, HEX, 1),
      IGNITER.x,
      skin + IGNITER.nutHeight / 2,
      theta,
    ),
  );
  const { box } = IGNITER;
  const boxTheta = toRadians(box.angle);
  kit.harness.push(
    tubeAlong(
      [
        spot(IGNITER.x, top, theta),
        spot(IGNITER.x - 0.01, top + 0.06, theta),
        spot(0.3, 0.95, theta),
        spot(0.1, 0.94, (theta + boxTheta) / 2),
        spot(box.x + 0.05, 0.84, boxTheta + (theta - boxTheta) * 0.4),
        spot(box.x + box.size[0] / 2 + 0.005, box.radius, boxTheta + (theta - boxTheta) * 0.3),
      ],
      IGNITER.lead,
      HEX,
      8,
    ),
  );
}

function addIgniters(kit: Kit): void {
  IGNITER.angles.forEach((angle) => igniterLead(kit, angle));
  const { box } = IGNITER;
  const theta = toRadians(box.angle);
  kit.gold.push(radialPiece(new BoxGeometry(...box.size), box.x, box.radius, theta));
  kit.steel.push(
    rodBetween(spot(box.x, box.radius, theta), spot(box.x, skinAt(box.x), theta), box.post),
  );
}

const COOLING = {
  tube: 0.012,
  lift: 0.045,
  drops: 12,
  drop: 0.005,
  supply: 0.016,
  branch: 0.008,
  angle: 126,
  rings: [0.88, 1.28, 1.62],
  segments: 64,
  clearance: 0.045,
} as const;

function coolingRing(kit: Kit, x: number): void {
  const radius = skinAt(x) + COOLING.lift;
  const ring = new TorusGeometry(radius, COOLING.tube, HEX, COOLING.segments);
  ring.rotateY(Math.PI / 2);
  kit.steel.push(ring.translate(x, 0, 0));
  for (let index = 0; index < COOLING.drops; index += 1) {
    const angle = (FULL_TURN * index) / COOLING.drops;
    kit.steel.push(rodBetween(spot(x, skinAt(x), angle), spot(x, radius, angle), COOLING.drop, 5));
  }
}

function addCooling(kit: Kit): void {
  const theta = toRadians(COOLING.angle);
  const feed = (x: number) => skinAt(x) + COOLING.lift + COOLING.clearance;
  const [first, ...rest] = COOLING.rings;
  kit.steel.push(
    tubeAlong(
      [
        spot(0, skinAt(0), theta),
        spot(0, 0.78, theta),
        spot(0.12, 0.93, theta),
        spot(0.3, 0.95, theta),
        spot(0.6, 0.9, theta),
        spot(first, feed(first), theta),
        ...rest.map((x) => spot(x, feed(x), theta)),
      ],
      COOLING.supply,
      PIPE_RADIAL,
      10,
    ),
  );
  COOLING.rings.forEach((x) => {
    coolingRing(kit, x);
    kit.steel.push(
      rodBetween(spot(x, feed(x), theta), spot(x, skinAt(x) + COOLING.lift, theta), COOLING.branch),
    );
  });
}

const RUN = {
  from: -1.0,
  to: 2.0,
  step: 0.15,
  tube: 0.013,
  lift: 0.095,
  sway: 0.012,
  clampEvery: 0.25,
  clamp: 0.017,
  clampTube: 0.0045,
  stand: 0.004,
  angles: [124, 138, 152, 166],
} as const;

function harnessRun(kit: Kit, angle: number, phase: number): void {
  const points: Vector3[] = [];
  const count = Math.round((RUN.to - RUN.from) / RUN.step);
  for (let index = 0; index <= count; index += 1) {
    const x = RUN.from + index * RUN.step;
    const theta = toRadians(angle) + Math.sin(index * 0.9 + phase) * RUN.sway;
    points.push(spot(x, skinAt(x) + RUN.lift, theta));
  }
  const curve = curveThrough(points);
  kit.harness.push(tubeAlong(curve, RUN.tube, HEX, 8));
  const clamps = Math.floor((RUN.to - RUN.from) / RUN.clampEvery);
  for (let index = 1; index <= clamps; index += 1) {
    const at = (index * RUN.clampEvery) / (RUN.to - RUN.from);
    clampOn(kit, curve, at, RUN.clamp, RUN.clampTube);
    standOff(kit, curve.getPointAt(at), RUN.stand);
  }
}

function addHarness(kit: Kit): void {
  RUN.angles.forEach((angle, index) => harnessRun(kit, angle, index * 1.7));
}

const BUCKETS: readonly (readonly [keyof Kit, MaterialFinish])[] = [
  ['steel', PIPE_STEEL],
  ['bolts', BOLT_STEEL],
  ['harness', HARNESS],
  ['blue', ANODISED_BLUE],
  ['gold', ANODISED_GOLD],
];

export function* buildDressing(context: PartContext, engine: Group): Steps<Group> {
  const group = namedGroup('dressing', engine);
  const kit = createKit();
  const stages = [addFlanges, addVsv, addBleeds, addFuelLine, addIgniters, addCooling, addHarness];
  for (const stage of stages) {
    stage(kit);
    yield;
  }
  for (const [bucket, finish] of BUCKETS) {
    if (kit[bucket].length === 0) continue;
    mesh(context, group, merged(kit[bucket]), coreMaterial(context, STRUCTURE_GROUP, finish));
    yield;
  }
  return group;
}
