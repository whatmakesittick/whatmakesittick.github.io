import { Group, Object3D, Quaternion, Vector3 } from 'three';
import { NOZZLE_IDS } from '../../../ids';
import type { AssemblyState, NozzleId } from '../../../ids';
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
import type { ArrowShapes } from './forceArrow';

const DOWN = new Vector3(0, -1, 0);
const PLUME_AXIS = new Vector3(0, 1, 0);

export function forceLength(newtons: number): number {
  return (newtons / NEWTONS_PER_KN) * METRES_PER_KN;
}

export const WEIGHT_LENGTH = forceLength(CAR_MASS_KG * G);

export function netThrustInCar(state: FiringState, target: Vector3): Vector3 {
  target.set(0, 0, 0);
  NOZZLE_IDS.forEach((id) => {
    const [x, y, z] = NOZZLES[id].dir;
    const thrust = firingThrust(state, id);
    target.x -= x * thrust;
    target.y -= y * thrust;
    target.z -= z * thrust;
  });
  return target;
}

export class ForceArrows {
  readonly object = new Group();
  readonly label = new Object3D();
  private readonly weight: ForceArrow;
  private readonly net: ForceArrow;
  private readonly pushes: Readonly<Record<NozzleId, ForceArrow>>;
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
    this.pushes = Object.fromEntries(
      NOZZLE_IDS.map((id) => [id, new ForceArrow(shapes, thrustTone, NOZZLE_ARROW, true)]),
    ) as Record<NozzleId, ForceArrow>;
    this.arrows().forEach((arrow) => this.object.add(arrow.object));
    this.object.add(this.label);
    this.object.visible = false;
  }

  setState(state: AssemblyState): void {
    const shown = state.view.forces;
    if (!shown && this.object.visible) this.arrows().forEach((arrow) => arrow.reset());
    this.object.visible = shown;
    if (!shown) return;
    this.car.anchors.car.getWorldPosition(this.centre);
    this.car.object.getWorldQuaternion(this.turn);
    this.weight.aim(this.centre, DOWN, WEIGHT_LENGTH);
    const net = netThrustInCar(state, this.direction).applyQuaternion(this.turn);
    const netLength = forceLength(net.length());
    this.net.aim(this.centre, net.normalize(), netLength);
    NOZZLE_IDS.forEach((id) => this.aimPush(id, firingThrust(state, id)));
    this.placeLabel();
  }

  advance(deltaSeconds: number): boolean {
    if (!this.object.visible) return false;
    const moving = this.arrows()
      .map((arrow) => arrow.advance(deltaSeconds))
      .some(Boolean);
    if (moving) this.placeLabel();
    return moving;
  }

  private aimPush(id: NozzleId, thrust: number): void {
    const nozzle = this.car.nozzle(id);
    nozzle.getWorldPosition(this.mouth);
    nozzle.getWorldQuaternion(this.turn);
    const push = this.direction.copy(PLUME_AXIS).applyQuaternion(this.turn).negate();
    this.pushes[id].aim(this.mouth, push, forceLength(thrust));
  }

  private placeLabel(): void {
    this.weight.object.updateMatrix();
    this.weight.tip(this.label.position);
  }

  private arrows(): ForceArrow[] {
    return [this.weight, this.net, ...NOZZLE_IDS.map((id) => this.pushes[id])];
  }
}
