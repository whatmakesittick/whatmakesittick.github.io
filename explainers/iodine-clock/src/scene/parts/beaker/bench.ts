import { Color, Mesh, MeshBasicMaterial, PlaneGeometry, ShaderMaterial, Vector3 } from 'three';
import type { Material, Object3D } from 'three';
import { UNDIMMED_GROUP } from '@core/scene/materials';
import { box } from '@core/scene/geometry/box';
import { THEME } from '../../../theme';
import { BENCH } from '../../constants';
import { addMesh, addShaded, namedGroup, registeredMaterial } from '../context';
import type { PartContext } from '../context';
import { OPAQUE_FRAGMENT, WORLD_POSITION_VERTEX, patchMaterial } from '../patches';

const WALL_VERTEX = /* glsl */ `
varying vec3 vWorldPos;
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorldPos = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

const WALL_FRAGMENT = /* glsl */ `
uniform vec3 uWall;
uniform vec3 uGrout;
uniform vec3 uBackground;
uniform float uTile;
varying vec3 vWorldPos;
void main() {
  vec2 cell = fract(vec2(vWorldPos.x, vWorldPos.y) / uTile);
  float grout = 1.0 - smoothstep(0.0, 0.035, min(min(cell.x, 1.0 - cell.x), min(cell.y, 1.0 - cell.y)));
  vec2 id = floor(vec2(vWorldPos.x, vWorldPos.y) / uTile);
  float jitter = fract(sin(dot(id, vec2(12.9898, 78.233))) * 43758.5453) * 0.08;
  vec3 colour = mix(uWall * (0.96 + jitter), uGrout, grout * 0.85);
  float light = exp(-pow((vWorldPos.x + 6.0) / 48.0, 2.0) - pow((vWorldPos.y - 22.0) / 30.0, 2.0));
  colour *= 0.45 + 0.9 * light;
  float fade = smoothstep(40.0, 85.0, abs(vWorldPos.x)) + smoothstep(55.0, 88.0, vWorldPos.y);
  gl_FragColor = vec4(mix(colour, uBackground, clamp(fade, 0.0, 1.0)), 1.0);
  #include <colorspace_fragment>
}
`;

const BENCH_FRAGMENT_HEAD =
  'varying vec3 vWorldPos;\nuniform vec3 uPool;\nuniform vec3 uBackground;';

const BENCH_COLOUR = /* glsl */ `
float poolDistance = length(vWorldPos.xz - uPool.xz) / uPool.y;
float pool = exp(-poolDistance * poolDistance);
vec2 grain = floor(vWorldPos.xz * 9.0);
float speckle = fract(sin(dot(grain, vec2(127.1, 311.7))) * 43758.5453);
diffuseColor.rgb *= (0.38 + 0.95 * pool) * (0.95 + 0.1 * speckle);
`;

const BENCH_FADE = /* glsl */ `
float benchFade = smoothstep(48.0, 92.0, length(vWorldPos.xz - uPool.xz));
gl_FragColor.rgb = mix(gl_FragColor.rgb, uBackground, benchFade);
`;

function wall(context: PartContext, parent: Object3D): void {
  const shader = new ShaderMaterial({
    vertexShader: WALL_VERTEX,
    fragmentShader: WALL_FRAGMENT,
    uniforms: {
      uWall: { value: new Color(BENCH.wall) },
      uGrout: { value: new Color(BENCH.grout) },
      uBackground: { value: new Color(THEME.sceneBackground) },
      uTile: { value: BENCH.wallTile },
    },
  });
  const width = BENCH.halfWidth * 2;
  const geometry = new PlaneGeometry(width, BENCH.wallHeight);
  geometry.translate(0, BENCH.wallHeight / 2 - BENCH.thickness, BENCH.back);
  addShaded(context, parent, geometry, UNDIMMED_GROUP, shader).name = 'labWall';
}

function benchTop(context: PartContext, parent: Object3D): void {
  const top = addMesh(
    context,
    parent,
    box({
      minX: -BENCH.halfWidth,
      maxX: BENCH.halfWidth,
      minY: -BENCH.thickness,
      maxY: 0,
      minZ: BENCH.back,
      maxZ: BENCH.front,
    }),
    UNDIMMED_GROUP,
    'benchTop',
  );
  top.name = 'benchTop';
  const [x, , z] = BENCH.poolCentre;
  patchMaterial(top.material as Material, {
    key: 'iodine-bench',
    uniforms: {
      uPool: { value: new Vector3(x, BENCH.poolRadius, z) },
      uBackground: { value: new Color(THEME.sceneBackground) },
    },
    vertexHead: WORLD_POSITION_VERTEX.head,
    vertex: [WORLD_POSITION_VERTEX.body],
    fragmentHead: BENCH_FRAGMENT_HEAD,
    fragment: [
      { after: '#include <color_fragment>', code: BENCH_COLOUR },
      { after: OPAQUE_FRAGMENT, code: BENCH_FADE },
    ],
  });
}

export function contactShadow(
  context: PartContext,
  parent: Object3D,
  width: number,
  depth: number,
  opacity: number,
): Mesh {
  const shade = registeredMaterial(
    context,
    UNDIMMED_GROUP,
    new MeshBasicMaterial({
      map: context.textures.shadow,
      transparent: true,
      depthWrite: false,
      opacity,
      color: '#000000',
    }),
  );
  const geometry = new PlaneGeometry(width, depth);
  geometry.rotateX(-Math.PI / 2);
  const mesh = new Mesh(context.tracker.track(geometry), shade);
  mesh.name = 'contactShadow';
  mesh.position.y = BENCH.shadowLift;
  mesh.renderOrder = -1;
  parent.add(mesh);
  return mesh;
}

export function buildBench(context: PartContext, parent: Object3D): Object3D {
  const root = namedGroup('bench', parent);
  benchTop(context, root);
  wall(context, root);
  return root;
}
