import type { Figure } from './figure';
import {
  add,
  angleBetween,
  apply,
  applyTransposed,
  cross,
  dot,
  frame,
  fromQuaternion,
  length,
  midpoint,
  mixAngle,
  mul,
  normalize,
  rotX,
  rotZ,
  rotationVector,
  fromAxisAngle,
  scale,
  share,
  shortestArc,
  smooth,
  sub,
  toEuler,
  toEulerNear,
  transpose,
  wrap,
} from './rotations';
import type { Mat, Vec } from './rotations';

export interface Point {
  x: number;
  y: number;
  z: number;
}

export interface Rotation extends Point {
  w: number;
}

export interface RetargetArm {
  shoulder: Point;
  elbow: Point;
  wrist: Point;
  handAxis: Point;
  palm: Point;
}

export interface RetargetLeg {
  hip: Point;
  knee: Point;
  ankle: Point;
  footAxis: Point;
  sole: Point;
}

export interface RetargetTarget {
  arms: Record<Side, RetargetArm>;
  legs: Record<Side, RetargetLeg>;
  head: Rotation;
}

export type Side = 'right' | 'left';

const SIDES: readonly Side[] = ['right', 'left'];
const PREFIX: Readonly<Record<Side, string>> = { right: 'r', left: 'l' };
const PALM_SIDE: Readonly<Record<Side, number>> = { right: -1, left: 1 };
const FINGERS = ['index', 'middle', 'ring', 'pinky'] as const;
const FINGER_CURL = { index: 0.2, middle: 0.26, ring: 0.32, pinky: 0.38 } as const;
const THUMB_CURL = 0.12;
const NECK_SHARE = 0.45;
const ARM_TWIST = 2.2;
const LEG_TWIST = 0;
const CLAVICLE_SPIN = 1.92;
const CLAVICLE_TWIST = 0;
const SPIN_SIGN: Readonly<Record<Side, number>> = { right: 1, left: -1 };
const SPINE_PASSES = 3;
const SHOULDER_PASSES = 3;
const SHOULDER_DAMPING = 0.1;
const PLANE_SAMPLES = 24;
const PLANE_REFINES = 14;
const GOLDEN_LOW = 0.382;
const GOLDEN_HIGH = 0.618;
const TURN = 2 * Math.PI;
const PLANE_FROM_RAD = Math.PI / 360;
const PLANE_TO_RAD = (3 * Math.PI) / 180;
const DOWN: Vec = [0, -1, 0];

function point(): Point {
  return { x: 0, y: 0, z: 0 };
}

function arm(): RetargetArm {
  return { shoulder: point(), elbow: point(), wrist: point(), handAxis: point(), palm: point() };
}

function leg(): RetargetLeg {
  return { hip: point(), knee: point(), ankle: point(), footAxis: point(), sole: point() };
}

export function createRetargetTarget(): RetargetTarget {
  return {
    arms: { right: arm(), left: arm() },
    legs: { right: leg(), left: leg() },
    head: { x: 0, y: 0, z: 0, w: 1 },
  };
}

function vec(p: Point): Vec {
  return [p.x, p.y, p.z];
}

interface Hinge {
  readonly parent: Mat;
  readonly bone: Vec;
  readonly pre: Mat;
  readonly next: Vec;
  readonly aim: Vec;
  readonly forward: Vec;
  readonly reach: Vec;
  readonly middle: Vec;
  readonly twistCentre: number;
}

interface Reach {
  readonly normal: Vec;
  readonly error: number;
  readonly gain: number;
}

interface HingeSolution {
  readonly spin: number;
  readonly euler: Vec;
  readonly bend: number;
  readonly upper: Mat;
  readonly post: Mat;
}

interface Distal {
  readonly twist: number;
  readonly values: readonly number[];
}

type DistalSolver = (post: Mat) => Distal;

function hingeBend(hinge: Hinge, distance: number): number {
  const first = length(hinge.bone);
  const second = length(hinge.next);
  const w = applyTransposed(hinge.pre, hinge.bone);
  const [nx, ny, nz] = hinge.next;
  const a = w[0] * nx + w[1] * ny;
  const b = w[1] * nx - w[0] * ny;
  const wanted = (distance * distance - first * first - second * second) / 2 - w[2] * nz;
  const radius = Math.hypot(a, b);
  const spread = Math.acos(Math.max(-1, Math.min(1, wanted / radius)));
  const phase = Math.atan2(b, a);
  return wrap(Math.max(phase + spread, phase - spread));
}

