import { Vector3 } from 'three';
import type { BufferGeometry, Vector2 } from 'three';
import { MeshBuilder } from './meshBuilder';

export type TubeArc = 'half' | 'full';

export interface PathSample {
  point: Vector2;
  tangent: Vector2;
}

export interface TubeSweepOptions {
  innerRadius: number;
  outerRadius: number;
  arc: TubeArc;
  radialSegments: number;
}

const FORWARD = new Vector3(0, 0, 1);

function arcRange(arc: TubeArc): [number, number] {
  return arc === 'half' ? [Math.PI, Math.PI * 2] : [0, Math.PI * 2];
}

function crossSectionDirection(sample: PathSample, angle: number): Vector3 {
  const normal = new Vector3(-sample.tangent.y, sample.tangent.x, 0);
  return normal.multiplyScalar(Math.cos(angle)).addScaledVector(FORWARD, Math.sin(angle));
}

function pointOnTube(sample: PathSample, angle: number, radius: number): Vector3 {
  return new Vector3(sample.point.x, sample.point.y, 0).addScaledVector(
    crossSectionDirection(sample, angle),
    radius,
  );
}

function addWall(
  builder: MeshBuilder,
  samples: readonly PathSample[],
  options: TubeSweepOptions,
  radius: number,
  facing: number,
): void {
  const [start, end] = arcRange(options.arc);
  const columns = options.radialSegments + 1;
  builder.grid(samples.length, columns, (row, column) => {
    const angle = start + ((end - start) * column) / options.radialSegments;
    return {
      position: pointOnTube(samples[row], angle, radius),
      normal: crossSectionDirection(samples[row], angle).multiplyScalar(facing),
    };
  });
}

function addRims(
  builder: MeshBuilder,
  samples: readonly PathSample[],
  options: TubeSweepOptions,
): void {
  arcRange(options.arc).forEach((angle) => {
    builder.grid(samples.length, 2, (row, column) => ({
      position: pointOnTube(
        samples[row],
        angle,
        column === 0 ? options.innerRadius : options.outerRadius,
      ),
      normal: FORWARD.clone(),
    }));
  });
}

function addEndRing(
  builder: MeshBuilder,
  sample: PathSample,
  options: TubeSweepOptions,
  facing: number,
): void {
  const [start, end] = arcRange(options.arc);
  const normal = new Vector3(sample.tangent.x, sample.tangent.y, 0).multiplyScalar(facing);
  builder.grid(options.radialSegments + 1, 2, (row, column) => {
    const angle = start + ((end - start) * row) / options.radialSegments;
    const radius = column === 0 ? options.innerRadius : options.outerRadius;
    return { position: pointOnTube(sample, angle, radius), normal: normal.clone() };
  });
}

export function sweptTube(
  samples: readonly PathSample[],
  options: TubeSweepOptions,
): BufferGeometry {
  const builder = new MeshBuilder();
  addWall(builder, samples, options, options.innerRadius, -1);
  addWall(builder, samples, options, options.outerRadius, 1);
  if (options.arc === 'half') addRims(builder, samples, options);
  addEndRing(builder, samples[0], options, -1);
  addEndRing(builder, samples[samples.length - 1], options, 1);
  return builder.build();
}
