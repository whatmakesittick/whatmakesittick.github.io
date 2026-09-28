import type { BloodPath } from './bloodPath';

export interface FlowScale {
  readonly mmPerMsPerMl: number;
  readonly meanFlow: number;
  readonly referenceRadius: number;
  readonly minimumRadius: number;
  readonly complianceMm: number;
}

export interface ValveFlows {
  readonly inlet: number;
  readonly outlet: number;
}

function lerp(from: number, to: number, share: number): number {
  return from + (to - from) * Math.min(Math.max(share, 0), 1);
}

export function fluxAt(
  path: BloodPath,
  distance: number,
  flows: ValveFlows,
  scale: FlowScale,
): number {
  const { atrium, ventricle, artery } = path.gates;
  if (distance < atrium) return scale.meanFlow;
  if (distance < ventricle)
    return lerp(scale.meanFlow, flows.inlet, (distance - atrium) / (ventricle - atrium));
  if (distance < artery)
    return lerp(flows.inlet, flows.outlet, (distance - ventricle) / (artery - ventricle));
  return lerp(flows.outlet, scale.meanFlow, (distance - artery) / scale.complianceMm);
}

export function speedAt(
  path: BloodPath,
  distance: number,
  flows: ValveFlows,
  scale: FlowScale,
  radius: number,
): number {
  const width = Math.max(radius, scale.minimumRadius) / scale.referenceRadius;
  return (scale.mmPerMsPerMl * fluxAt(path, distance, flows, scale)) / (width * width);
}
