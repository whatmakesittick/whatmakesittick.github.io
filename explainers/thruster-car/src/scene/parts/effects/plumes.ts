import { BufferAttribute, Color, Group, Object3D, Quaternion, Vector3 } from 'three';
import type { PointsMaterial } from 'three';
import { FULL_TURN } from '@core/math';
import { PointCloud } from '@core/scene/pointCloud';
import { GAS_IDS, NOZZLE_IDS, NOZZLE_PARTS } from '../../../ids';
import type { AssemblyState, GasId, NozzleId, NozzlePartId } from '../../../ids';
import { PLUME_COLOURS } from '../../../theme';
import { puffTexture } from '../../geometry/effects/puffTexture';
import { between, seededRandom } from '../../geometry/effects/random';
import type { Random } from '../../geometry/effects/random';
import { registered } from '../context';
import type { PartContext } from '../context';
import type { CarView } from '../types';
import { PLUME, PLUME_LOOKS, POINT_SIZE_PER_METRE, RENDER_ORDER } from './constants';
import { firingThrust } from './firing';
import { plumeLength, puffShape } from './plumeShape';
import type { PuffShape } from './plumeShape';
import { PUFF_SCALE_ATTRIBUTE, puffMaterial } from './puffMaterial';

export const PLUME_GROUPS: readonly NozzlePartId[] = [
  'cornerNozzles',
  'frontNozzles',
  'rearNozzles',
];

export function plumeName(group: NozzlePartId): string {
  return `${group}Plume`;
}

const PLUME_AXIS = new Vector3(0, 1, 0);
const SIDE_HINT = new Vector3(0, 1, 0);
const SIDE_FALLBACK = new Vector3(1, 0, 0);
const PARALLEL = 0.9;

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

export interface Mouth {
  position: Vector3;
  axis: Vector3;
  side: Vector3;
  lift: Vector3;
}

export function mouthInCar(car: Object3D, nozzle: Object3D): Mouth {
  const turn = car.getWorldQuaternion(new Quaternion()).invert();
  turn.multiply(nozzle.getWorldQuaternion(new Quaternion()));
  const axis = PLUME_AXIS.clone().applyQuaternion(turn).normalize();
  const hint = Math.abs(axis.dot(SIDE_HINT)) < PARALLEL ? SIDE_HINT : SIDE_FALLBACK;
  const side = new Vector3().crossVectors(axis, hint).normalize();
  return {
    position: car.worldToLocal(nozzle.getWorldPosition(new Vector3())),
    axis,
    side,
    lift: new Vector3().crossVectors(axis, side),
  };
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

class Emitter {
  readonly id: NozzleId;
  readonly mouth: Mouth;
  length = 0;
  private readonly slots: Slots;
  private readonly first: number;
  private readonly puffs: Puff[];
  private readonly random: Random;
  private readonly shape: PuffShape = { distance: 0, radius: 0, diameter: 0, alpha: 0 };
  private gas: GasId = 'air';
  private time = 0;

  constructor(id: NozzleId, mouth: Mouth, slots: Slots, first: number) {
    this.id = id;
    this.mouth = mouth;
    this.slots = slots;
    this.first = first;
    this.random = seededRandom(PLUME.seed + NOZZLE_IDS.indexOf(id));
    this.puffs = Array.from({ length: PLUME.puffs }, () => newPuff(this.random));
    this.clear();
  }

  get firing(): boolean {
    return this.length > 0;
  }

  setState(state: AssemblyState): void {
    const wasFiring = this.firing;
    this.length = plumeLength(firingThrust(state, this.id), state.gas);
    this.gas = state.gas;
    if (this.firing) this.layout();
    else if (wasFiring) this.clear();
  }

  advance(deltaSeconds: number): boolean {
    if (!this.firing) return false;
    this.time += deltaSeconds;
    for (let index = 0; index < PLUME.puffs; index++) this.age(this.puffs[index], deltaSeconds);
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
    for (let index = 0; index < PLUME.puffs; index++) {
      respawn(this.puffs[index], this.random, (index + this.random()) / PLUME.puffs);
      this.slots.cloud.setColor(this.first + index, 0, 0, 0, 0);
      this.slots.scales[this.first + index] = 0;
    }
  }

  private layout(): void {
    const look = PLUME_LOOKS[this.gas];
    const { r, g, b } = PLUME_TONES[this.gas];
    for (let index = 0; index < PLUME.puffs; index++) {
      const puff = this.puffs[index];
      const shape = puffShape(puff.progress, this.length, look, this.shape);
      const slot = this.first + index;
      this.place(slot, puff, shape);
      const { depth, rate } = PLUME.flicker;
      const shimmer = 1 - depth * (0.5 + 0.5 * Math.sin(this.time * rate + puff.phase));
      this.slots.cloud.setColor(slot, r, g, b, shape.alpha * shimmer);
      this.slots.scales[slot] = shape.diameter * puff.size;
    }
  }

  private place(slot: number, puff: Puff, shape: PuffShape): void {
    const { amplitude, rate, lag, ratio } = PLUME.sway;
    const { position, axis, side, lift } = this.mouth;
    const swing = amplitude * shape.distance;
    const turn = this.time * rate + puff.phase + shape.distance * lag;
    const across = shape.radius * puff.offset;
    const sideways = Math.cos(puff.angle) * across + swing * Math.sin(turn);
    const upward = Math.sin(puff.angle) * across + swing * Math.cos(turn * ratio);
    const along = shape.distance;
    this.slots.cloud.setPoint(
      slot,
      position.x + axis.x * along + side.x * sideways + lift.x * upward,
      position.y + axis.y * along + side.y * sideways + lift.y * upward,
      position.z + axis.z * along + side.z * sideways + lift.z * upward,
    );
  }
}

class PlumeCloud {
  readonly slots: Slots;
  readonly emitters: Emitter[] = [];
  private readonly scaleAttribute: BufferAttribute;

  constructor(material: PointsMaterial, group: NozzlePartId, count: number) {
    const cloud = new PointCloud(count * PLUME.puffs, material, RENDER_ORDER.plume);
    cloud.points.name = plumeName(group);
    const scales = new Float32Array(count * PLUME.puffs);
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
    this.commit();
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

  constructor(context: PartContext, car: CarView) {
    const texture = context.tracker.track(puffTexture());
    const material = registered(context, 'jets', puffMaterial(texture, POINT_SIZE_PER_METRE));
    this.clouds = PLUME_GROUPS.map((group) => this.cloudFor(context, material, car, group));
    this.clouds.forEach((cloud) => this.object.add(cloud.points));
    this.object.add(this.label);
    this.object.visible = false;
    car.object.add(this.object);
  }

  setState(state: AssemblyState): void {
    let lead: Emitter | undefined;
    for (let group = 0; group < this.clouds.length; group++) {
      const cloud = this.clouds[group];
      cloud.setState(state);
      for (let index = 0; index < cloud.emitters.length; index++) {
        const emitter = cloud.emitters[index];
        if (emitter.firing && (!lead || emitter.length > lead.length)) lead = emitter;
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
      cloud.emitters.push(new Emitter(id, mouth, cloud.slots, index * PLUME.puffs));
    });
    return cloud;
  }

  private placeLabel(lead: Emitter): void {
    const { position, axis } = lead.mouth;
    this.label.position
      .copy(axis)
      .multiplyScalar(lead.length * PLUME.labelShare)
      .add(position);
  }
}