function solveHinge(hinge: Hinge, spin: number): HingeSolution {
  const bend = hingeBend(hinge, length(hinge.reach));
  const span = normalize(add(hinge.bone, apply(hinge.pre, apply(rotZ(bend), hinge.next))));
  const aim = normalize(applyTransposed(hinge.parent, hinge.reach));
  const euler = mul(fromAxisAngle(aim, spin), shortestArc(span, aim));
  const upper = mul(hinge.parent, euler);
  return {
    spin,
    euler: toEulerNear(euler, hinge.twistCentre),
    bend,
    upper,
    post: mul(mul(upper, hinge.pre), rotZ(bend)),
  };
}

function middleMiss(hinge: Hinge, solution: HingeSolution): number {
  return length(sub(apply(solution.upper, hinge.bone), hinge.middle));
}

function planeSpin(hinge: Hinge): number {
  const miss = (spin: number) => middleMiss(hinge, solveHinge(hinge, spin));
  const step = TURN / PLANE_SAMPLES;
  let best = 0;
  let bestMiss = Infinity;
  for (let i = 0; i < PLANE_SAMPLES; i++) {
    const value = miss(wrap(i * step));
    if (value < bestMiss) {
      bestMiss = value;
      best = wrap(i * step);
    }
  }
  let low = best - step;
  let high = best + step;
  for (let i = 0; i < PLANE_REFINES; i++) {
    const a = low + (high - low) * GOLDEN_LOW;
    const b = low + (high - low) * GOLDEN_HIGH;
    if (miss(a) < miss(b)) high = b;
    else low = a;
  }
  return wrap((low + high) / 2);
}

function sharedSpin(hinge: Hinge, distal: DistalSolver): number {
  let spin = 0;
  for (let pass = 0; pass < 2; pass++) {
    spin = (spin + distal(solveHinge(hinge, spin).post).twist) / 2;
  }
  return spin;
}

function chooseSpin(hinge: Hinge, distal: DistalSolver): number {
  const bendRad = angleBetween(hinge.aim, applyTransposed(hinge.parent, hinge.forward));
  const weight = smooth(bendRad, PLANE_FROM_RAD, PLANE_TO_RAD);
  if (weight >= 1) return planeSpin(hinge);
  const shared = sharedSpin(hinge, distal);
  return weight <= 0 ? shared : mixAngle(shared, planeSpin(hinge), weight);
}

export class Retargeter {
  private readonly figure: Figure;
  private readonly out: Float32Array;
  private readonly restPositions: Vec[] = [];
  private readonly restRotations: Mat[] = [];
  private readonly index = new Map<string, number>();
  private readonly rootUnit: number;
  private readonly widthShift: Record<Side, Vec>;

  constructor(figure: Figure) {
    this.figure = figure;
    this.out = figure.createParameters();
    figure.solveSkeleton(this.out);
    for (let j = 0; j < figure.jointCount; j++) {
      this.restPositions.push(this.positionAt(j));
      this.restRotations.push(this.rotationAt(j));
      this.index.set(figure.jointNames[j], j);
    }
    this.out[figure.parameterIndex('root_ty')] = 1;
    figure.solveSkeleton(this.out);
    this.rootUnit = figure.jointPositions[this.joint('root') * 3 + 1] - this.restPositions[1][1];
    this.out.fill(0);
    this.out[figure.parameterIndex('shoulder_width_flexible')] = 1;
    figure.solveSkeleton(this.out);
    this.widthShift = {
      right: this.shift('r'),
      left: this.shift('l'),
    };
    this.out.fill(0);
  }

  solve(target: RetargetTarget): Float32Array {
    this.out.fill(0);
    this.solveRoot(target);
    this.solveSpine(target);
    this.fk();
    this.fitShoulders(target);
    SIDES.forEach((side) => this.solveArm(side, target.arms[side]));
    SIDES.forEach((side) => this.solveLeg(side, target.legs[side]));
    this.solveHead(target.head);
    SIDES.forEach((side) => this.relaxHand(side));
    return this.out;
  }

  private joint(name: string): number {
    return this.index.get(name) ?? -1;
  }

  private fk(): void {
    this.figure.solveSkeleton(this.out);
  }

  private set(name: string, value: number): void {
    this.out[this.figure.parameterIndex(name)] = value;
  }

  private add(name: string, value: number): void {
    this.out[this.figure.parameterIndex(name)] += value;
  }

  private positionAt(j: number): Vec {
    const p = this.figure.jointPositions;
    return [p[j * 3], p[j * 3 + 1], p[j * 3 + 2]];
  }

