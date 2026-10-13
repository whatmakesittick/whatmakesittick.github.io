import {
  BackSide,
  CanvasTexture,
  CircleGeometry,
  Color,
  CylinderGeometry,
  DoubleSide,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  Quaternion,
  RepeatWrapping,
  SRGBColorSpace,
  ShaderMaterial,
  SphereGeometry,
  Vector3,
} from 'three';
import type { Object3D } from 'three';
import { smoothstep } from '@core/math';
import { UNDIMMED_GROUP } from '@core/scene/materials';
import type { AssemblyState } from '../../ids';
import { REGION_BOUNDS, SETTING_LAYOUT } from '../../model';
import { FOREST } from '../constants';
import { namedGroup, registeredMaterial } from './context';
import type { PartContext } from './context';
import { seededRandom } from './random';

const SKY_VERTEX = /* glsl */ `
varying vec3 vDirection;
void main() {
  vDirection = position;
  vec4 clip = projectionMatrix * vec4(mat3(viewMatrix) * position, 1.0);
  gl_Position = clip.xyww;
}
`;

const SKY_FRAGMENT = /* glsl */ `
uniform vec3 uTop;
uniform vec3 uHorizon;
uniform vec3 uGap;
uniform vec3 uClose;
uniform float uCloseness;
varying vec3 vDirection;
void main() {
  vec3 direction = normalize(vDirection);
  float up = clamp(direction.y, 0.0, 1.0);
  vec3 colour = mix(uHorizon, uTop, smoothstep(0.02, 0.55, up));
  float leaves = sin(direction.x * 17.0 + sin(direction.z * 9.0)) * sin(direction.z * 15.0 + direction.y * 11.0);
  float gaps = smoothstep(0.55, 0.95, leaves) * smoothstep(0.25, 0.7, up);
  colour = mix(colour, uGap, gaps * 0.55);
  colour = mix(colour, uClose, uCloseness);
  gl_FragColor = vec4(colour, 1.0);
  #include <colorspace_fragment>
}
`;

const FULL_TURN = Math.PI * 2;
const SKY_SEGMENTS = [32, 16] as const;
const GROUND_SEGMENTS = 48;
const LEAF_SPOTS = 900;
const LEAF_SPOT_SIZE = [3, 9] as const;
const TRUNK_TAPER = 0.72;
const LEAF_TILT = 0.35;

export interface Backdrop {
  readonly root: Object3D;
  setState(state: AssemblyState): void;
  setCloseness(cameraDistance: number): void;
}

function pick<T>(list: readonly T[], random: () => number): T {
  return list[Math.floor(random() * list.length) % list.length];
}

function litterTexture(context: PartContext): CanvasTexture {
  const size = FOREST.groundTexture;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const paint = canvas.getContext('2d');
  const random = seededRandom(FOREST.seed);
  if (paint) {
    paint.fillStyle = FOREST.groundBase;
    paint.fillRect(0, 0, size, size);
    paint.globalAlpha = FOREST.litterAlpha;
    for (let spot = 0; spot < LEAF_SPOTS; spot += 1) {
      const [small, large] = LEAF_SPOT_SIZE;
      paint.fillStyle = pick(FOREST.litter, random);
      paint.beginPath();
      paint.ellipse(
        random() * size,
        random() * size,
        small + random() * large,
        small + random() * (large / 2),
        random() * Math.PI,
        0,
        FULL_TURN,
      );
      paint.fill();
    }
  }
  const texture = context.tracker.track(new CanvasTexture(canvas));
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.setScalar((FOREST.groundRadius * 2) / FOREST.groundTile);
  return texture;
}

function sky(context: PartContext, parent: Object3D): ShaderMaterial {
  const material = registeredMaterial(
    context,
    UNDIMMED_GROUP,
    new ShaderMaterial({
      vertexShader: SKY_VERTEX,
      fragmentShader: SKY_FRAGMENT,
      side: BackSide,
      depthWrite: false,
      uniforms: {
        uTop: { value: new Color(FOREST.skyTop) },
        uHorizon: { value: new Color(FOREST.skyHorizon) },
        uGap: { value: new Color(FOREST.skyGap) },
        uClose: { value: new Color(FOREST.closeHaze) },
        uCloseness: { value: 0 },
      },
    }),
  );
  const dome = new Mesh(
    context.tracker.track(new SphereGeometry(FOREST.skyRadius, ...SKY_SEGMENTS)),
    material,
  );
  dome.renderOrder = -1;
  dome.frustumCulled = false;
  parent.add(dome);
  return material;
}

function ground(context: PartContext, parent: Object3D): MeshStandardMaterial {
  const material = registeredMaterial(
    context,
    UNDIMMED_GROUP,
    new MeshStandardMaterial({ map: litterTexture(context), roughness: 1, metalness: 0 }),
  );
  const geometry = new CircleGeometry(FOREST.groundRadius, GROUND_SEGMENTS);
  geometry.rotateX(-Math.PI / 2);
  parent.add(new Mesh(context.tracker.track(geometry), material));
  return material;
}

function scatter(
  mesh: InstancedMesh,
  place: (index: number, matrix: Matrix4, colour: Color) => void,
): void {
  const matrix = new Matrix4();
  const colour = new Color();
  for (let index = 0; index < mesh.count; index += 1) {
    place(index, matrix, colour);
    mesh.setMatrixAt(index, matrix);
    mesh.setColorAt(index, colour);
  }
}

