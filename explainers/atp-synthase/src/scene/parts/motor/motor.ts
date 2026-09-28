import { Group } from 'three';
import type { PartContext } from '../context';
import { HeadPart } from './head';
import type { MotorLook } from './look';
import { RotorPart } from './rotor';
import { StatorPart } from './stator';

export class MotorPart {
  readonly object = new Group();
  readonly rotor: RotorPart;
  readonly stator: StatorPart;
  readonly head: HeadPart;

  constructor(context: PartContext, look: MotorLook, bladeCount: number) {
    this.rotor = new RotorPart(context, look, bladeCount);
    this.stator = new StatorPart(context, look, bladeCount);
    this.head = new HeadPart(context, look);
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
