import type { Material, Mesh, Object3D } from 'three';

export interface OcclusionHit {
  object: Object3D;
  face?: { materialIndex: number } | null;
}

export type PartOf = (material: Material) => string | undefined;

export interface OcclusionRule {
  hideDepth: number;
  showDepth: number;
  hideSeconds: number;
  showSeconds: number;
}

export interface OcclusionState {
  occluded: boolean;
  pendingSeconds?: number;
}

export const OCCLUSION_RULE: Readonly<OcclusionRule> = {
  hideDepth: 0.03,
  showDepth: 0.015,
  hideSeconds: 0.6,
  showSeconds: 0.15,
};

const OPAQUE = 1;
const FIRST_MATERIAL = 0;

export function isMesh(object: Object3D): object is Mesh {
  return (object as Partial<Mesh>).isMesh === true;
}

export function isSolid(material: Material): boolean {
  return material.visible && !(material.transparent && material.opacity < OPAQUE);
}

export function hitMaterial(hit: OcclusionHit): Material | undefined {
  if (!isMesh(hit.object)) return undefined;
  const { material } = hit.object;
  if (!Array.isArray(material)) return material;
  return material[hit.face?.materialIndex ?? FIRST_MATERIAL];
}

export function isBlocking(hit: OcclusionHit, part: string, partOf: PartOf): boolean {
  const material = hitMaterial(hit);
  return material !== undefined && isSolid(material) && partOf(material) !== part;
}

export function blockingReach(
  anchorDistance: number,
  occluded: boolean,
  rule: OcclusionRule = OCCLUSION_RULE,
): number {
  const depth = occluded ? rule.showDepth : rule.hideDepth;
  return anchorDistance * (1 - depth);
}

export function nextOcclusion(
  state: OcclusionState | undefined,
  blocked: boolean,
  elapsedSeconds: number,
  rule: OcclusionRule = OCCLUSION_RULE,
): OcclusionState {
  if (!state || blocked === state.occluded) return { occluded: blocked };
  if (state.pendingSeconds === undefined) return { occluded: state.occluded, pendingSeconds: 0 };
  const pendingSeconds = state.pendingSeconds + elapsedSeconds;
  const delay = blocked ? rule.hideSeconds : rule.showSeconds;
  if (pendingSeconds >= delay) return { occluded: blocked };
  return { occluded: state.occluded, pendingSeconds };
}

export function isPending(state: OcclusionState): boolean {
  return state.pendingSeconds !== undefined;
}