  private rotationAt(j: number): Mat {
    return this.figure.jointMatrices.slice(j * 9, j * 9 + 9);
  }

  private pos(name: string): Vec {
    return this.positionAt(this.joint(name));
  }

  private rot(name: string): Mat {
    return this.rotationAt(this.joint(name));
  }

  private restPos(name: string): Vec {
    return this.restPositions[this.joint(name)];
  }

  private restRot(name: string): Mat {
    return this.restRotations[this.joint(name)];
  }

  private pre(name: string): Mat {
    const at = this.joint(name) * 9;
    return Float64Array.from(this.figure.skeleton.preRotations.subarray(at, at + 9));
  }

  private parentOf(name: string): string {
    return this.figure.jointNames[this.figure.skeleton.parents[this.joint(name)]];
  }

  private frameOf(name: string): Mat {
    return mul(this.rot(this.parentOf(name)), this.pre(name));
  }

  private restOffset(parent: string, child: string): Vec {
    return applyTransposed(this.restRot(parent), sub(this.restPos(child), this.restPos(parent)));
  }

  private chord(): Vec {
    return sub(
      midpoint(this.restPos('r_uparm'), this.restPos('l_uparm')),
      midpoint(this.restPos('r_upleg'), this.restPos('l_upleg')),
    );
  }

  private solveRoot(target: RetargetTarget): void {
    const { right, left } = target.legs;
    const hips = midpoint(vec(right.hip), vec(left.hip));
    const up = sub(this.shoulderCentre(target), hips);
    const axis = sub(vec(left.hip), vec(right.hip));
    const restAxis = sub(this.restPos('l_upleg'), this.restPos('r_upleg'));
    const turn = mul(frame(axis, up), transpose(frame(restAxis, this.chord())));
    const [x, y, z] = toEuler(turn);
    this.set('root_rx', x);
    this.set('root_ry', y);
    this.set('root_rz', z);
    this.fk();
    const here = midpoint(this.pos('r_upleg'), this.pos('l_upleg'));
    const move = sub(hips, here);
    this.set('root_tx', move[0] / this.rootUnit);
    this.set('root_ty', move[1] / this.rootUnit);
    this.set('root_tz', move[2] / this.rootUnit);
  }

  private shoulderCentre(target: RetargetTarget): Vec {
    return midpoint(vec(target.arms.right.shoulder), vec(target.arms.left.shoulder));
  }

  private solveSpine(target: RetargetTarget): void {
    const axis = sub(vec(target.arms.left.shoulder), vec(target.arms.right.shoulder));
    const hips = midpoint(vec(target.legs.right.hip), vec(target.legs.left.hip));
    const restAxis = sub(this.restPos('l_uparm'), this.restPos('r_uparm'));
    const turn = mul(
      frame(sub(this.shoulderCentre(target), hips), axis),
      transpose(frame(this.chord(), restAxis)),
    );
    const wanted = mul(turn, this.restRot('c_spine3'));
    for (let pass = 0; pass < SPINE_PASSES; pass++) {
      this.fk();
      const error = rotationVector(mul(wanted, transpose(this.rot('c_spine3'))));
      const local = applyTransposed(this.frameOf('c_spine0'), error);
      [0, 1].forEach((i) => {
        this.add(`spine_twist${i}`, local[0]);
        this.add(`spine_lean${i}`, local[1]);
        this.add(`spine_bend${i}`, local[2]);
      });
    }
  }

  private shift(p: string): Vec {
    const moved = sub(this.pos(`${p}_uparm`), this.restPos(`${p}_uparm`));
    return applyTransposed(this.restRot(`${p}_clavicle`), moved);
  }

  private fitShoulders(target: RetargetTarget): void {
    for (let pass = 0; pass < SHOULDER_PASSES; pass++) {
      this.placeClavicles(target);
      const [first, second] = SIDES.map((side) => this.shoulderReach(side, target.arms[side]));
      const width = (first.error + second.error) / (first.gain + second.gain);
      this.add('shoulder_width_flexible', width);
      const leftover = [first.error - width * first.gain, second.error - width * second.gain];
      const c = dot(first.normal, second.normal);
      const det = (1 + SHOULDER_DAMPING) ** 2 - c * c;
      const a = ((1 + SHOULDER_DAMPING) * leftover[0] - c * leftover[1]) / det;
      const b = ((1 + SHOULDER_DAMPING) * leftover[1] - c * leftover[0]) / det;
      this.moveChest(add(scale(first.normal, a), scale(second.normal, b)));
    }
    this.placeClavicles(target);
  }

