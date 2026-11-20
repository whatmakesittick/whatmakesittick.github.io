export type ArrayKind = 'f32' | 'i32' | 'i16' | 'u16' | 'i8' | 'u8';

export type ArrayEntry = readonly [kind: ArrayKind, offset: number, count: number];

export interface RegionSummary {
  readonly name: string;
  readonly components: number;
  readonly vertices: number;
  readonly units: number;
}

export interface FigureData {
  readonly vertexCount: number;
  readonly triangleCount: number;
  readonly jointCount: number;
  readonly positionStep: number;
  readonly weightOne: number;
  readonly statureM: number;
  readonly jointNames: readonly string[];
  readonly parameterNames: readonly string[];
  readonly fixedParameters: Readonly<Record<string, number>>;
  readonly layerUnits: number;
  readonly regions: readonly RegionSummary[];
  readonly arrays: Readonly<Record<string, ArrayEntry>>;
  readonly bytes: string;
}
