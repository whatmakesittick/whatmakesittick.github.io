import { Matrix4 } from 'three';
import type { BufferGeometry } from 'three';
import { mergeParts } from '../../parts/context';
import { HALF_TURN } from '../gear/lathe';
import { wheelGeometry } from './wheel';
import type { WheelSpec } from './wheel';
import type { BodyPaint, SwatchUv } from './swatch';

export interface VehicleSize {
  length: number;
  width: number;
  height: number;
}

export interface Axle {
  x: number;
  z: number;
  spec: WheelSpec;
}

export interface VehicleModel {
  readonly design: VehicleSize;
  readonly axles: readonly Axle[];
  geometry(size: VehicleSize, paint: BodyPaint, uv: SwatchUv): BufferGeometry;
}

export interface WheelPrint {
  x: number;
  z: number;
  radius: number;
  width: number;
}

export interface Stretch {
  x: number;
  y: number;
  z: number;
}

export function stretchOf(size: VehicleSize, reference: VehicleSize): Stretch {
  return {
    x: size.length / reference.length,
    y: size.height / reference.height,
    z: size.width / reference.width,
  };
}

function scaledSpec(spec: WheelSpec, factor: number): WheelSpec {
  return {
    ...spec,
    radius: spec.radius * factor,
    rim: spec.rim * factor,
    width: spec.width * factor,
  };
}

function wheelScale(stretch: Stretch): number {
  return Math.min(stretch.x, stretch.y);
}

export function wheelPrints(model: VehicleModel, size: VehicleSize): WheelPrint[] {
  const stretch = stretchOf(size, model.design);
  const factor = wheelScale(stretch);
  return model.axles.flatMap((axle) =>
    [1, -1].map((side) => ({
      x: axle.x * stretch.x,
      z: side * axle.z * stretch.z,
      radius: axle.spec.radius * factor,
      width: axle.spec.width * factor,
    })),
  );
}

export function axleWheels(
  axles: readonly Axle[],
  stretch: Stretch,
  uv: SwatchUv,
): BufferGeometry[] {
  const factor = wheelScale(stretch);
  return axles.flatMap((axle) => {
    const spec = scaledSpec(axle.spec, factor);
    const wheel = wheelGeometry(spec, uv);
    const sides = [1, -1].map((side) => {
      const turn = new Matrix4().makeRotationY(side > 0 ? 0 : HALF_TURN);
      const place = new Matrix4().makeTranslation(
        axle.x * stretch.x,
        spec.radius,
        side * axle.z * stretch.z,
      );
      return wheel.clone().applyMatrix4(place.multiply(turn));
    });
    wheel.dispose();
    return sides;
  });
}

export function stretched(parts: readonly BufferGeometry[], stretch: Stretch): BufferGeometry {
  return mergeParts(parts).scale(stretch.x, stretch.y, stretch.z);
}
