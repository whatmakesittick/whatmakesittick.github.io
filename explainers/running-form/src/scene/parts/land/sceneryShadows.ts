import type { Matrix4 } from 'three';
import {
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  InstancedMesh,
  Quaternion,
  ShaderMaterial,
  Vector3,
} from 'three';
import { UNDIMMED_GROUP } from '@core/scene/materials';
import { SUN_DIR } from '../../../model/layout';
import { THEME } from '../../../theme';
import { LAYER } from '../../constants';
import { registered } from '../context';
import type { PartContext } from '../context';
import type { TreeKind } from './placement';
import type { StripItem } from './strip';

const COT_SUN = Math.hypot(SUN_DIR[0], SUN_DIR[2]) / SUN_DIR[1];
const SHADOW_LIFT_M = 0.012;
const OPACITY = 0.3;
const SHAPE = { strip: 0, blob: 1 } as const;

interface ShadowPiece {
  readonly shape: number;
  readonly from: number;
  readonly to: number;
  readonly halfWidth: number;
}

export type ShadowShape = readonly ShadowPiece[];

function crownShadow(trunkTop: number, crownLow: number, crownHigh: number): ShadowShape {
  return [
    { shape: SHAPE.strip, from: 0, to: trunkTop * COT_SUN, halfWidth: 0.04 },
    { shape: SHAPE.blob, from: crownLow * COT_SUN, to: crownHigh * COT_SUN, halfWidth: 0.5 },
  ];
}

export const TREE_SHADOW_SHAPES: Record<TreeKind, ShadowShape> = {
  pine: crownShadow(0.8, 0.69, 0.99),
  round: crownShadow(0.45, 0.2, 1.0),
};

const VERTEX = /* glsl */ `
attribute float shape;
varying vec2 vUv;
varying float vShape;
void main() {
  vUv = uv;
  vShape = shape;
  gl_Position = projectionMatrix * viewMatrix * modelMatrix * instanceMatrix * vec4(position, 1.0);
}
`;

const FRAGMENT = /* glsl */ `
uniform vec3 uColour;
uniform float uOpacity;
varying vec2 vUv;
varying float vShape;
void main() {
  float alpha;
  if (vShape < 0.5) {
    alpha = smoothstep(0.0, 0.45, vUv.y) * smoothstep(1.0, 0.55, vUv.y) * (1.0 - vUv.x * 0.6);
  } else {
    float d = length((vUv - 0.5) * 2.0);
    alpha = 1.0 - smoothstep(0.35, 1.0, d);
  }
  gl_FragColor = vec4(uColour, uOpacity * alpha);
  #include <colorspace_fragment>
}
`;

function shadowGeometry(pieces: ShadowShape): BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  const shapes: number[] = [];
  const index: number[] = [];
  pieces.forEach((piece, number) => {
    const first = number * 4;
    positions.push(
      piece.from,
      0,
      -piece.halfWidth,
      piece.to,
      0,
      -piece.halfWidth,
      piece.from,
      0,
      piece.halfWidth,
      piece.to,
      0,
      piece.halfWidth,
    );
    uvs.push(0, 0, 1, 0, 0, 1, 1, 1);
    shapes.push(piece.shape, piece.shape, piece.shape, piece.shape);
    index.push(first, first + 2, first + 1, first + 1, first + 2, first + 3);
  });
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
  geometry.setAttribute('shape', new Float32BufferAttribute(shapes, 1));
  geometry.setIndex(index);
  return geometry;
}

export function groundShadowMesh(
  context: PartContext,
  pieces: ShadowShape,
  count: number,
): InstancedMesh {
  const material = registered(
    context,
    UNDIMMED_GROUP,
    new ShaderMaterial({
      uniforms: { uColour: { value: new Color(THEME.shadow) }, uOpacity: { value: OPACITY } },
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -4,
    }),
  );
  const mesh = new InstancedMesh(context.tracker.track(shadowGeometry(pieces)), material, count);
  mesh.renderOrder = LAYER.groundShadow;
  return mesh;
}

const SHADOW_TURN = new Quaternion().setFromAxisAngle(
  new Vector3(0, 1, 0),
  Math.atan2(SUN_DIR[2], -SUN_DIR[0]),
);
const at = new Vector3();
const size = new Vector3();

export function shadowMatrix(
  entry: StripItem,
  position: Vector3,
  fade: number,
  out: Matrix4,
): void {
  at.set(position.x, SHADOW_LIFT_M, position.z);
  size.set(entry.scale.y * fade, 1, entry.scale.x * fade);
  out.compose(at, SHADOW_TURN, size);
}
