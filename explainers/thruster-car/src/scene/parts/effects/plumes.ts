import { BufferAttribute, Color, Group, Object3D, Quaternion, Vector3 } from 'three';
import type { PointsMaterial } from 'three';
import { FULL_TURN, smoothstep } from '@core/math';
import { PointCloud } from '@core/scene/pointCloud';
import { GAS_IDS, NOZZLE_IDS, NOZZLE_PARTS } from '../../../ids';
import type { AssemblyState, GasId, NozzleId, NozzlePartId } from '../../../ids';
import { PLUME_COLOURS } from '../../../theme';
import { between, seededRandom } from '../../geometry/effects/random';
import type { Random } from '../../geometry/effects/random';
import type { PartContext } from '../context';
import type { CarView } from '../types';
import { LIGHT_RIG } from '../../constants';
import { PLUME, PLUME_LOOKS, PLUME_PUFFS, PLUME_SHADING, RENDER_ORDER } from './constants';
import { firingThrust } from './firing';
import type { Mouth } from './mouth';
import { mouthInCar } from './mouth';
import { plumeLength } from '../../../model/plume';
import { plumeReach, puffShape } from './plumeShape';
import type { PlumeSpan, PuffShape } from './plumeShape';
import { puffLight, shadePuff } from './plumeShading';
import type { Tone } from './plumeShading';
import { PUFF_SCALE_ATTRIBUTE } from './puffMaterial';

export const PLUME_GROUPS: readonly NozzlePartId[] = [
  'cornerNozzles',
  'frontNozzles',
  'rearNozzles',
];

export function plumeName(group: NozzlePartId): string {
  return `${group}Plume`;
}

const WORLD_UP = new Vector3(0, 1, 0);
const SUN_DIRECTION = new Vector3(...LIGHT_RIG.key.direction).normalize();

const PLUME_TONES = Object.fromEntries(
  GAS_IDS.map((gas) => [gas, new Color(PLUME_COLOURS[gas])]),
) as Record<GasId, Color>;

interface Puff {
  progress: number;
  life: number;
  angle: number;
  offset: number;
  phase: number;
  size: number;
}

function respawn(puff: Puff, random: Random, progress: number): Puff {
  puff.progress = progress;
  puff.life = PLUME.lifeSeconds * between(random, 1 - PLUME.lifeJitter, 1 + PLUME.lifeJitter);
  puff.angle = random() * FULL_TURN;
  puff.offset = Math.sqrt(random());
  puff.phase = random() * FULL_TURN;
  puff.size = between(random, PLUME.sizeJitter[0], PLUME.sizeJitter[1]);
  return puff;
}

interface Slots {
  cloud: PointCloud;
  scales: Float32Array;
}

function newPuff(random: Random): Puff {
  const puff = { progress: 0, life: 0, angle: 0, offset: 0, phase: 0, size: 0 };
  return respawn(puff, random, 0);
}

export interface PlumeLight {
  sun: Vector3;
  up: Vector3;
}

class Emitter {
  readonly id: NozzleId;
  readonly mouth: Mouth;
  readonly span: PlumeSpan;
  private readonly group: NozzlePartId;
  private readonly light: PlumeLight;
  private readonly slots: Slots;
  private readonly first: number;
  private readonly puffs: Puff[];
  private readonly random: Random;
  private readonly shape: PuffShape = { distance: 0, radius: 0, diameter: 0, rise: 0, alpha: 0 };
  private readonly tone: Tone = { r: 0, g: 0, b: 0 };
  private gas: GasId = 'air';
  private time = 0;

  constructor(id: NozzleId, mouth: Mouth, light: PlumeLight, slots: Slots, first: number) {
    this.id = id;
    this.mouth = mouth;
    this.group = NOZZLE_PARTS[id];
    this.span = { length: 0, reach: 0, puffs: PLUME_PUFFS[this.group] };
    this.light = light;
    this.slots = slots;
    this.first = first;
    this.random = seededRandom(PLUME.seed + NOZZLE_IDS.indexOf(id));
    this.puffs = Array.from({ length: this.span.puffs }, () => newPuff(this.random));
    this.clear();
  }