  private placeClavicles(target: RetargetTarget): void {
    this.fk();
    SIDES.forEach((side) => this.solveClavicle(side, target.arms[side]));
    this.fk();
  }

  private shoulderReach(side: Side, arm: RetargetArm): Reach {
    const p = PREFIX[side];
    const clavicle = this.pos(`${p}_clavicle`);
    const toTarget = sub(vec(arm.shoulder), clavicle);
    const radius = length(sub(this.pos(`${p}_uparm`), clavicle));
    const normal = normalize(toTarget);
    const moved = apply(this.rot(`${p}_clavicle`), this.widthShift[side]);
    return { normal, error: length(toTarget) - radius, gain: dot(normal, moved) };
  }

  private moveChest(shift: Vec): void {
    const chord = sub(
      midpoint(this.pos('r_uparm'), this.pos('l_uparm')),
      midpoint(this.pos('r_upleg'), this.pos('l_upleg')),
    );
    const up = normalize(chord);
    const sideways = sub(shift, scale(up, dot(shift, up)));
    const turn = scale(cross(up, sideways), 1 / length(chord));
    const local = applyTransposed(this.frameOf('c_spine0'), turn);
    [0, 1].forEach((i) => {
      this.add(`spine_lean${i}`, local[1]);
      this.add(`spine_bend${i}`, local[2]);
    });
  }

  private solveClavicle(side: Side, arm: RetargetArm): void {
    const p = PREFIX[side];
    const clavicle = `${p}_clavicle`;
    const width = this.out[this.figure.parameterIndex('shoulder_width_flexible')];
    const bone = normalize(
      add(this.restOffset(clavicle, `${p}_uparm`), scale(this.widthShift[side], width)),
    );
    const aim = normalize(
      applyTransposed(this.frameOf(clavicle), sub(vec(arm.shoulder), this.pos(clavicle))),
    );
    const swing = shortestArc(bone, aim);
    const [x, y, z] = toEulerNear(
      mul(fromAxisAngle(aim, CLAVICLE_SPIN * SPIN_SIGN[side]), swing),
      CLAVICLE_TWIST,
    );
    this.set(`${clavicle}_rx`, x);
    this.set(`${clavicle}_ry`, y);
    this.set(`${clavicle}_rz`, z);
  }

  private limb(
    joint: string,
    hingeJoint: string,
    tip: string,
    from: Vec,
    elbow: Vec,
    end: Vec,
    twistCentre: number,
  ): Hinge {
    const bone = this.restOffset(joint, hingeJoint);
    const next = this.restOffset(hingeJoint, tip);
    const upper = scale(normalize(sub(elbow, from)), length(bone));
    const lower = scale(normalize(sub(end, elbow)), length(next));
    const frame = this.frameOf(joint);
    return {
      parent: frame,
      bone,
      pre: this.pre(hingeJoint),
      next,
      aim: normalize(applyTransposed(frame, upper)),
      forward: normalize(lower),
      reach: add(upper, lower),
      middle: upper,
      twistCentre,
    };
  }

  private solveArm(side: Side, target: RetargetArm): void {
    const p = PREFIX[side];
    const hinge = this.limb(
      `${p}_uparm`,
      `${p}_lowarm`,
      `${p}_wrist`,
      vec(target.shoulder),
      vec(target.elbow),
      vec(target.wrist),
      ARM_TWIST,
    );
    const restFrame = frame(
      sub(this.restPos(`${p}_middle_null`), this.restPos(`${p}_wrist`)),
      this.restPalm(side),
    );
    const wanted = mul(
      mul(frame(vec(target.handAxis), vec(target.palm)), transpose(restFrame)),
      this.restRot(`${p}_wrist`),
    );
    const twistPre = this.pre(`${p}_wrist_twist`);
    const distal: DistalSolver = (post) => {
      const m = mul(transpose(mul(post, twistPre)), wanted);
      const flex = -Math.asin(Math.max(-1, Math.min(1, m[1])));
      return { twist: Math.atan2(m[7], m[4]), values: [flex, Math.atan2(m[2], m[0])] };
    };
    const solved = solveHinge(hinge, chooseSpin(hinge, distal));
    const hand = distal(solved.post);
    this.set(`${p}_uparm_twist`, solved.euler[0]);
    this.set(`${p}_uparm_ry`, solved.euler[1]);
    this.set(`${p}_uparm_rz`, solved.euler[2]);
    this.set(`${p}_elbow_bend`, solved.bend);
    this.set(`${p}_lowarm_twist`, hand.twist);
    this.set(`${p}_wrist_rz`, hand.values[0]);
    this.set(`${p}_wrist_ry`, hand.values[1]);
  }