function leaves(context: PartContext, parent: Object3D): MeshStandardMaterial {
  const material = registeredMaterial(
    context,
    UNDIMMED_GROUP,
    new MeshStandardMaterial({ roughness: 0.9, metalness: 0, side: DoubleSide }),
  );
  const geometry = new CircleGeometry(0.5, 6);
  geometry.rotateX(-Math.PI / 2);
  const mesh = context.tracker.track(
    new InstancedMesh(context.tracker.track(geometry), material, FOREST.leafCount),
  );
  const random = seededRandom(FOREST.seed + 1);
  const quaternion = new Quaternion();
  const axis = new Vector3();
  const [width, length] = FOREST.leafSize;
  const [near, far] = FOREST.leafReach;
  const [centreX, centreZ] = FOREST.leafCentre;
  scatter(mesh, (_, matrix, colour) => {
    const angle = random() * FULL_TURN;
    const reach = near + (far - near) * Math.sqrt(random());
    axis.set(random() - 0.5, 4, random() - 0.5).normalize();
    quaternion.setFromAxisAngle(axis, random() * FULL_TURN);
    quaternion.multiply(
      new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), (random() - 0.5) * LEAF_TILT),
    );
    const scale = 0.6 + random() * 0.8;
    matrix.compose(
      new Vector3(
        centreX + Math.cos(angle) * reach,
        0.001 + random() * 0.002,
        centreZ + Math.sin(angle) * reach,
      ),
      quaternion,
      new Vector3(width * scale, 1, length * scale * 1.6),
    );
    colour.set(pick(FOREST.litter, random));
  });
  parent.add(mesh);
  return material;
}

function trees(context: PartContext, parent: Object3D): MeshStandardMaterial {
  const material = registeredMaterial(
    context,
    UNDIMMED_GROUP,
    new MeshStandardMaterial({ roughness: 0.95, metalness: 0 }),
  );
  const geometry = new CylinderGeometry(TRUNK_TAPER * 0.5, 0.5, 1, FOREST.trunkSegments);
  geometry.translate(0, 0.5, 0);
  const count = FOREST.trunkCount + FOREST.stumps.length;
  const mesh = context.tracker.track(
    new InstancedMesh(context.tracker.track(geometry), material, count),
  );
  const random = seededRandom(FOREST.seed + 2);
  const [near, far] = FOREST.trunkReach;
  const [thin, thick] = FOREST.trunkRadius;
  const turn = new Quaternion();
  scatter(mesh, (index, matrix, colour) => {
    const stump = FOREST.stumps[index - FOREST.trunkCount];
    if (stump) {
      const [x, z, radius, height] = stump;
      matrix.compose(new Vector3(x, 0, z), turn, new Vector3(radius * 2, height, radius * 2));
      colour.set(FOREST.stumpTop);
      return;
    }
    const angle = random() * FULL_TURN;
    const reach = near + (far - near) * random();
    const width = (thin + (thick - thin) * random()) * 2;
    turn.setFromAxisAngle(new Vector3(0, 1, 0), random() * FULL_TURN);
    matrix.compose(
      new Vector3(Math.cos(angle) * reach, 0, Math.sin(angle) * reach),
      turn,
      new Vector3(width, FOREST.trunkHeight, width),
    );
    colour.set(pick(FOREST.bark, random));
  });
  parent.add(mesh);
  return material;
}

function contactShadow(context: PartContext, parent: Object3D): void {
  const material = registeredMaterial(
    context,
    UNDIMMED_GROUP,
    new MeshBasicMaterial({
      map: context.textures.shadow,
      transparent: true,
      depthWrite: false,
      opacity: FOREST.shadowOpacity,
      color: 0x000000,
    }),
  );
  const { min, max } = REGION_BOUNDS.saw;
  const geometry = new PlaneGeometry(
    (max[0] - min[0]) * FOREST.shadowScale,
    (max[2] - min[2] + 0.2) * FOREST.shadowScale,
  );
  geometry.rotateX(-Math.PI / 2);
  const shadow = new Mesh(context.tracker.track(geometry), material);
  shadow.position.set((min[0] + max[0]) / 2, FOREST.shadowLift, (min[2] + max[2]) / 2);
  shadow.renderOrder = 1;
  parent.add(shadow);
}

export function buildBackdrop(context: PartContext, parent: Object3D): Backdrop {
  const root = namedGroup('forest', parent);
  const skyMaterial = sky(context, root);
  const lit = [ground(context, root), leaves(context, root), trees(context, root)];
  const bases = lit.map((material) => material.color.clone());
  const close = new Color(FOREST.closeHaze);
  contactShadow(context, root);
  let closeness = -1;
  return {
    root,
    setState: (state) => {
      root.position.y = -SETTING_LAYOUT[state.setting].lift;
    },
    setCloseness: (cameraDistance) => {
      const next =
        FOREST.closeShare * (1 - smoothstep(cameraDistance, FOREST.closeTo, FOREST.closeFrom));
      if (next === closeness) return;
      closeness = next;
      skyMaterial.uniforms.uCloseness.value = next;
      lit.forEach((material, index) => material.color.copy(bases[index]).lerp(close, next));
    },
  };
}
