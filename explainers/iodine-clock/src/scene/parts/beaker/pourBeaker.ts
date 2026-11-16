import { CircleGeometry, CylinderGeometry, Matrix4, Vector3 } from 'three';
import type { Mesh, MeshStandardMaterial, Object3D } from 'three';
import { smoothstep } from '@core/math';
import type { AssemblyState } from '../../../ids';
import { POUR_BEAKER, POUR_BEAKER_AREA_CM2 } from '../../../model';
import { BEAKER_LOOK, DETAIL } from '../../constants';
import { addMesh, label, namedGroup } from '../context';
import type { PartContext, Section } from '../context';
import { OPAQUE_FRAGMENT, WORLD_POSITION_VERTEX, patchMaterial } from '../patches';
import { contactShadow } from './bench';
import { RENDER_ORDER, addGlassware, addGraduation } from './glassware';
import { POUR_SHAPE, pourPose } from './pourMotion';
import type { PourPose } from './pourMotion';

const SOLUTION_HEAD = /* glsl */ `
varying vec3 vWorldPos;
uniform float uSurface;
uniform mat4 uToBeaker;
uniform vec3 uInterior;
`;

const SOLUTION_CLIP = /* glsl */ `
if (vWorldPos.y > uSurface + 0.002) discard;
vec3 inBeaker = (uToBeaker * vec4(vWorldPos, 1.0)).xyz;
if (length(inBeaker.xz) > uInterior.x || inBeaker.y < uInterior.y || inBeaker.y > uInterior.z) discard;
`;

const SOLUTION_EDGE = /* glsl */ `
float solutionEdge = pow(1.0 - abs(dot(normalize(normal), normalize(vViewPosition))), 2.0);
float solutionTop = smoothstep(0.25, 0.0, abs(vWorldPos.y - uSurface));
gl_FragColor.rgb += vec3(0.7, 0.88, 1.0) * (solutionEdge * 0.2 + solutionTop * 0.3);
gl_FragColor.a = clamp(gl_FragColor.a + solutionEdge * 0.18 + solutionTop * 0.25, 0.0, 1.0);
`;

const GRADUATION_STEP_ML = 25;
const GRADUATION_TOP_ML = 250;
const LABEL_STEP_ML = 50;
const CAP_RADIUS = 11;
const MIN_VOLUME = 0.6;
const SHADOW_SIZE = 10;
const SHADOW_OPACITY = 0.7;
const SHADOW_FADE_HEIGHT = 14;
const SHADOW_GROWTH = 0.08;
const HALF = 0.5;

interface SolutionUniforms {
  uSurface: { value: number };
  uToBeaker: { value: Matrix4 };
}

function patchSolution(material: MeshStandardMaterial): SolutionUniforms {
  const uniforms: SolutionUniforms = {
    uSurface: { value: 0 },
    uToBeaker: { value: new Matrix4() },
  };
  const inner = POUR_BEAKER.innerRadius - BEAKER_LOOK.liquidInset;
  patchMaterial(material, {
    key: 'iodine-pour-solution',
    uniforms: {
      ...uniforms,
      uInterior: { value: new Vector3(inner, POUR_BEAKER.glass, POUR_BEAKER.height) },
    },
    vertexHead: WORLD_POSITION_VERTEX.head,
    vertex: [WORLD_POSITION_VERTEX.body],
    fragmentHead: SOLUTION_HEAD,
    fragment: [
      { after: '#include <clipping_planes_fragment>', code: SOLUTION_CLIP },
      { after: OPAQUE_FRAGMENT, code: SOLUTION_EDGE },
    ],
  });
  return uniforms;
}

function graduationMarks(): number[] {
  return Array.from(
    { length: GRADUATION_TOP_ML / GRADUATION_STEP_ML },
    (_, step) => (step + 1) * GRADUATION_STEP_ML,
  );
}

export interface PourBeaker extends Section {
  readonly pose: () => PourPose;
}

