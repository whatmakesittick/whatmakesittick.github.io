import {
  AdditiveBlending,
  BufferGeometry,
  Float32BufferAttribute,
  Color,
  CylinderGeometry,
  Matrix4,
  Quaternion,
  ShaderMaterial,
  SphereGeometry,
  TorusGeometry,
  Vector2,
  Vector3,
} from 'three';
import type { Material, Object3D } from 'three';
import { lerp, smoothstep } from '@core/math';
import type { AssemblyState, Point } from '../../../ids';
import { BOND_LENGTH_A, HELIX_AXIS, HELIX_GEOMETRY, HELIX_RINGS, I2_FINAL_M } from '../../../model';
import { DETAIL, HELIX_LOOK, THEME_GLOW } from '../../constants';
import { mergeParts } from '../../geometry/merge';
import { addMesh, addShaded, instanced, label, namedGroup } from '../context';
import type { PartContext } from '../context';
import { OPAQUE_FRAGMENT, WORLD_POSITION_VERTEX, patchMaterial } from '../patches';
import { seededRandom } from '../random';
import type { DrawContext } from './draw';
import { SHAPES } from './shapes';

const GLOW_VERTEX = /* glsl */ `
varying vec3 vNormalView;
varying vec3 vViewDir;
varying float vAxial;
void main() {
  vec4 view = modelViewMatrix * vec4(position, 1.0);
  vNormalView = normalize(normalMatrix * normal);
  vViewDir = normalize(-view.xyz);
  vAxial = position.y;
  gl_Position = projectionMatrix * view;
}
`;

const GLOW_FRAGMENT = /* glsl */ `
uniform vec3 uColour;
uniform vec3 uCore;
uniform float uStrength;
uniform float uLow;
uniform float uHigh;
varying vec3 vNormalView;
varying vec3 vViewDir;
varying float vAxial;
void main() {
  float facing = abs(dot(normalize(vNormalView), normalize(vViewDir)));
  float body = pow(facing, 2.5);
  float span = smoothstep(uLow - 2.0, uLow + 1.0, vAxial) * (1.0 - smoothstep(uHigh - 1.0, uHigh + 2.0, vAxial));
  vec3 colour = mix(uColour, uCore, pow(facing, 6.0));
  gl_FragColor = vec4(colour * body * span * uStrength, 1.0);
  #include <colorspace_fragment>
}
`;

const RIBBON_FRONT = /* glsl */ `
vec2 ribbonRadial = normalize(vWorldPos.xz - uAxis);
vec2 ribbonView = normalize(cameraPosition.xz - uAxis);
float ribbonFront = smoothstep(-0.2, 0.4, dot(ribbonRadial, ribbonView));
gl_FragColor.rgb *= mix(0.45, 1.25, ribbonFront);
gl_FragColor.a *= mix(0.25, 2.2, ribbonFront);
`;

const RING_VERTICES = 6;
const C1 = 0;
const O5 = 1;
const C5 = 2;
const C4 = 3;
const STUB_LENGTH = 1.25;
const STUB_LIFT = 0.45;
const LABEL_PRIORITY = 2;
const FEEDER_SEED = 1904;
const FEEDER_STAGGER = 0.18;
const FEEDER_ENTER = 0.62;
const FEEDER_FADE = [0.88, 1] as const;
const FEEDER_RADIUS = [14, 20] as const;
const GROW_SPACING = 0.3;
const TRIIODIDE_SHARE = 0.12;
const FLASH_ALPHA = 0.9;
const SPARKLE_ALPHA = 0.3;
const GLOW_FLOOR = 0.25;
const HALF = 0.5;
const CENTRE_SLOT = 6;
const TRIIODIDE_SLOTS = [5, 6, 7] as const;
const GROWTH_ORDER = [4, 8, 3, 9, 2, 10, 1, 11, 0] as const;
const UP = new Vector3(0, 1, 0);
const XYZ = 3;

