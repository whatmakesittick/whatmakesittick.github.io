export interface SpiralSegment {
  readonly fromRadius: number;
  readonly toRadius: number;
  readonly fromAngle: number;
  readonly sweep: number;
  readonly samples: number;
}

const XY = 2;

export function spiralSampleCount(segments: readonly SpiralSegment[]): number {
  return segments.reduce((total, segment) => total + segment.samples, 0) + 1;
}

function writePoint(target: Float32Array, index: number, radius: number, angle: number): void {
  target[index * XY] = radius * Math.cos(angle);
  target[index * XY + 1] = radius * Math.sin(angle);
}

export function writeSpiral(target: Float32Array, segments: readonly SpiralSegment[]): void {
  let index = 0;
  segments.forEach((segment) => {
    for (let step = 0; step < segment.samples; step += 1) {
      const t = step / segment.samples;
      const radius = segment.fromRadius + (segment.toRadius - segment.fromRadius) * t;
      writePoint(target, index, radius, segment.fromAngle + segment.sweep * t);
      index += 1;
    }
  });
  const last = segments[segments.length - 1];
  writePoint(target, index, last.toRadius, last.fromAngle + last.sweep);
}

export function spiralPath(segments: readonly SpiralSegment[]): Float32Array {
  const path = new Float32Array(spiralSampleCount(segments) * XY);
  writeSpiral(path, segments);
  return path;
}

export function chained(
  start: { radius: number; angle: number },
  parts: readonly Omit<SpiralSegment, 'fromRadius' | 'fromAngle'>[],
): SpiralSegment[] {
  let radius = start.radius;
  let angle = start.angle;
  return parts.map((part) => {
    const segment = { ...part, fromRadius: radius, fromAngle: angle };
    radius = part.toRadius;
    angle += part.sweep;
    return segment;
  });
}