export function buildPourBeaker(context: PartContext, parent: Object3D): PourBeaker {
  const root = namedGroup('pourBeakerWorld', parent);
  const holder = namedGroup('pourBeaker', root);
  const { glass, height, innerRadius } = POUR_BEAKER;
  addGlassware(context, holder, 'pourBeaker', POUR_SHAPE);
  const marks = graduationMarks();
  addGraduation(context, holder, 'pourBeaker', POUR_SHAPE, {
    millilitres: marks,
    labelled: marks.filter((ml) => ml % LABEL_STEP_ML === 0),
    capacityLabel: `${GRADUATION_TOP_ML} mL`,
    areaCm2: POUR_BEAKER_AREA_CM2,
  });
  const outer = innerRadius + glass;
  label(context, 'pourBeaker', holder, [outer * 0.45, height * 0.8, outer * 0.85]);

  const interior = innerRadius - BEAKER_LOOK.liquidInset;
  const fillGeometry = new CylinderGeometry(interior, interior, height - glass, DETAIL.lathe / 2);
  fillGeometry.translate(0, glass + (height - glass) * HALF, 0);
  const fill = addMesh(context, holder, fillGeometry, 'bisulfiteSolution', 'solution');
  const capGeometry = new CircleGeometry(CAP_RADIUS, DETAIL.lathe);
  capGeometry.rotateX(-Math.PI / 2);
  const cap: Mesh = addMesh(context, root, capGeometry, 'bisulfiteSolution', 'solution');
  [fill, cap].forEach((mesh) => (mesh.renderOrder = RENDER_ORDER.liquid));
  const uniforms = patchSolution(fill.material as MeshStandardMaterial);
  label(context, 'bisulfiteSolution', fill, [-interior * HALF, glass + 1, interior * 0.4]);

  const shadow = contactShadow(context, root, SHADOW_SIZE, SHADOW_SIZE, SHADOW_OPACITY);
  const axisBottom = new Vector3();
  const axisTop = new Vector3();
  const along = new Vector3();
  let current = pourPose(0, 0);

  const placeCap = (pose: PourPose) => {
    axisBottom.set(0, glass, 0);
    axisTop.set(0, height, 0);
    holder.localToWorld(axisBottom);
    holder.localToWorld(axisTop);
    root.worldToLocal(axisBottom);
    root.worldToLocal(axisTop);
    along.subVectors(axisTop, axisBottom);
    const share = Math.abs(along.y) < 1e-4 ? HALF : (pose.surface - axisBottom.y) / along.y;
    const clamped = Math.min(1, Math.max(0, share));
    cap.position.copy(axisBottom).addScaledVector(along, clamped);
    cap.position.y = pose.surface;
  };

  const surfacePoint = new Vector3();
  const refresh = () => {
    holder.updateWorldMatrix(true, false);
    uniforms.uSurface.value = root.localToWorld(surfacePoint.set(0, current.surface, 0)).y;
    uniforms.uToBeaker.value.copy(holder.matrixWorld).invert();
  };

  return {
    root,
    refresh,
    pose: () => current,
    setState: ({ clock }: AssemblyState) => {
      const pose = pourPose(clock.pour, clock.seconds);
      current = pose;
      holder.position.set(...pose.base);
      holder.rotation.z = pose.tilt;
      holder.updateWorldMatrix(true, false);
      root.updateWorldMatrix(true, false);
      const hasLiquid = pose.volume > MIN_VOLUME;
      fill.visible = hasLiquid;
      cap.visible = hasLiquid;
      placeCap(pose);
      refresh();
      const lift = smoothstep(pose.base[1], 0, SHADOW_FADE_HEIGHT);
      shadow.position.set(pose.base[0], shadow.position.y, pose.base[2]);
      shadow.scale.setScalar(1 + pose.base[1] * SHADOW_GROWTH);
      (shadow.material as { opacity: number }).opacity = SHADOW_OPACITY * (1 - lift);
    },
  };
}
