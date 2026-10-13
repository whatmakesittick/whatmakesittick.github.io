import {
  BoxGeometry,
  CylinderGeometry,
  Euler,
  Matrix4,
  Mesh,
  Quaternion,
  RingGeometry,
  Shape,
  Vector3,
} from 'three';
import type { BufferGeometry, InstancedMesh, Object3D } from 'three';
import { toRadians } from '@core/math';
import type { AssemblyState } from '../../ids';
import { CHAIN_ELEMENTS, CHAIN_LOOP_MM, SETTING_LAYOUT, pointOnLoop, wrapChain } from '../../model';
import type { LogLayout } from '../../model';
import { CHIPS, KERF } from '../constants';
import { FINISHES } from '../finishes';
import { extrudeAlongZ } from '../geometry/profile';
import { instancedPart, label, namedGroup } from './context';
import type { PartContext, Section } from './context';

const ROUND = 40;
const SCAN_STEPS = 2000;
const CUTTER_REACH = 0.0066;
const LOG_LABEL = { across: 0.3, up: 0.954, along: 0.6 } as const;

interface Chip {
  position: Vector3;
  velocity: Vector3;
  spin: Vector3;
  rotation: Euler;
  age: number;
  resting: boolean;
}

function logMesh(context: PartContext, radius: number, length: number): Mesh {
  const geometry = context.tracker.track(new CylinderGeometry(radius, radius, length, ROUND));
  const bark = context.materials.get('log', FINISHES.bark);
  const wood = context.materials.get('log', FINISHES.wood);
  const mesh = new Mesh(geometry, [bark, wood, wood]);
  mesh.name = 'log';
  return mesh;
}

function zLog(context: PartContext, radius: number, from: number, to: number): Mesh {
  const mesh = logMesh(context, radius, to - from);
  mesh.rotation.x = Math.PI / 2;
  mesh.position.z = (from + to) / 2;
  return mesh;
}

function kerfSlice(radius: number, chordY: number, from: number, to: number): BufferGeometry {
  const start = Math.asin(Math.min(1, chordY / radius));
  const shape = new Shape();
  shape.absarc(0, 0, radius, start, Math.PI - start, true);
  shape.closePath();
  return extrudeAlongZ(shape, { from, to });
}

function endRings(context: PartContext, z: number): Mesh[] {
  return KERF.ringRadii.map((ring) => {
    const mesh = new Mesh(
      context.tracker.track(new RingGeometry(ring - 0.0016, ring, ROUND)),
      context.materials.get('log', FINISHES.woodRing),
    );
    mesh.position.z = z;
    return mesh;
  });
}

function kerfBottom(log: LogLayout, lift: number): number {
  const lowest = Math.min(
    ...Array.from(
      { length: SCAN_STEPS },
      (_, step) => pointOnLoop((CHAIN_LOOP_MM * step) / SCAN_STEPS).y,
    ),
  );
  return lowest - CUTTER_REACH - (log.centre[1] - lift);
}

function exitMm(log: LogLayout, lift: number, bottomY: number): number {
  const centreY = log.centre[1] - lift;
  const reach = Math.sqrt(Math.max(0, log.radius ** 2 - (bottomY - centreY) ** 2));
  const rearX = log.centre[0] - reach;
  let best = 0;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (let step = 0; step < SCAN_STEPS; step += 1) {
    const mm = (CHAIN_LOOP_MM * step) / SCAN_STEPS;
    const point = pointOnLoop(mm);
    if (point.y > centreY + log.radius) continue;
    const distance =
      Math.abs(point.x - rearX) + (point.angle > Math.PI / 2 || point.angle < -Math.PI / 2 ? 0 : 1);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = mm;
    }
  }
  return best;
}

function buildLog(context: PartContext, parent: Object3D): Object3D {
  const { log, lift } = SETTING_LAYOUT.cutting;
  if (!log) throw new Error('The cutting setting needs a log');
  const group = namedGroup('cuttingLog', parent);
  const [x, y, z] = log.centre;
  group.position.set(x, y - lift, 0);
  const half = log.length / 2;
  group.add(
    zLog(context, log.radius, z - half, z - KERF.halfWidth),
    zLog(context, log.radius, z + KERF.halfWidth, z + half),
  );
  const slice = new Mesh(
    context.tracker.track(
      kerfSlice(log.radius, kerfBottom(log, lift), z - KERF.halfWidth, z + KERF.halfWidth),
    ),
    [context.materials.get('log', FINISHES.wood), context.materials.get('log', FINISHES.bark)],
  );
  group.add(slice, ...endRings(context, z + half + 0.0004));
  label(context, 'log', group, [
    log.radius * LOG_LABEL.across,
    log.radius * LOG_LABEL.up,
    z + half * LOG_LABEL.along,
  ]);
  return group;
}

function buildBranch(context: PartContext, parent: Object3D): Object3D {
  const { log } = SETTING_LAYOUT.kickback;
  if (!log) throw new Error('The kickback setting needs a branch');
  const group = namedGroup('branch', parent);
  group.position.set(...log.centre);
  group.rotation.z = toRadians(log.tiltDeg);
  group.add(logMesh(context, log.radius, log.length));
  return group;
}

