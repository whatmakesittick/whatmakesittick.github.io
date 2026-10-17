import { DynamicDrawUsage, Group, InstancedMesh, Matrix4 } from 'three';
import type { BufferGeometry, Material, Object3D } from 'three';
import { anchorAt } from '@core/scene/parts';
import type { AssemblyState, Point } from '../../../ids';
import { CALIPER, caliperGeometry, discGeometry, discTexture } from '../../geometry/gear/brake';
import { HALF_TURN } from '../../geometry/gear/lathe';
import { blurGeometry, blurTexture, rimHubGeometry, spokesGeometry } from '../../geometry/gear/rim';
import { treadTexture, tyreGeometry } from '../../geometry/gear/tyre';
import type { PartContext } from '../context';
import { WHEEL, WHEEL_CENTRES } from './dimensions';
import { GEAR_FINISHES, GEAR_PAINT, rimBlurFinish, rotorFinish, tyreFinish } from './gearFinishes';

const PART = 'wheels';

export const BLUR_FROM_SPEED_MS = 6;

const LABEL_OUTSET = 0.16;

export interface WheelSet {
  readonly object: Group;
  readonly label: Object3D;
  setState(state: AssemblyState): void;
}

interface Spinners {
  tyre: InstancedMesh;
  hub: InstancedMesh;
  spokes: InstancedMesh;
  disc: InstancedMesh;
  blur: InstancedMesh;
}

export function wheelTurn(distance: number): number {
  return -distance / WHEEL.radius;
}

export function isBlurred(speed: number): boolean {
  return Math.abs(speed) > BLUR_FROM_SPEED_MS;
}

export function isLeftWheel(centre: Point): boolean {
  return centre[2] < 0;
}

function wheelBase(centre: Point): Matrix4 {
  const base = new Matrix4().makeTranslation(...centre);
  return isLeftWheel(centre) ? base.multiply(new Matrix4().makeRotationY(HALF_TURN)) : base;
}

function caliperPose(centre: Point): Matrix4 {
  const turn = isLeftWheel(centre) ? HALF_TURN - 2 * CALIPER.angle : 0;
  return wheelBase(centre).multiply(new Matrix4().makeRotationZ(turn));
}

function instanced(
  context: PartContext,
  geometry: BufferGeometry,
  material: Material,
): InstancedMesh {
  const mesh = new InstancedMesh(context.tracker.track(geometry), material, WHEEL_CENTRES.length);
  mesh.instanceMatrix.setUsage(DynamicDrawUsage);
  return mesh;
}

function spinners(context: PartContext): Spinners {
  const { materials, tracker } = context;
  const tones = { lip: GEAR_PAINT.machined, inner: GEAR_PAINT.rimInner };
  const blur = instanced(
    context,
    blurGeometry(),
    materials.get(PART, rimBlurFinish(tracker.track(blurTexture()))),
  );
  blur.visible = false;
  return {
    tyre: instanced(
      context,
      tyreGeometry(),
      materials.get(PART, tyreFinish(tracker.track(treadTexture()))),
    ),
    hub: instanced(context, rimHubGeometry(tones), materials.get(PART, GEAR_FINISHES.rimHub)),
    spokes: instanced(context, spokesGeometry(), materials.get(PART, GEAR_FINISHES.rimGraphite)),
    disc: instanced(
      context,
      discGeometry(),
      materials.get(PART, rotorFinish(tracker.track(discTexture()))),
    ),
    blur,
  };
}

function calipers(context: PartContext): InstancedMesh {
  const mesh = instanced(
    context,
    caliperGeometry(),
    context.materials.get(PART, GEAR_FINISHES.caliper),
  );
  WHEEL_CENTRES.forEach((centre, index) => mesh.setMatrixAt(index, caliperPose(centre)));
  mesh.computeBoundingSphere();
  return mesh;
}

function labelledCentre(): Point {
  return WHEEL_CENTRES.find((centre) => centre[0] > 0 && !isLeftWheel(centre)) ?? WHEEL_CENTRES[0];
}

export function createWheels(context: PartContext): WheelSet {
  const meshes = spinners(context);
  const spinning = Object.values(meshes);
  const bases = WHEEL_CENTRES.map(wheelBase);
  const sides = WHEEL_CENTRES.map((centre) => (isLeftWheel(centre) ? -1 : 1));
  const spin = new Matrix4();
  const pose = new Matrix4();
  const object = new Group();
  object.add(...spinning, calipers(context));
  const [x, y, z] = labelledCentre();
  const label = anchorAt(object, x, y, z + LABEL_OUTSET);
  const turnTo = (turn: number) => {
    for (let wheel = 0; wheel < bases.length; wheel += 1) {
      pose.multiplyMatrices(bases[wheel], spin.makeRotationZ(sides[wheel] * turn));
      for (let index = 0; index < spinning.length; index += 1)
        spinning[index].setMatrixAt(wheel, pose);
    }
    for (let index = 0; index < spinning.length; index += 1) {
      spinning[index].instanceMatrix.needsUpdate = true;
    }
  };
  turnTo(0);
  spinning.forEach((mesh) => mesh.computeBoundingSphere());
  return {
    object,
    label,
    setState(state) {
      turnTo(wheelTurn(state.car.position[0]));
      const blurred = isBlurred(state.car.speed);
      meshes.spokes.visible = !blurred;
      meshes.blur.visible = blurred;
    },
  };
}