  get firing(): boolean {
    return this.span.length > 0;
  }

  setState(state: AssemblyState): void {
    const wasFiring = this.firing;
    this.span.length = plumeLength(firingThrust(state, this.id), state.gas);
    this.span.reach = plumeReach(this.span.length, this.group);
    this.gas = state.gas;
    if (wasFiring && !this.firing) this.clear();
  }

  advance(deltaSeconds: number): boolean {
    if (!this.firing) return false;
    this.time += deltaSeconds;
    for (let index = 0; index < this.puffs.length; index++)
      this.age(this.puffs[index], deltaSeconds);
    this.layout();
    return true;
  }

  private age(puff: Puff, deltaSeconds: number): void {
    const progress = puff.progress + deltaSeconds / puff.life;
    if (progress < 1) puff.progress = progress;
    else respawn(puff, this.random, progress % 1);
  }

  private clear(): void {
    this.time = 0;
    for (let index = 0; index < this.puffs.length; index++) {
      respawn(this.puffs[index], this.random, (index + this.random()) / this.puffs.length);
      this.slots.cloud.setColor(this.first + index, 0, 0, 0, 0);
      this.slots.scales[this.first + index] = 0;
    }
  }

  private layout(): void {
    const look = PLUME_LOOKS[this.gas];
    const base = PLUME_TONES[this.gas];
    const { side, lift } = this.mouth;
    const { sun, up } = this.light;
    const sideSun = side.dot(sun);
    const liftSun = lift.dot(sun);
    const sideUp = side.dot(up);
    const liftUp = lift.dot(up);
    const { depth, rate } = PLUME.flicker;
    for (let index = 0; index < this.puffs.length; index++) {
      const puff = this.puffs[index];
      const shape = puffShape(puff.progress, this.span, look, this.shape);
      const slot = this.first + index;
      const across = Math.cos(puff.angle);
      const over = Math.sin(puff.angle);
      this.place(slot, puff, shape, across, over);
      const light = puffLight(across * sideSun + over * liftSun, across * sideUp + over * liftUp);
      const clear =
        1 -
        smoothstep(shape.distance, this.span.length * PLUME_SHADING.coreClear, this.span.length);
      const { r, g, b } = shadePuff(light, clear, base, this.tone);
      const shimmer = 1 - depth * (0.5 + 0.5 * Math.sin(this.time * rate + puff.phase));
      this.slots.cloud.setColor(slot, r, g, b, shape.alpha * shimmer);
      this.slots.scales[slot] = shape.diameter * puff.size;
    }
  }

  private place(slot: number, puff: Puff, shape: PuffShape, across: number, over: number): void {
    const { amplitude, wake, rate, lag, ratio } = PLUME.sway;
    const { position, axis, side, lift } = this.mouth;
    const { up } = this.light;
    const along = shape.distance;
    const swing = amplitude * along + wake * Math.max(0, along - this.span.length);
    const turn = this.time * rate + puff.phase + along * lag;
    const spread = shape.radius * puff.offset;
    const sideways = across * spread + swing * Math.sin(turn);
    const upward = over * spread + swing * Math.cos(turn * ratio);
    this.slots.cloud.setPoint(
      slot,
      position.x + axis.x * along + side.x * sideways + lift.x * upward + up.x * shape.rise,
      position.y + axis.y * along + side.y * sideways + lift.y * upward + up.y * shape.rise,
      position.z + axis.z * along + side.z * sideways + lift.z * upward + up.z * shape.rise,
    );
  }
}

class PlumeCloud {
  readonly slots: Slots;
  readonly emitters: Emitter[] = [];
  private readonly scaleAttribute: BufferAttribute;

