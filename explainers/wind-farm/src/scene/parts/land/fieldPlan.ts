import type { GroundPoint } from '../../../model/layout';

type Range = readonly [number, number];

export interface Bounds {
  readonly minX: number;
  readonly maxX: number;
  readonly minZ: number;
  readonly maxZ: number;
}

export interface FieldLook {
  readonly weights: readonly number[];
  readonly muting: number;
  readonly toneSpread: number;
  readonly hedgeMuting: number;
}

export interface FieldPlan {
  readonly bounds: Bounds;
  readonly size: Range;
  readonly near?: { readonly scale: number; readonly from: number; readonly to: number };
  readonly block: number;
  readonly angles: readonly number[];
  readonly cutShare: Range;
  readonly cutJitter: number;
  readonly woodShare: number;
  readonly hedge: {
    readonly share: number;
    readonly run: Range;
    readonly gapChance: number;
    readonly gap: Range;
  };
  readonly track: { readonly count: number; readonly minLength: number };
  readonly farmstead: {
    readonly share: number;
    readonly offset: Range;
    readonly yard: Range;
    readonly buildings: Range;
    readonly length: Range;
    readonly width: Range;
    readonly spread: number;
  };
  readonly look: FieldLook;
  readonly seed: number;
}

export interface GroundRules {
  wooded(x: number, z: number): boolean;
  hedged(x: number, z: number): boolean;
}

export interface Field {
  readonly corners: readonly GroundPoint[];
  readonly angle: number;
  readonly kind: number;
  readonly tone: number;
  readonly wood: boolean;
}

export interface Run {
  readonly from: GroundPoint;
  readonly to: GroundPoint;
}

export interface Building {
  readonly centre: GroundPoint;
  readonly length: number;
  readonly width: number;
  readonly roof: number;
}

export interface Farmstead {
  readonly centre: GroundPoint;
  readonly angle: number;
  readonly yard: readonly [number, number];
  readonly buildings: readonly Building[];
}

export interface FieldLayout {
  readonly fields: readonly Field[];
  readonly hedges: readonly Run[];
  readonly tracks: readonly Run[];
  readonly farmsteads: readonly Farmstead[];
  readonly look: FieldLook;
}
