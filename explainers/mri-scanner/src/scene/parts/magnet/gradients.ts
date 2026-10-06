import { AdditiveBlending, Color, Mesh, ShaderMaterial, Vector3 } from 'three';
import type { BufferGeometry, Group, Material } from 'three';
import type { GradientAxisId, PartId } from '../../../ids';
import { GRADIENT_AXIS_IDS } from '../../../ids';
import { gradientShell } from '../../../model/layout';
import { GRADIENT_TONES } from '../../../theme';
import { rectLoop, roundCorners } from '../../geometry/profile';
import { sweepProfile } from '../../geometry/sweep';
import { registered } from '../context';
import type { PartContext } from '../context';
import { addMeshes, boreGroup, REST_ARC } from './cutaway';
import { RESIN_FINISHES, RESIN_GLASS_FINISHES } from './looks';

export const GRADIENT_PARTS: Readonly<Record<GradientAxisId, PartId>> = {
  x: 'gradientX',
  y: 'gradientY',
  z: 'gradientZ',
};

const SEGMENTS = 112;
const CORNER = 0.004;
const CORNER_STEPS = 2;
const EASE_RATE = 10;
const SETTLED = 1e-3;
const GLOW_RENDER_ORDER = 1;
const AXIS_VECTORS: Readonly<Record<GradientAxisId, Vector3>> = {
  x: new Vector3(1, 0, 0),
  y: new Vector3(0, 1, 0),
  z: new Vector3(0, 0, 1),
};

const GLOW = {
  dimEnd: 0.02,
  gain: 2.6,
  curve: 2.2,
  rimBoost: 0.6,
  edgeBoost: 1.5,
  heat: 0.15,
  idleBand: 1.2,
} as const;
const POLYGON_PULL = -1;

const VERTEX = `
uniform vec3 axis;
uniform float extent;
varying float along;
varying float facing;
varying float cut;
void main() {
  along = clamp(dot(position, axis) / extent, -1.0, 1.0);
  vec2 radial = normalize(position.xy);
  cut = clamp(1.0 - abs(dot(normal.xy, radial)) - abs(normal.z), 0.0, 1.0);
  vec4 view = modelViewMatrix * vec4(position, 1.0);
  facing = abs(dot(normalize(normalMatrix * normal), normalize(-view.xyz)));
  gl_Position = projectionMatrix * view;
}
`;

const FRAGMENT = `
uniform vec3 tone;
uniform float level;
uniform float dimEnd;
uniform float gain;
uniform float curve;
uniform float rimBoost;
uniform float edgeBoost;
uniform float heat;
uniform float idleBand;
varying float along;
varying float facing;
varying float cut;
void main() {
  float hot = clamp(0.5 + 0.5 * along * sign(level), 0.0, 1.0);
  float ramp = mix(dimEnd, 1.0, pow(hot, curve));
  float rim = 1.0 + rimBoost * pow(1.0 - facing, 2.0);
  float driven = abs(level) * gain * ramp * rim * (1.0 + edgeBoost * cut);
  float strength = driven + idleBand * cut;
  vec3 glow = tone * strength + vec3(heat * max(strength - 1.0, 0.0));
  gl_FragColor = vec4(glow, 1.0);
  #include <colorspace_fragment>
}
`;

function shellGeometry(axis: GradientAxisId): BufferGeometry {
  const { inner, outer, halfLength } = gradientShell(axis);
  const loop = roundCorners(rectLoop(inner, outer, -halfLength, halfLength), CORNER, CORNER_STEPS);
  return sweepProfile({ outer: loop, holes: [] }, { arc: REST_ARC, segmentsPerTurn: SEGMENTS });
}

function glowMaterial(axis: GradientAxisId): ShaderMaterial {
  const shell = gradientShell(axis);
  const tone = new Color(GRADIENT_TONES[axis]);
  const material = new ShaderMaterial({
    uniforms: {
      axis: { value: AXIS_VECTORS[axis] },
      extent: { value: axis === 'z' ? shell.halfLength : shell.outer },
      tone: { value: tone },
      level: { value: 0 },
      dimEnd: { value: GLOW.dimEnd },
      gain: { value: GLOW.gain },
      curve: { value: GLOW.curve },
      rimBoost: { value: GLOW.rimBoost },
      edgeBoost: { value: GLOW.edgeBoost },
      heat: { value: GLOW.heat },
      idleBand: { value: GLOW.idleBand },
    },
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    blending: AdditiveBlending,
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: POLYGON_PULL,
    polygonOffsetUnits: POLYGON_PULL,
  });
  return Object.assign(material, { color: tone });
}

interface Glow {
  material: ShaderMaterial;
  current: number;
  target: number;
}

function isLit(glow: Glow): boolean {
  return Math.abs(glow.current) > SETTLED;
}

interface Resin {
  meshes: Mesh[];
  solid: Material;
  glass: Material;
}

export class GradientCoils {
  readonly parts: Readonly<Record<GradientAxisId, Group>>;
  private readonly glows: Record<GradientAxisId, Glow>;
  private readonly resins: Record<GradientAxisId, Resin>;

  constructor(context: PartContext) {
    const parts = {} as Record<GradientAxisId, Group>;
    const glows = {} as Record<GradientAxisId, Glow>;
    const resins = {} as Record<GradientAxisId, Resin>;
    GRADIENT_AXIS_IDS.forEach((axis) => {
      const id = GRADIENT_PARTS[axis];
      const geometry = shellGeometry(axis);
      const group = boreGroup(id);
      addMeshes(context, group, id, RESIN_FINISHES[axis], [geometry]);
      const meshes = group.children.filter((child) => child instanceof Mesh);
      resins[axis] = {
        meshes,
        solid: meshes[0].material as Material,
        glass: context.materials.get(id, RESIN_GLASS_FINISHES[axis]),
      };
      const material = registered(context, id, glowMaterial(axis));
      const mesh = new Mesh(geometry, material);
      mesh.renderOrder = GLOW_RENDER_ORDER;
      group.add(mesh);
      parts[axis] = group;
      glows[axis] = { material, current: 0, target: 0 };
    });
    this.parts = parts;
    this.glows = glows;
    this.resins = resins;
  }

  setTarget(active: GradientAxisId | null, level: number): void {
    GRADIENT_AXIS_IDS.forEach((axis) => {
      this.glows[axis].target = axis === active ? level : 0;
    });
  }

  get glowing(): boolean {
    return GRADIENT_AXIS_IDS.some((axis) => isLit(this.glows[axis]));
  }

  update(deltaSeconds: number): boolean {
    const blend = 1 - Math.exp(-EASE_RATE * deltaSeconds);
    const easing = GRADIENT_AXIS_IDS.map((axis) => this.ease(this.glows[axis], blend));
    this.clearOtherShells();
    return easing.some(Boolean);
  }

  private clearOtherShells(): void {
    const glowing = this.glowing;
    GRADIENT_AXIS_IDS.forEach((axis) => {
      const { meshes, solid, glass } = this.resins[axis];
      const clear = glowing && !isLit(this.glows[axis]);
      meshes.forEach((mesh) => {
        mesh.material = clear ? glass : solid;
      });
    });
  }

  private ease(glow: Glow, blend: number): boolean {
    const gap = glow.target - glow.current;
    const settled = Math.abs(gap) < SETTLED;
    glow.current = settled ? glow.target : glow.current + gap * blend;
    glow.material.uniforms.level.value = glow.current;
    return !settled;
  }
}