  constructor(material: PointsMaterial, group: NozzlePartId, count: number) {
    const slots = count * PLUME_PUFFS[group];
    const cloud = new PointCloud(slots, material, RENDER_ORDER.plume);
    cloud.points.name = plumeName(group);
    const scales = new Float32Array(slots);
    this.scaleAttribute = new BufferAttribute(scales, 1);
    cloud.points.geometry.setAttribute(PUFF_SCALE_ATTRIBUTE, this.scaleAttribute);
    cloud.points.visible = false;
    this.slots = { cloud, scales };
  }

  get points(): Object3D {
    return this.slots.cloud.points;
  }

  setState(state: AssemblyState): void {
    let firing = false;
    for (let index = 0; index < this.emitters.length; index++) {
      this.emitters[index].setState(state);
      if (this.emitters[index].firing) firing = true;
    }
    this.points.visible = firing;
  }

  advance(deltaSeconds: number): boolean {
    if (!this.points.visible) return false;
    for (let index = 0; index < this.emitters.length; index++) {
      this.emitters[index].advance(deltaSeconds);
    }
    this.commit();
    return true;
  }

  private commit(): void {
    this.scaleAttribute.needsUpdate = true;
    this.slots.cloud.commit();
  }
}

export class Plumes {
  readonly object = new Group();
  readonly label = new Object3D();
  private readonly clouds: PlumeCloud[];
  private readonly light: PlumeLight = { sun: new Vector3(), up: new Vector3() };
  private readonly turn = new Quaternion();
  private readonly car: Object3D;

  constructor(context: PartContext, car: CarView, material: PointsMaterial) {
    this.car = car.object;
    this.clouds = PLUME_GROUPS.map((group) => this.cloudFor(context, material, car, group));
    this.clouds.forEach((cloud) => this.object.add(cloud.points));
    this.object.add(this.label);
    this.object.visible = false;
    car.object.add(this.object);
  }

  setState(state: AssemblyState): void {
    this.aimLight();
    let lead: Emitter | undefined;
    for (let group = 0; group < this.clouds.length; group++) {
      const cloud = this.clouds[group];
      cloud.setState(state);
      for (let index = 0; index < cloud.emitters.length; index++) {
        const emitter = cloud.emitters[index];
        if (emitter.firing && (!lead || emitter.span.length > lead.span.length)) lead = emitter;
      }
    }
    this.object.visible = lead !== undefined;
    if (lead) this.placeLabel(lead);
  }

  advance(deltaSeconds: number): boolean {
    let moving = false;
    for (let group = 0; group < this.clouds.length; group++) {
      if (this.clouds[group].advance(deltaSeconds)) moving = true;
    }
    return moving;
  }

  private aimLight(): void {
    this.car.getWorldQuaternion(this.turn).invert();
    this.light.sun.copy(SUN_DIRECTION).applyQuaternion(this.turn);
    this.light.up.copy(WORLD_UP).applyQuaternion(this.turn);
  }

  private cloudFor(
    context: PartContext,
    material: PointsMaterial,
    car: CarView,
    group: NozzlePartId,
  ): PlumeCloud {
    const ids = NOZZLE_IDS.filter((id) => NOZZLE_PARTS[id] === group);
    const cloud = new PlumeCloud(material, group, ids.length);
    context.tracker.track(cloud.slots.cloud);
    ids.forEach((id, index) => {
      const mouth = mouthInCar(car.object, car.nozzle(id));
      const first = index * PLUME_PUFFS[group];
      cloud.emitters.push(new Emitter(id, mouth, this.light, cloud.slots, first));
    });
    return cloud;
  }

  private placeLabel(lead: Emitter): void {
    const { position, axis } = lead.mouth;
    this.label.position
      .copy(axis)
      .multiplyScalar(lead.span.length * PLUME.labelShare)
      .add(position);
  }
}
