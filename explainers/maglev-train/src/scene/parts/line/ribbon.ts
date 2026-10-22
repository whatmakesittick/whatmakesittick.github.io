import {
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  Mesh,
  ShaderMaterial,
  UniformsLib,
  UniformsUtils,
} from 'three';
import type { IUniform } from 'three';
import type { Extent } from '@core/scene/regions';
import { SIDE_SIGNS } from '../../../model';
import { registeredMaterial } from '../context';
import type { EmphasisGroup, PartContext } from '../context';
import { OVERLAY_RENDER_ORDER } from './effectConstants';
import { RIBBON_FRAGMENT_HEAD, RIBBON_VERTEX } from './glsl';

export interface RibbonLane {
  readonly y: number;
  readonly z: number;
  readonly halfHeight: number;
}

export interface RibbonSpec {
  readonly group: EmphasisGroup;
  readonly lane: RibbonLane;
  readonly span: Extent;
  readonly opacity: number;
  readonly fragment: string;
  readonly uniforms: Record<string, IUniform>;
}

const XYZ = 3;
const CORNERS = [
  [0, -1],
  [1, -1],
  [0, 1],
  [1, 1],
] as const;
const QUAD = [0, 1, 2, 2, 1, 3];

function ribbonGeometry({ y, z }: RibbonLane, [from, to]: Extent): BufferGeometry {
  const positions: number[] = [];
  const across: number[] = [];
  const indices: number[] = [];
  SIDE_SIGNS.forEach((side, lane) => {
    CORNERS.forEach(([end, edge]) => {
      positions.push(end ? to : from, y, side * z);
      across.push(edge);
    });
    indices.push(...QUAD.map((corner) => corner + lane * CORNERS.length));
  });
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), XYZ));
  geometry.setAttribute('aAcross', new BufferAttribute(new Float32Array(across), 1));
  geometry.setIndex(indices);
  return geometry;
}

export function ribbonMesh(context: PartContext, spec: RibbonSpec): Mesh {
  const tint = new Color(1, 1, 1);
  const material = new ShaderMaterial({
    uniforms: {
      ...UniformsUtils.clone(UniformsLib.fog),
      ...spec.uniforms,
      uTint: { value: tint },
      uOpacity: { value: spec.opacity },
      uHalfHeight: { value: spec.lane.halfHeight },
    },
    vertexShader: RIBBON_VERTEX,
    fragmentShader: `${RIBBON_FRAGMENT_HEAD}\n${spec.fragment}`,
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
    fog: true,
  });
  Object.assign(material, { color: tint });
  const geometry = context.tracker.track(ribbonGeometry(spec.lane, spec.span));
  const mesh = new Mesh(geometry, registeredMaterial(context, spec.group, material));
  mesh.frustumCulled = false;
  mesh.renderOrder = OVERLAY_RENDER_ORDER;
  return mesh;
}
