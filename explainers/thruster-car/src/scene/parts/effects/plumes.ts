import { BufferAttribute, Color, Object3D } from 'three';
import type { PointsMaterial } from 'three';
import { FULL_TURN } from '@core/math';
import { PointCloud } from '@core/scene/pointCloud';
import { NOZZLE_IDS } from '../../../ids';
import type { AssemblyState, GasId, NozzleId } from '../../../ids';
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

interface Puff {
  progress: number;
  life: number;
  angle: number;
  offset: number;
  phase: number;
  size: number;
}

function freshPuff(random: Random, progress: number): Puff {
  return {
    progress,
    life: PLUME.lifeSeconds * between(random, 1 - PLUME.lifeJitter, 1 + PLUME.lifeJitter),
    angle: random() * FULL_TURN,
    offset: Math.sqrt(random()),
    phase: random() * FULL_TURN,
    size: between(random, PLUME.sizeJitter[0], PLUME.sizeJitter[1]),
  };
}

class Plume {
  readonly cloud: PointCloud;
  length = 0;
  private readonly scales = new Float32Array(PLUME.puffs);
  private readonly scaleAttribute = new BufferAttribute(this.scales, 1);
  private readonly random: Random;
  private readonly colour = new Color();
  private readonly shape: PuffShape = { distance: 0, radius: 0, diameter: 0, alpha: 0 };
  private puffs: Puff[] = [];
  private gas: GasId = 'air';
  private time = 0;

  constructor(material: PointsMaterial, seed: number) {
    this.cloud = new PointCloud(PLUME.puffs, material, RENDER_ORDER.plume);
    this.cloud.points.geometry.setAttribute(PUFF_SCALE_ATTRIBUTE, this.scaleAttribute);
    this.cloud.points.visible = false;
    this.random = seededRandom(seed);
    this.clear();
  }

  get firing(): boolean {
    return this.cloud.points.visible;
  }

  setState(thrust: number, gas: GasId): void {
    const wasFiring = this.firing;
    this.length = plumeLength(thrust, gas);
    this.gas = gas;
    this.colour.set(PLUME_COLOURS[gas]);
    this.cloud.points.visible = this.length > 0;
    if (wasFiring && !this.firing) this.clear();
    if (this.firing) this.layout();
  }

  advance(deltaSeconds: number): boolean {
    if (!this.firing) return false;
    this.time += deltaSeconds;
    this.puffs = this.puffs.map((puff) => this.aged(puff, deltaSeconds));
    this.layout();
    return true;
  }

  private clear(): void {
    this.time = 0;
    this.puffs = Array.from({ length: PLUME.puffs }, (_, index) =>
      freshPuff(this.random, (index + this.random()) / PLUME.puffs),
    );
  }

  private aged(puff: Puff, deltaSeconds: number): Puff {
    const progress = puff.progress + deltaSeconds / puff.life;
    if (progress < 1) return { ...puff, progress };
    return freshPuff(this.random, progress % 1);
  }

  private layout(): void {
    const look = PLUME_LOOKS[this.gas];
    const { sway, flicker } = PLUME;
    const { r, g, b } = this.colour;
    this.puffs.forEach((puff, index) => {
      const shape = puffShape(puff.progress, this.length, look, this.shape);
      const swing = sway.amplitude * shape.distance;
      const turn = this.time * sway.rate + puff.phase + shape.distance * sway.lag;
      const across = shape.radius * puff.offset;
      this.cloud.setPoint(
        index,
        Math.cos(puff.angle) * across + swing * Math.sin(turn),
        shape.distance,
        Math.sin(puff.angle) * across + swing * Math.cos(turn * sway.ratio),
      );
      const shimmer =
        1 - flicker.depth * (0.5 + 0.5 * Math.sin(this.time * flicker.rate + puff.phase));
      this.cloud.setColor(index, r, g, b, shape.alpha * shimmer);
      this.scales[index] = shape.diameter * puff.size;
    });
    this.scaleAttribute.needsUpdate = true;
    this.cloud.commit();
  }
}

export class Plumes {
  readonly label = new Object3D();
  private readonly plumes: Readonly<Record<NozzleId, Plume>>;

  constructor(context: PartContext, car: CarView) {
    const texture = context.tracker.track(puffTexture());
    const material = registered(context, 'jets', puffMaterial(texture, POINT_SIZE_PER_METRE));
    this.plumes = Object.fromEntries(
      NOZZLE_IDS.map((id, index) => {
        const plume = new Plume(material, PLUME.seed + index);
        context.tracker.track(plume.cloud);
        car.nozzle(id).add(plume.cloud.points);
        return [id, plume];
      }),
    ) as Record<NozzleId, Plume>;
    this.plumes[NOZZLE_IDS[0]].cloud.points.add(this.label);
  }

  setState(state: AssemblyState): void {
    NOZZLE_IDS.forEach((id) => this.plumes[id].setState(firingThrust(state, id), state.gas));
    this.placeLabel();
  }

  advance(deltaSeconds: number): boolean {
    return NOZZLE_IDS.map((id) => this.plumes[id].advance(deltaSeconds)).some(Boolean);
  }

  isFiring(id: NozzleId): boolean {
    return this.plumes[id].firing;
  }

  private placeLabel(): void {
    const lead = NOZZLE_IDS.map((id) => this.plumes[id])
      .filter((plume) => plume.firing)
      .reduce<Plume | undefined>(
        (best, plume) => (!best || plume.length > best.length ? plume : best),
        undefined,
      );
    if (!lead) return;
    lead.cloud.points.add(this.label);
    this.label.position.set(0, lead.length * PLUME.labelShare, 0);
  }
}