  private restPalm(side: Side): Vec {
    const p = PREFIX[side];
    const axis = sub(this.restPos(`${p}_middle_null`), this.restPos(`${p}_wrist`));
    const across = sub(this.restPos(`${p}_index1`), this.restPos(`${p}_pinky1`));
    return scale(normalize(cross(axis, across)), PALM_SIDE[side]);
  }

  private solveLeg(side: Side, target: RetargetLeg): void {
    const p = PREFIX[side];
    const hinge = this.limb(
      `${p}_upleg`,
      `${p}_lowleg`,
      `${p}_foot`,
      vec(target.hip),
      vec(target.knee),
      vec(target.ankle),
      LEG_TWIST,
    );
    const restAxis = sub(this.restPos(`${p}_ball`), this.restPos(`${p}_foot`));
    const wanted = mul(
      mul(frame(vec(target.footAxis), vec(target.sole)), transpose(frame(restAxis, DOWN))),
      this.restRot(`${p}_transversetarsal`),
    );
    const footPre = this.pre(`${p}_foot`);
    const subtalar = this.pre(`${p}_subtalar`);
    const pivot: Vec = [subtalar[0], subtalar[3], subtalar[6]];
    const distal: DistalSolver = (post) => {
      const m = mul(transpose(mul(post, footPre)), wanted);
      const u: Vec = [m[0], m[3], m[6]];
      const radius = Math.hypot(pivot[0], pivot[1]);
      const phase = Math.atan2(pivot[1], pivot[0]);
      const spread = Math.acos(Math.max(-1, Math.min(1, u[0] / radius)));
      const options = [-phase + spread, -phase - spread].map((bend) => {
        const turned = apply(rotZ(bend), pivot);
        const twist = wrap(Math.atan2(u[2], u[1]) - Math.atan2(turned[2], turned[1]));
        return { bend: wrap(bend), twist };
      });
      const best =
        Math.abs(options[0].twist) <= Math.abs(options[1].twist) ? options[0] : options[1];
      const chain = mul(mul(rotX(best.twist), rotZ(best.bend)), subtalar);
      const rest = mul(transpose(chain), m);
      return { twist: best.twist, values: [best.bend, Math.atan2(rest[7], rest[4])] };
    };
    const solved = solveHinge(hinge, chooseSpin(hinge, distal));
    const foot = distal(solved.post);
    this.set(`${p}_upleg_twist`, solved.euler[0]);
    this.set(`${p}_upleg_ry`, solved.euler[1]);
    this.set(`${p}_upleg_rz`, solved.euler[2]);
    this.set(`${p}_knee_bend`, solved.bend);
    this.set(`${p}_lowleg_twist`, foot.twist);
    this.set(`${p}_foot_bend`, foot.values[0]);
    this.set(`${p}_foot_lean0`, foot.values[1] / 2);
    this.set(`${p}_foot_lean1`, foot.values[1] / 2);
  }

  private solveHead(head: Rotation): void {
    const wanted = mul(fromQuaternion(head.x, head.y, head.z, head.w), this.restRot('c_head'));
    const neckPre = this.pre('c_neck');
    const headPre = this.pre('c_head');
    const chest = mul(this.rot('c_spine3'), neckPre);
    const total = mul(mul(transpose(chest), wanted), transpose(headPre));
    const neck = share(total, NECK_SHARE);
    const rest = mul(transpose(neck), total);
    const headTurn = mul(transpose(headPre), mul(rest, headPre));
    const [nx, ny, nz] = toEuler(neck);
    const [hx, hy, hz] = toEuler(headTurn);
    this.set('neck_twist', nx);
    this.set('neck_lean', ny);
    this.set('neck_bend', nz);
    this.set('head_twist', hx);
    this.set('head_lean', hy);
    this.set('head_bend', hz);
  }

  private relaxHand(side: Side): void {
    const p = PREFIX[side];
    FINGERS.forEach((finger) => {
      const curl = FINGER_CURL[finger];
      [1, 2, 3].forEach((i) => {
        const name = `${p}_${finger}${i}_rz`;
        if (this.figure.parameterIndex(name) >= 0) this.set(name, curl);
      });
    });
    this.set(`${p}_thumb1_rz`, THUMB_CURL);
    this.set(`${p}_thumb2_rz`, THUMB_CURL);
  }
}
