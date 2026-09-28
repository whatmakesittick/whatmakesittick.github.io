import { Group } from 'three';
import type { PartContext } from '../context';
import { HeadPart } from './head';
import { RotorPart } from './rotor';
import { StatorPart } from './stator';

export class MotorPart {
  readonly object = new Group();
  readonly rotor: RotorPart;
  readonly stator: StatorPart;
  readonly head: HeadPart;

  constructor(context: PartContext, bladeCount: number) {
    this.rotor = new RotorPart(context, bladeCount);
    this.stator = new StatorPart(context, bladeCount);
    this.head = new HeadPart(context);
    this.object.add(this.rotor.object, this.stator.object, this.head.object);
  }

  setAngle(rotorDeg: number): void {
    this.rotor.setAngle(rotorDeg);
  }

  setBladeCount(bladeCount: number): void {
    this.rotor.setBladeCount(bladeCount);
    this.stator.setBladeCount(bladeCount);
  }

  setCutaway(cutaway: boolean): void {
    this.head.setCutaway(cutaway);
  }
}