interface Ring {
  readonly centre: Vector3;
  readonly tangent: Vector3;
  readonly normal: Vector3;
  readonly basis: Matrix4;
}

export function helixPoint(turnShare: number, radius: number): Vector3 {
  const angle = turnShare * Math.PI * 2;
  const handed = HELIX_GEOMETRY.leftHanded ? -1 : 1;
  return new Vector3(
    HELIX_AXIS.x + handed * radius * Math.sin(angle),
    HELIX_AXIS.y[0] + turnShare * HELIX_GEOMETRY.pitchA,
    HELIX_AXIS.z + radius * Math.cos(angle),
  );
}

function rings(): Ring[] {
  const step = 1 / HELIX_GEOMETRY.ringsPerTurn;
  return Array.from({ length: HELIX_RINGS }, (_, index) => {
    const share = (index + HALF) * step;
    const centre = helixPoint(share, HELIX_LOOK.ringCentreRadius);
    const tangent = helixPoint(share + step * 0.01, HELIX_LOOK.ringCentreRadius)
      .sub(helixPoint(share - step * 0.01, HELIX_LOOK.ringCentreRadius))
      .normalize();
    const radial = new Vector3(centre.x - HELIX_AXIS.x, 0, centre.z - HELIX_AXIS.z).normalize();
    const normal = radial.applyAxisAngle(tangent, HELIX_LOOK.ringTilt).normalize();
    const side = new Vector3().crossVectors(normal, tangent).normalize();
    const basis = new Matrix4().makeBasis(tangent, side, normal).setPosition(centre);
    return { centre, tangent, normal, basis };
  });
}

function ringVertex(ring: Ring, vertex: number): Vector3 {
  const angle = (vertex / RING_VERTICES) * Math.PI * 2;
  return new Vector3(
    Math.cos(angle) * HELIX_LOOK.ringRadius,
    Math.sin(angle) * HELIX_LOOK.ringRadius,
    0,
  ).applyMatrix4(ring.basis);
}

function glucoseGeometry(): BufferGeometry {
  const ring = new TorusGeometry(
    HELIX_LOOK.ringRadius,
    HELIX_LOOK.ringTube,
    DETAIL.ring[1],
    RING_VERTICES,
  );
  const knobs = [0, 2, 3, 4, 5].map((vertex) => {
    const angle = (vertex / RING_VERTICES) * Math.PI * 2;
    const knob = new SphereGeometry(HELIX_LOOK.knobRadius, 10, 8);
    knob.translate(
      Math.cos(angle) * HELIX_LOOK.ringRadius,
      Math.sin(angle) * HELIX_LOOK.ringRadius,
      0,
    );
    return knob;
  });
  const stubAngle = (C5 / RING_VERTICES) * Math.PI * 2;
  const stubFrom = new Vector3(Math.cos(stubAngle), Math.sin(stubAngle), 0).multiplyScalar(
    HELIX_LOOK.ringRadius,
  );
  const stubTo = stubFrom
    .clone()
    .multiplyScalar(1 + STUB_LENGTH / HELIX_LOOK.ringRadius)
    .add(new Vector3(0, 0, STUB_LIFT));
  return mergeParts([ring, ...knobs, stick(stubFrom, stubTo, HELIX_LOOK.linkRadius)]);
}

function stick(from: Vector3, to: Vector3, radius: number): BufferGeometry {
  const span = to.clone().sub(from);
  const geometry = new CylinderGeometry(radius, radius, span.length(), DETAIL.bond, 1, true);
  geometry.applyQuaternion(new Quaternion().setFromUnitVectors(UP, span.clone().normalize()));
  const middle = from.clone().add(to).multiplyScalar(HALF);
  geometry.translate(middle.x, middle.y, middle.z);
  return geometry;
}

function chainSlot(slot: number, spacing: number): Vector3 {
  return new Vector3(HELIX_AXIS.x, (slot - CENTRE_SLOT + HALF) * spacing, HELIX_AXIS.z);
}

