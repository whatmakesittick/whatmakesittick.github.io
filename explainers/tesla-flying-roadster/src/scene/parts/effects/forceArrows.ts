import { Group, Object3D, Quaternion, Vector3 } from 'three';
import { NOZZLE_IDS } from '../../../ids';
import type { AssemblyState } from '../../../ids';
import { NOZZLES } from '../../../model/layout';
import { CAR_MASS_KG, G } from '../../../model/constants';
import { unitHead, unitShaft } from '../../geometry/effects/arrow';
import type { PartContext } from '../context';
import type { CarView } from '../types';
import {
  ARROW_FINISHES,
  MAIN_ARROW,
  METRES_PER_KN,
  NEWTONS_PER_KN,
  NOZZLE_ARROW,
} from './constants';
import { firingThrust } from './firing';
import type { FiringState } from './firing';
import { ForceArrow } from './forceArrow';
import { PLUME_AXIS } from './mouth';
import type { ArrowShapes } from './forceArrow';

const DOWN = new Vector3(0, -1, 0);

export function forceLength(newtons: number): number {
  return (newtons / NEWTONS_PER_KN) * METRES_PER_KN;
}

export const WEIGHT_LENGTH = forceLength(CAR_MASS_KG * G);

export function netThrustInCar(state: FiringState, target: Vector3): Vector3 {
  target.set(0, 0, 0);
  for (let index = 0; index < NOZZLE_IDS.length; index++) {
    const id = NOZZLE_IDS[index];
    const dir = NOZZLES[id].dir;
    const thrust = firingThrust(state, id);
    target.x -= dir[0] * thrust;
    target.y -= dir[1] * thrust;
    target.z -= dir[2] * thrust;
  }
  return target;
}

export class ForceArrows {
  readonly object = new Group();
  readonly label = new Object3D();
  private readonly weight: ForceArrow;
  private readonly net: ForceArrow;
  private readonly pushes: readonly ForceArrow[];
  private readonly all: readonly ForceArrow[];
  private readonly mouths: readonly Object3D[];
  private readonly centre = new Vector3();
  private readonly mouth = new Vector3();
  private readonly turn = new Quaternion();
  private readonly direction = new Vector3();
  private readonly car: CarView;

  constructor(context: PartContext, car: CarView) {
    this.car = car;
    const shapes: ArrowShapes = {
      shaft: context.tracker.track(unitShaft()),
      head: context.tracker.track(unitHead()),
    };
    const weightTone = context.materials.get('forceArrows', ARROW_FINISHES.weight);
    const thrustTone = context.materials.get('forceArrows', ARROW_FINISHES.thrust);
    this.weight = new ForceArrow(shapes, weightTone, MAIN_ARROW);
    this.net = new ForceArrow(shapes, thrustTone, MAIN_ARROW);
    this.pushes = NOZZLE_IDS.map(() => new ForceArrow(shapes, thrustTone, NOZZLE_ARROW, true));
    this.mouths = NOZZLE_IDS.map((id) => car.nozzle(id));
    this.all = [this.weight, this.net, ...this.pushes];
    this.all.forEach((arrow) => this.object.add(arrow.object));
    this.object.add(this.label);
    this.object.visible = false;
  }

  setState(state: AssemblyState): void {
    const shown = state.view.forces;
    if (!shown && this.object.visible) this.resetAll();
    this.object.visible = shown;
    if (!shown) return;
    this.car.anchors.car.getWorldPosition(this.centre);
    this.car.object.getWorldQuaternion(this.turn);
    this.weight.aim(this.centre, DOWN, WEIGHT_LENGTH);
    const net = netThrustInCar(state, this.direction).applyQuaternion(this.turn);
    const netLength = forceLength(net.length());
    this.net.aim(this.centre, net.normalize(), netLength);
    for (let index = 0; index < NOZZLE_IDS.length; index++) {
      this.aimPush(index, firingThrust(state, NOZZLE_IDS[index]));
    }
    this.placeLabel();
  }

  advance(deltaSeconds: number): boolean {
    if (!this.object.visible) return false;
    let moving = false;
    for (let index = 0; index < this.all.length; index++) {
      if (this.all[index].advance(deltaSeconds)) moving = true;
    }
    if (moving) this.placeLabel();
    return moving;
  }

  private resetAll(): void {
    for (let index = 0; index < this.all.length; index++) this.all[index].reset();
  }

  private aimPush(index: number, thrust: number): void {
    const nozzle = this.mouths[index];
    nozzle.getWorldPosition(this.mouth);
    nozzle.getWorldQuaternion(this.turn);
    const push = this.direction.copy(PLUME_AXIS).applyQuaternion(this.turn).negate();
    this.pushes[index].aim(this.mouth, push, forceLength(thrust));
  }

  private placeLabel(): void {
    this.weight.object.updateMatrix();
    this.weight.tip(this.label.position);
  }
}
