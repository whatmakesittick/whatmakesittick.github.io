import { ArrayStore, varintReader } from './bytes';
import type { FigureData, RegionSummary } from './data';
import { JOINT_PARAMETERS } from './model';
import type {
  CorrectiveModel,
  CorrectiveRegion,
  FigureModel,
  FirstLayer,
  ParameterTransform,
  SkeletonModel,
  SkinWeights,
} from './model';

const AXES = 3;
const MATRIX = 9;

function decodeRest(data: FigureData, store: ArrayStore): Float32Array {
  const reader = varintReader(store.read('positions', 'u8'));
  const rest = new Float32Array(data.vertexCount * AXES);
  for (let axis = 0; axis < AXES; axis++) {
    let value = 0;
    for (let v = 0; v < data.vertexCount; v++) {
      value += reader.signed();
      rest[v * AXES + axis] = value * data.positionStep;
    }
  }
  return rest;
}

function decodeIndices(data: FigureData, store: ArrayStore): Uint16Array {
  const reader = varintReader(store.read('triangles', 'u8'));
  const indices = new Uint16Array(data.triangleCount * AXES);
  let value = 0;
  for (let i = 0; i < indices.length; i++) indices[i] = value += reader.signed();
  return indices;
}

function decodeSkin(data: FigureData, store: ArrayStore): SkinWeights {
  const counts = store.read('skinCounts', 'u8');
  const start = new Uint32Array(data.vertexCount + 1);
  for (let v = 0; v < data.vertexCount; v++) start[v + 1] = start[v] + counts[v];
  const raw = store.read('skinWeights', 'u16');
  const weights = new Float32Array(raw.length);
  for (let i = 0; i < raw.length; i++) weights[i] = raw[i] / data.weightOne;
  return { start, joints: store.read('skinJoints', 'u8').slice(), weights };
}

export function quaternionMatrix(x: number, y: number, z: number, w: number): number[] {
  return [
    1 - 2 * (y * y + z * z),
    2 * (x * y - z * w),
    2 * (x * z + y * w),
    2 * (x * y + z * w),
    1 - 2 * (x * x + z * z),
    2 * (y * z - x * w),
    2 * (x * z - y * w),
    2 * (y * z + x * w),
    1 - 2 * (x * x + y * y),
  ];
}

function quaternionMatrices(quaternions: ArrayLike<number>, stride: number): Float64Array {
  const count = quaternions.length / stride;
  const out = new Float64Array(count * MATRIX);
  for (let j = 0; j < count; j++) {
    const q = j * stride;
    const [x, y, z, w] = [
      quaternions[q],
      quaternions[q + 1],
      quaternions[q + 2],
      quaternions[q + 3],
    ];
    const length = Math.hypot(x, y, z, w);
    out.set(quaternionMatrix(x / length, y / length, z / length, w / length), j * MATRIX);
  }
  return out;
}

function decodeSkeleton(store: ArrayStore, jointCount: number): SkeletonModel {
  const bind = store.read('inverseBind', 'f32');
  const bindTranslations = new Float64Array(jointCount * AXES);
  const bindScales = new Float64Array(jointCount);
  const bindQuaternions = new Float64Array(jointCount * 4);
  for (let j = 0; j < jointCount; j++) {
    for (let a = 0; a < AXES; a++) bindTranslations[j * AXES + a] = bind[j * 8 + a];
    for (let a = 0; a < 4; a++) bindQuaternions[j * 4 + a] = bind[j * 8 + AXES + a];
    bindScales[j] = bind[j * 8 + 7];
  }
  return {
    parents: store.read('parents', 'i16').slice(),
    offsets: Float64Array.from(store.read('offsets', 'f32')),
    preRotations: quaternionMatrices(store.read('prerotations', 'f32'), 4),
    bindRotations: quaternionMatrices(bindQuaternions, 4),
    bindTranslations,
    bindScales,
  };
}

function decodeTransform(store: ArrayStore, jointCount: number): ParameterTransform {
  const baked = new Float64Array(jointCount * JOINT_PARAMETERS);
  const rows = store.read('bakedRows', 'u16');
  const values = store.read('bakedValues', 'f32');
  rows.forEach((row, i) => (baked[row] = values[i]));
  return {
    rows: store.read('transformRows', 'u16').slice(),
    columns: store.read('transformColumns', 'u16').slice(),
    values: store.read('transformValues', 'f32').slice(),
    baked,
  };
}

function decodeFirstLayer(data: FigureData, store: ArrayStore): FirstLayer {
  const counts = store.read('layerCounts', 'u16');
  const start = new Uint32Array(data.layerUnits + 1);
  for (let u = 0; u < data.layerUnits; u++) start[u + 1] = start[u] + counts[u];
  const steps = varintReader(store.read('layerColumns', 'u8'));
  const raw = store.read('layerValues', 'i8');
  const scales = store.read('layerScales', 'f32');
  const columns = new Uint16Array(start[data.layerUnits]);
  const values = new Float32Array(columns.length);
  for (let u = 0; u < data.layerUnits; u++) {
    let column = 0;
    for (let i = start[u]; i < start[u + 1]; i++) {
      columns[i] = column += steps.unsigned();
      values[i] = raw[i] * scales[u];
    }
  }
  return { start, columns, values };
}

function decodeVertexIds(store: ArrayStore, name: string, count: number): Uint16Array {
  const reader = varintReader(store.read(name, 'u8'));
  const ids = new Uint16Array(count);
  let value = 0;
  for (let i = 0; i < count; i++) ids[i] = value += reader.unsigned();
  return ids;
}

function decodeRegion(
  store: ArrayStore,
  summary: RegionSummary,
  index: number,
): CorrectiveRegion | null {
  if (summary.components === 0) return null;
  const uScales = store.read(`r${index}UScales`, 'f32');
  const cScales = store.read(`r${index}CScales`, 'f32');
  const scales = new Float64Array(summary.components);
  for (let k = 0; k < scales.length; k++) scales[k] = uScales[k] * cScales[k];
  return {
    vertices: decodeVertexIds(store, `r${index}Vertices`, summary.vertices),
    units: store.read(`r${index}Units`, 'u16').slice(),
    components: summary.components,
    unitWeights: store.read(`r${index}U`, 'i16'),
    vertexWeights: store.read(`r${index}C`, 'i8'),
    scales,
  };
}

function decodeCorrectives(data: FigureData, store: ArrayStore): CorrectiveModel {
  const regions: CorrectiveRegion[] = [];
  data.regions.forEach((summary, index) => {
    const region = decodeRegion(store, summary, index);
    if (region) regions.push(region);
  });
  return { firstLayer: decodeFirstLayer(data, store), regions };
}

export function decodeModel(data: FigureData): FigureModel {
  const store = new ArrayStore(data);
  return {
    vertexCount: data.vertexCount,
    jointCount: data.jointCount,
    rest: decodeRest(data, store),
    indices: decodeIndices(data, store),
    skin: decodeSkin(data, store),
    skeleton: decodeSkeleton(store, data.jointCount),
    transform: decodeTransform(store, data.jointCount),
    correctives: decodeCorrectives(data, store),
    jointNames: data.jointNames,
    parameterNames: data.parameterNames,
  };
}