interface Feeder {
  readonly start: Vector3;
  readonly mouth: number;
  readonly turn: Quaternion;
}

export class Helix {
  readonly root: Object3D;
  private readonly glow: ShaderMaterial;
  private readonly feeders: readonly Feeder[];
  private readonly polyLabel: Object3D;
  private readonly position = new Vector3();
  private readonly mouth = new Vector3();
  private readonly inside = new Vector3();
  private readonly rotation = new Quaternion();
  private readonly along = new Quaternion().setFromUnitVectors(new Vector3(1, 0, 0), UP);

  constructor(context: PartContext, parent: Object3D) {
    this.root = namedGroup('amylose', parent);
    const helixRings = rings();
    this.buildRings(context, helixRings);
    this.buildBackbone(context, helixRings);
    this.buildRibbon(context);
    this.glow = this.buildGlow(context);
    const front = helixRings.reduce((best, ring) =>
      ring.centre.z > best.centre.z && Math.abs(ring.centre.y) < 6 ? ring : best,
    );
    label(context, 'glucose', this.root, toPoint(front.centre));
    const side = helixPoint(2.5, HELIX_GEOMETRY.outerRadiusA);
    label(context, 'amylose', this.root, toPoint(side));
    this.polyLabel = label(
      context,
      'polyiodide',
      this.root,
      toPoint(chainSlot(GROWTH_ORDER[0], BOND_LENGTH_A.chain)),
    );
    const random = seededRandom(FEEDER_SEED);
    this.feeders = Array.from({ length: HELIX_LOOK.feeders }, (_, index) => {
      const angle = random() * Math.PI - Math.PI * HALF;
      const radius = lerp(...FEEDER_RADIUS, random());
      const mouth = index % 2 === 0 ? 1 : -1;
      return {
        start: new Vector3(
          HELIX_AXIS.x + Math.cos(angle) * radius,
          mouth * lerp(4, 16, random()),
          HELIX_AXIS.z + Math.sin(angle) * radius,
        ),
        mouth,
        turn: new Quaternion().setFromAxisAngle(
          new Vector3(random(), random(), random()).normalize(),
          random() * Math.PI,
        ),
      };
    });
  }

  draw(draw: DrawContext, { clock }: AssemblyState): void {
    const complex = clock.complex;
    const formed = smoothstep(clock.iodineM / I2_FINAL_M, 0, TRIIODIDE_SHARE);
    const spacing = lerp(
      BOND_LENGTH_A.triiodide,
      BOND_LENGTH_A.chain,
      smoothstep(complex, 0, GROW_SPACING),
    );
    let low = Infinity;
    let high = -Infinity;
    if (formed > 0) {
      const centre = chainSlot(CENTRE_SLOT, spacing);
      TRIIODIDE_SLOTS.forEach((slot) => {
        const at = chainSlot(slot, spacing);
        draw.batch.atom('triiodide', 'I', at, formed);
        low = Math.min(low, at.y);
        high = Math.max(high, at.y);
      });
      draw.batch.bond('triiodide', chainSlot(5, spacing), chainSlot(7, spacing), formed);
      draw.flashes.add(centre, THEME_GLOW.flash, Math.sin(Math.PI * formed) * FLASH_ALPHA);
      draw.labels.offer('triiodide', centre, LABEL_PRIORITY);
    }
    const grown = complex * GROWTH_ORDER.length;
    let top: Vector3 | null = null;
    GROWTH_ORDER.forEach((slot, order) => {
      const presence = smoothstep(grown - order, 0, 1);
      if (presence <= 0) return;
      const at = chainSlot(slot, spacing);
      draw.batch.atom('polyiodide', 'I', at, presence);
      draw.flashes.add(at, THEME_GLOW.flash, presence * (1 - presence) * 4 * FLASH_ALPHA);
      draw.sparkles.add(at, THEME_GLOW.chain, presence * SPARKLE_ALPHA);
      low = Math.min(low, at.y);
      high = Math.max(high, at.y);
      if (!top || at.y > top.y) top = at;
    });
    this.polyLabel.visible = top !== null;
    if (top) this.polyLabel.position.copy(top);
    this.drawFeeders(draw, complex);
    const uniforms = this.glow.uniforms;
    uniforms.uStrength.value = formed * HELIX_LOOK.glowStrength * lerp(GLOW_FLOOR, 1, complex);
    uniforms.uLow.value = Number.isFinite(low) ? low : 0;
    uniforms.uHigh.value = Number.isFinite(high) ? high : 0;
  }