class ChipSpray {
  readonly mesh: InstancedMesh;
  private readonly chips: Chip[] = [];
  private readonly matrix = new Matrix4();
  private readonly quaternion = new Quaternion();
  private readonly scale = new Vector3(1, 1, 1);
  private readonly floor: number;
  private readonly exit: number;
  private readonly bottomY: number;
  private lastMm = Number.NaN;

  constructor(context: PartContext, parent: Object3D) {
    const { log, lift } = SETTING_LAYOUT.cutting;
    if (!log) throw new Error('The cutting setting needs a log');
    const [width, height, depth] = CHIPS.size;
    this.mesh = instancedPart(context, new BoxGeometry(width, height, depth), 'chips', CHIPS.max);
    this.mesh.count = 0;
    parent.add(this.mesh);
    this.floor = -lift + height;
    this.bottomY = kerfBottom(log, lift) + log.centre[1] - lift;
    this.exit = exitMm(log, lift, this.bottomY);
    label(context, 'chips', this.mesh, [
      log.centre[0] - log.radius - 0.03,
      this.floor,
      log.centre[2],
    ]);
  }

  get live(): boolean {
    return this.chips.length > 0;
  }

  follow(state: AssemblyState): void {
    const chainMm = state.drive.chainMm;
    const step = wrapChain(chainMm - this.lastMm);
    const moving = state.setting === 'cutting' && state.drive.clutch === 'driving';
    if (moving && Number.isFinite(step) && step > 0 && step < CHIPS.maxStepMm)
      this.emitCrossings(this.lastMm, step);
    this.lastMm = chainMm;
    if (state.setting !== 'cutting') this.clear();
  }

  update(deltaSeconds: number): boolean {
    if (!this.live) return false;
    this.chips.forEach((chip) => this.move(chip, deltaSeconds));
    for (let index = this.chips.length - 1; index >= 0; index -= 1)
      if (this.chips[index].age > CHIPS.lifeSeconds) this.chips.splice(index, 1);
    this.write();
    return true;
  }

  private emitCrossings(fromMm: number, step: number): void {
    CHAIN_ELEMENTS.filter((element) => element.kind !== 'plain').forEach((element) => {
      const ahead = wrapChain(this.exit - (element.offsetMm + fromMm));
      if (ahead < step) for (let piece = 0; piece < CHIPS.perCutter; piece += 1) this.spawn();
    });
    this.write();
  }

  private spawn(): void {
    if (this.chips.length >= CHIPS.max) this.chips.shift();
    const point = pointOnLoop(this.exit);
    const jitter = () => (Math.random() - 0.5) * 2;
    this.chips.push({
      position: new Vector3(
        point.x,
        this.bottomY + 0.004,
        SETTING_LAYOUT.cutting.log?.centre[2] ?? 0,
      ),
      velocity: new Vector3(
        -CHIPS.speed * (1 + jitter() * CHIPS.spread),
        CHIPS.rise * jitter(),
        CHIPS.speed * CHIPS.spread * jitter() * 0.6,
      ),
      spin: new Vector3(jitter(), jitter(), jitter()).multiplyScalar(CHIPS.spinRate),
      rotation: new Euler(jitter() * Math.PI, jitter() * Math.PI, jitter() * Math.PI),
      age: 0,
      resting: false,
    });
  }

  private move(chip: Chip, delta: number): void {
    chip.age += delta;
    if (chip.resting) return;
    chip.velocity.y -= CHIPS.gravity * delta;
    chip.position.addScaledVector(chip.velocity, delta);
    chip.rotation.set(
      chip.rotation.x + chip.spin.x * delta,
      chip.rotation.y + chip.spin.y * delta,
      chip.rotation.z + chip.spin.z * delta,
    );
    if (chip.position.y > this.floor) return;
    chip.position.y = this.floor;
    chip.rotation.set(0, chip.rotation.y, 0);
    chip.resting = true;
  }

  private write(): void {
    this.chips.forEach((chip, index) => {
      this.quaternion.setFromEuler(chip.rotation);
      this.mesh.setMatrixAt(index, this.matrix.compose(chip.position, this.quaternion, this.scale));
    });
    this.mesh.count = this.chips.length;
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  private clear(): void {
    if (!this.live) return;
    this.chips.length = 0;
    this.write();
  }
}

export function buildWood(context: PartContext, parent: Object3D): Section {
  const root = namedGroup('wood', parent);
  const log = buildLog(context, root);
  const branch = buildBranch(context, root);
  const chips = new ChipSpray(context, root);
  return {
    root,
    setState: (state: AssemblyState) => {
      log.visible = state.setting === 'cutting';
      branch.visible = state.setting === 'kickback';
      chips.mesh.visible = state.setting === 'cutting';
      chips.follow(state);
    },
    update: (deltaSeconds: number) => chips.update(deltaSeconds),
  };
}
