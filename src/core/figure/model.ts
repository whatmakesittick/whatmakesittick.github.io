export interface SkinWeights {
  readonly start: Uint32Array;
  readonly joints: Uint8Array;
  readonly weights: Float32Array;
}

export interface SkeletonModel {
  readonly parents: Int16Array;
  readonly offsets: Float64Array;
  readonly preRotations: Float64Array;
  readonly bindRotations: Float64Array;
  readonly bindTranslations: Float64Array;
  readonly bindScales: Float64Array;
}

export interface ParameterTransform {
  readonly rows: Uint16Array;
  readonly columns: Uint16Array;
  readonly values: Float32Array;
  readonly baked: Float64Array;
}

export interface FirstLayer {
  readonly start: Uint32Array;
  readonly columns: Uint16Array;
  readonly values: Float32Array;
}

export interface CorrectiveRegion {
  readonly vertices: Uint16Array;
  readonly units: Uint16Array;
  readonly components: number;
  readonly unitWeights: Int16Array;
  readonly vertexWeights: Int8Array;
  readonly scales: Float64Array;
}

export interface CorrectiveModel {
  readonly firstLayer: FirstLayer;
  readonly regions: readonly CorrectiveRegion[];
}

export interface FigureModel {
  readonly vertexCount: number;
  readonly jointCount: number;
  readonly rest: Float32Array;
  readonly indices: Uint16Array;
  readonly skin: SkinWeights;
  readonly skeleton: SkeletonModel;
  readonly transform: ParameterTransform;
  readonly correctives: CorrectiveModel;
  readonly jointNames: readonly string[];
  readonly parameterNames: readonly string[];
}