  private drawFeeders(draw: DrawContext, complex: number): void {
    this.feeders.forEach((feeder, index) => {
      const start = index * FEEDER_STAGGER;
      const share = smoothstep(complex, start, start + HELIX_LOOK.feederWindow);
      if (share <= 0 || share >= 1) return;
      this.mouth.set(
        HELIX_AXIS.x,
        feeder.mouth * (HELIX_AXIS.y[1] + HELIX_LOOK.mouthGap),
        HELIX_AXIS.z,
      );
      this.inside.set(HELIX_AXIS.x, feeder.mouth * HELIX_AXIS.y[1] * HALF, HELIX_AXIS.z);
      const toMouth = smoothstep(share, 0, FEEDER_ENTER);
      const inward = smoothstep(share, FEEDER_ENTER, 1);
      this.position.lerpVectors(feeder.start, this.mouth, toMouth).lerp(this.inside, inward);
      this.rotation.copy(feeder.turn).slerp(this.along, smoothstep(share, HALF, FEEDER_ENTER));
      const presence = smoothstep(share, 0, 0.1) * (1 - smoothstep(share, ...FEEDER_FADE));
      draw.batch.molecule(
        'iodine',
        SHAPES.iodine,
        { position: this.position, rotation: this.rotation, scale: 1 },
        presence,
      );
      draw.labels.offer('iodine', this.position, LABEL_PRIORITY - index * 0.1);
    });
  }

  private buildRings(context: PartContext, helixRings: readonly Ring[]): void {
    const geometry = context.tracker.track(glucoseGeometry());
    const mesh = instanced(context, this.root, geometry, 'glucose', 'glucose', helixRings.length);
    mesh.name = 'glucoseRings';
    const oxygen = context.tracker.track(new SphereGeometry(1, ...DETAIL.atom));
    const oxygens = instanced(
      context,
      this.root,
      oxygen,
      'glucose',
      'atomO',
      helixRings.length * 2,
    );
    const scale = new Matrix4();
    const radius = HELIX_LOOK.knobRadius * 1.25;
    helixRings.forEach((ring, index) => {
      mesh.setMatrixAt(index, ring.basis);
      const ringOxygen = ringVertex(ring, O5);
      scale.makeScale(radius, radius, radius).setPosition(ringOxygen);
      oxygens.setMatrixAt(index * 2, scale);
      const stubAngle = (C5 / RING_VERTICES) * Math.PI * 2;
      const stubTip = new Vector3(Math.cos(stubAngle), Math.sin(stubAngle), 0)
        .multiplyScalar(HELIX_LOOK.ringRadius + STUB_LENGTH)
        .add(new Vector3(0, 0, STUB_LIFT))
        .applyMatrix4(ring.basis);
      scale.makeScale(radius, radius, radius).setPosition(stubTip);
      oxygens.setMatrixAt(index * 2 + 1, scale);
    });
    mesh.count = helixRings.length;
    oxygens.count = helixRings.length * 2;
  }

