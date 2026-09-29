import { lineStrand, smoothStrand } from './profile';
import type { ProfilePoint, ShellSpec, Strand } from './revolve';

export interface ShellProfile {
  outer: readonly ProfilePoint[];
  inner: readonly ProfilePoint[];
}

export interface TemplateScale {
  radius: number;
  from: readonly [top: number, bottom: number];
  to: readonly [top: number, bottom: number];
}

export function scaleProfile(
  points: readonly ProfilePoint[],
  scale: TemplateScale,
): ProfilePoint[] {
  const [fromTop, fromBottom] = scale.from;
  const [toTop, toBottom] = scale.to;
  return points.map(([radius, y]) => {
    const share = (y - fromTop) / (fromBottom - fromTop);
    return [radius * scale.radius, toTop + (toBottom - toTop) * share] as const;
  });
}

export function closedShell(outer: Strand, inner: Strand): ShellSpec {
  const outerEnd = outer[outer.length - 1];
  const innerEnd = inner[inner.length - 1];
  return {
    outline: [
      { strand: outer },
      { strand: lineStrand(outerEnd, inner[0]) },
      { strand: inner, inner: true },
      { strand: lineStrand(innerEnd, outer[0]) },
    ],
  };
}

export function smoothShell(profile: ShellProfile, samples: number): ShellSpec {
  return closedShell(smoothStrand(profile.outer, samples), smoothStrand(profile.inner, samples));
}
