import {
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  DynamicDrawUsage,
  Mesh,
  ShaderMaterial,
  Vector4,
} from 'three';
import type { Texture } from 'three';
import type { Vec3 } from '../../geometry/surface';
import { registered } from '../context';
import { WATER, WAVE_GLSL } from './waves';
import type { EmphasisGroup, PartContext } from '../context';

export interface SheetLook {
  opacity: number;
  scroll: number;
  streaks: number;
  stretch: number;
  colour: string;
  floor?: number;
}

const SURFACE_CLIP = '0.02';

const VERTEX = /* glsl */ `
varying vec2 vUv;
varying vec3 vNormalView;
varying vec3 vView;
varying vec3 vWorld;
void main() {
  vUv = uv;
  vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
  vec4 view = modelViewMatrix * vec4(position, 1.0);
  vView = -view.xyz;
  vNormalView = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * view;
}
`;

const FRAGMENT = /* glsl */ `
${WAVE_GLSL}
varying vec3 vWorld;
uniform sampler2D uCellMap;
uniform vec3 uColour;
uniform vec4 uSheet;
uniform float uTime;
uniform float uStrength;
uniform float uFloor;
uniform vec3 uProfile;
varying vec2 vUv;
varying vec3 vNormalView;
varying vec3 vView;
void main() {
  if (uProfile.z > 0.5 && vWorld.y < seaHeight(vWorld.xz) - ${SURFACE_CLIP}) discard;
  float along = vUv.x;
  float outward = vUv.y;
  vec2 flow = vec2(along * uSheet.z, outward * uSheet.w - uTime * uSheet.y);
  float coarse = texture2D(uCellMap, flow).r;
  float fine = texture2D(uCellMap, flow * vec2(2.3, 1.6) + vec2(0.37, 0.11)).r;
  float streak = smoothstep(0.5, 0.82, coarse * 0.55 + fine * 0.55);
  float body = smoothstep(0.0, max(uProfile.x, 1e-3), outward) * (1.0 - smoothstep(uProfile.y, 1.0, outward));
  body *= mix(1.0, smoothstep(0.0, 0.18, along) * (1.0 - smoothstep(0.78, 1.0, along)), uProfile.z);
  float facing = abs(dot(normalize(vNormalView), normalize(vView)));
  float mist = (1.0 - outward) * 0.3 * (0.5 + coarse);
  float alpha = uSheet.x * uStrength * body * (mist + mix(uFloor, 1.0, (0.4 + 0.6 * facing) * streak));
  gl_FragColor = vec4(uColour, clamp(alpha, 0.0, 0.95));
  #include <colorspace_fragment>
}
`;

export function foamSheetMaterial(
  context: PartContext,
  group: EmphasisGroup,
  cellMap: Texture,
  look: SheetLook,
  profile: readonly [number, number],
  surface = true,
): ShaderMaterial {
  return registered(
    context,
    group,
    new ShaderMaterial({
      uniforms: {
        uCellMap: { value: cellMap },
        uColour: { value: new Color(look.colour) },
        uSheet: { value: new Vector4(look.opacity, look.scroll, look.streaks, look.stretch) },
        uTime: { value: 0 },
        uStrength: { value: 1 },
        uFloor: { value: look.floor ?? 0 },
        uSeaTime: WATER.uSeaTime,
        uSeaDrift: WATER.uSeaDrift,
        uWaves: WATER.uWaves,
        uProfile: { value: [...profile, surface ? 1 : 0] },
      },
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      transparent: true,
      depthWrite: false,
      side: DoubleSide,
      toneMapped: false,
    }),
  );
}

export class SheetGrid {
  readonly mesh: Mesh;
  private readonly rows: number;
  private readonly columns: number;
  private readonly positions: Float32Array;
  private readonly geometry = new BufferGeometry();

  constructor(context: PartContext, material: ShaderMaterial, rows: number, columns: number) {
    this.rows = rows;
    this.columns = columns;
    this.positions = new Float32Array(rows * columns * 3);
    const uvs = new Float32Array(rows * columns * 2);
    const indices: number[] = [];
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < columns; c += 1) {
        uvs.set([r / (rows - 1), c / (columns - 1)], (r * columns + c) * 2);
        if (r < rows - 1 && c < columns - 1) {
          const a = r * columns + c;
          indices.push(a, a + columns, a + 1, a + 1, a + columns, a + columns + 1);
        }
      }
    }
    this.geometry.setAttribute(
      'position',
      new BufferAttribute(this.positions, 3).setUsage(DynamicDrawUsage),
    );
    this.geometry.setAttribute('uv', new BufferAttribute(uvs, 2));
    this.geometry.setIndex(indices);
    this.mesh = new Mesh(context.tracker.track(this.geometry), material);
    this.mesh.frustumCulled = false;
  }

  set(point: (row: number, column: number) => Vec3): void {
    for (let r = 0; r < this.rows; r += 1) {
      for (let c = 0; c < this.columns; c += 1) {
        this.positions.set(point(r, c), (r * this.columns + c) * 3);
      }
    }
    this.geometry.getAttribute('position').needsUpdate = true;
    this.geometry.computeVertexNormals();
  }
}