  private buildBackbone(context: PartContext, helixRings: readonly Ring[]): void {
    const links = helixRings.slice(0, -1).flatMap((ring, index) => {
      const from = ringVertex(ring, C1);
      const to = ringVertex(helixRings[index + 1], C4);
      const bridge = from.clone().add(to).multiplyScalar(HALF);
      const outward = new Vector3(bridge.x - HELIX_AXIS.x, 0, bridge.z - HELIX_AXIS.z).normalize();
      bridge.addScaledVector(outward, HELIX_LOOK.bridgeRadius);
      const sphere = new SphereGeometry(HELIX_LOOK.bridgeRadius, 12, 8);
      sphere.translate(bridge.x, bridge.y, bridge.z);
      return [
        stick(from, bridge, HELIX_LOOK.linkRadius),
        stick(bridge, to, HELIX_LOOK.linkRadius),
        sphere,
      ];
    });
    const sticks = links.filter((_, index) => index % 3 !== 2);
    const bridges = links.filter((_, index) => index % 3 === 2);
    addMeshes(context, this.root, sticks, 'backbone');
    addMeshes(context, this.root, bridges, 'bridgeOxygen');
  }

  private buildRibbon(context: PartContext): void {
    const samples = HELIX_GEOMETRY.turns * HELIX_LOOK.ribbonSamplesPerTurn;
    const positions: number[] = [];
    const normals: number[] = [];
    const indices: number[] = [];
    const half = HELIX_LOOK.ribbonWidth * HALF;
    for (let sample = 0; sample <= samples; sample += 1) {
      const share = (sample / samples) * HELIX_GEOMETRY.turns;
      const centre = helixPoint(share, HELIX_LOOK.ringCentreRadius);
      const radial = new Vector3(centre.x - HELIX_AXIS.x, 0, centre.z - HELIX_AXIS.z).normalize();
      positions.push(centre.x, centre.y - half, centre.z, centre.x, centre.y + half, centre.z);
      normals.push(radial.x, radial.y, radial.z, radial.x, radial.y, radial.z);
      if (sample < samples) {
        const base = sample * 2;
        indices.push(base, base + 2, base + 1, base + 1, base + 2, base + 3);
      }
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(positions, XYZ));
    geometry.setAttribute('normal', new Float32BufferAttribute(normals, XYZ));
    geometry.setIndex(indices);
    const ribbon = addMesh(context, this.root, geometry, 'amylose', 'ribbon');
    ribbon.name = 'amyloseRibbon';
    patchMaterial(ribbon.material as Material, {
      key: 'iodine-ribbon',
      uniforms: { uAxis: { value: new Vector2(HELIX_AXIS.x, HELIX_AXIS.z) } },
      vertexHead: WORLD_POSITION_VERTEX.head,
      vertex: [WORLD_POSITION_VERTEX.body],
      fragmentHead: 'varying vec3 vWorldPos;\nuniform vec2 uAxis;',
      fragment: [{ after: OPAQUE_FRAGMENT, code: RIBBON_FRONT }],
    });
    ribbon.renderOrder = 1;
  }

  private buildGlow(context: PartContext): ShaderMaterial {
    const shader = new ShaderMaterial({
      vertexShader: GLOW_VERTEX,
      fragmentShader: GLOW_FRAGMENT,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      uniforms: {
        uColour: { value: new Color(HELIX_LOOK.glow) },
        uCore: { value: new Color(HELIX_LOOK.glowCore) },
        uStrength: { value: 0 },
        uLow: { value: 0 },
        uHigh: { value: 0 },
      },
    });
    const height = HELIX_AXIS.y[1] - HELIX_AXIS.y[0];
    const geometry = new CylinderGeometry(
      HELIX_LOOK.glowRadius,
      HELIX_LOOK.glowRadius,
      height,
      24,
      8,
      true,
    );
    geometry.translate(HELIX_AXIS.x, 0, HELIX_AXIS.z);
    const mesh = addShaded(context, this.root, geometry, 'polyiodide', shader);
    mesh.name = 'chainGlow';
    mesh.renderOrder = 2;
    return shader;
  }
}

function addMeshes(
  context: PartContext,
  parent: Object3D,
  parts: BufferGeometry[],
  finish: 'backbone' | 'bridgeOxygen',
): void {
  addMesh(context, parent, mergeParts(parts), 'amylose', finish);
}

function toPoint({ x, y, z }: Vector3): Point {
  return [x, y, z];
}
