import { BufferAttribute, Color, Vector3 } from 'three';
import type { Object3D, PointsMaterial } from 'three';
import { clamp, lerp, smoothstep } from '@core/math';
import { PointCloud } from '@core/scene/pointCloud';
import { REAR_NOZZLE_IDS } from '../../../ids';
import type { AssemblyState } from '../../../ids';
import { REAR_THRUST_FULL_N } from '../../../model/constants';
import { between, seededRandom } from '../../geometry/effects/random';
import type { Random } from '../../geometry/effects/random';
import type { PartContext } from '../context';
import type { CarView } from '../types';
import { GROUND_HAZE, RENDER_ORDER } from './constants';
import { firingThrust } from './firing';
import { plumeLength } from '../../../model/plume';
import { plumeReach } from './plumeShape';
import { mouthInCar } from './mouth';
import { PUFF_SCALE_ATTRIBUTE } from './puffMaterial';

export const GROUND_HAZE_NAME = 'groundHaze';

const FULL_THRUST_EACH = REAR_THRUST_FULL_N / REAR_NOZZLE_IDS.length;
const TONE = new Color(GROUND_HAZE.tone);
const FADE_POWER = 1.5;

interface HazePuff {
  alive: boolean;
  age: number;
  life: number;
  x: number;
  y: number;
  z: number;
  side: number;
  size: number;
  strength: number;
}

export function hazeStrength(thrustEach: number, height: number): number {
  const share = clamp(thrustEach / FULL_THRUST_EACH, 0, 1);
  const { full, none } = GROUND_HAZE.near;
  return share * (1 - smoothstep(height, full, none));
}

function rearThrust(state: AssemblyState): number {
  let total = 0;
  for (let index = 0; index < REAR_NOZZLE_IDS.length; index++) {
    total += firingThrust(state, REAR_NOZZLE_IDS[index]);
  }
  return total / REAR_NOZZLE_IDS.length;
}

export class GroundHaze {
  readonly points: Object3D;
  private readonly cloud: PointCloud;
  private readonly scales = new Float32Array(GROUND_HAZE.puffs);
  private readonly scaleAttribute = new BufferAttribute(this.scales, 1);
  private readonly puffs: HazePuff[];
  private readonly random: Random = seededRandom(GROUND_HAZE.seed);
  private readonly car: Object3D;
  private readonly tail = new Vector3();
  private readonly origin = new Vector3();
  private readonly last = new Vector3();
  private readonly axis = new Vector3();
  private strength = 0;
  private reach = 0;
  private speed = 0;

  constructor(context: PartContext, car: CarView, material: PointsMaterial) {
    this.car = car.object;
    this.cloud = context.tracker.track(
      new PointCloud(GROUND_HAZE.puffs, material, RENDER_ORDER.plume),
    );
    this.cloud.points.geometry.setAttribute(PUFF_SCALE_ATTRIBUTE, this.scaleAttribute);
    this.cloud.points.name = GROUND_HAZE_NAME;
    this.cloud.points.visible = false;
    this.points = this.cloud.points;
    this.puffs = Array.from({ length: GROUND_HAZE.puffs }, () => ({
      alive: false,
      age: 0,
      life: 1,
      x: 0,
      y: 0,
      z: 0,
      side: 1,
      size: 1,
      strength: 0,
    }));
    REAR_NOZZLE_IDS.forEach((id) => this.tail.add(mouthInCar(this.car, car.nozzle(id)).position));
    this.tail.divideScalar(REAR_NOZZLE_IDS.length);
  }

  setState(state: AssemblyState): void {
    const thrust = rearThrust(state);
    this.car.updateWorldMatrix(true, false);
    this.last.copy(this.origin);
    this.origin.copy(this.tail).applyMatrix4(this.car.matrixWorld);
    this.axis.set(-1, 0, 0).transformDirection(this.car.matrixWorld).setY(0).normalize();
    this.strength = hazeStrength(thrust, this.origin.y);
    this.reach = plumeReach(plumeLength(thrust, state.gas), 'rearNozzles');
    this.speed = state.car.speed;
    const jumped = Math.abs(this.origin.x - this.last.x) > GROUND_HAZE.rescatter;
    if (jumped || !this.points.visible) this.scatter();
    this.layout();
  }

  advance(deltaSeconds: number): boolean {
    if (!this.points.visible) return false;
    for (let index = 0; index < this.puffs.length; index++) {
      const puff = this.puffs[index];
      puff.age += deltaSeconds;
      if (puff.age >= puff.life) this.respawn(puff, 0);
    }
    this.layout();
    return this.points.visible;
  }

  private emitting(): boolean {
    return this.strength > GROUND_HAZE.shown;
  }

  private scatter(): void {
    for (let index = 0; index < this.puffs.length; index++) {
      const puff = this.puffs[index];
      this.respawn(puff, this.random());
      puff.x += this.axis.x * this.speed * puff.age;
      puff.z += this.axis.z * this.speed * puff.age;
    }
  }

  private respawn(puff: HazePuff, share: number): void {
    const { reach, width, height, lifeSeconds } = GROUND_HAZE;
    puff.alive = this.emitting();
    puff.life = between(this.random, lifeSeconds[0], lifeSeconds[1]);
    puff.age = share * puff.life;
    puff.strength = this.strength;
    const along = this.reach * between(this.random, reach.from, reach.to);
    const across = (this.random() * 2 - 1) * width * this.reach;
    puff.side = Math.sign(across) || 1;
    puff.x = this.origin.x + this.axis.x * along - this.axis.z * across;
    puff.z = this.origin.z + this.axis.z * along + this.axis.x * across;
    puff.y = between(this.random, height[0], height[1]);
    puff.size = between(this.random, GROUND_HAZE.sizeJitter[0], GROUND_HAZE.sizeJitter[1]);
  }

  private layout(): void {
    const { back, out, up } = GROUND_HAZE.roll;
    const { diameter, opacity, fadeIn } = GROUND_HAZE;
    let alive = false;
    for (let index = 0; index < this.puffs.length; index++) {
      const puff = this.puffs[index];
      const age = puff.age / puff.life;
      const spread = puff.side * out * Math.sqrt(puff.age);
      this.cloud.setPoint(
        index,
        puff.x + this.axis.x * back * puff.age - this.axis.z * spread,
        puff.y + up * puff.age,
        puff.z + this.axis.z * back * puff.age + this.axis.x * spread,
      );
      const fade = smoothstep(age, 0, fadeIn) * (1 - age) ** FADE_POWER;
      const alpha = puff.alive ? opacity * puff.strength * fade : 0;
      this.cloud.setColor(index, TONE.r, TONE.g, TONE.b, alpha);
      this.scales[index] = puff.alive ? lerp(diameter[0], diameter[1], age) * puff.size : 0;
      if (puff.alive) alive = true;
    }
    this.points.visible = alive;
    this.scaleAttribute.needsUpdate = true;
    this.cloud.commit();
  }
}
