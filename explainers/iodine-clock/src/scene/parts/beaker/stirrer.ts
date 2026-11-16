import {
  CapsuleGeometry,
  Color,
  CylinderGeometry,
  DoubleSide,
  PlaneGeometry,
  RingGeometry,
  ShaderMaterial,
} from 'three';
import type { Object3D } from 'three';
import { toRadians } from '@core/math';
import { STRUCTURE_GROUP } from '@core/scene/materials';
import type { AssemblyState } from '../../../ids';
import { STIR_BAR, STIR_BAR_Y, STIRRER, STIR_RPM } from '../../../model';
import { ACCENT, DETAIL, STIRRER_LOOK } from '../../constants';
import { box } from '@core/scene/geometry/box';
import { mergeParts } from '../../geometry/merge';
import { cylinderAlongZ, cylinderAt, roundedSlab, sphereAt } from '../../geometry/solids';
import { font, canvasTexture } from '../canvas';
import { addMesh, addShaded, label, namedGroup } from '../context';
import type { PartContext, Section } from '../context';
import { contactShadow } from './bench';

const TRAIL_VERTEX = /* glsl */ `
varying vec3 vLocal;
void main() {
  vLocal = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const TRAIL_FRAGMENT = /* glsl */ `
uniform vec3 uColour;
uniform float uOpacity;
uniform float uSpan;
uniform float uReach;
varying vec3 vLocal;
void main() {
  float angle = atan(-vLocal.z, vLocal.x);
  float behind = mod(-angle, 3.14159265);
  float fade = pow(clamp(1.0 - behind / uSpan, 0.0, 1.0), 2.0);
  float radial = smoothstep(0.2, 1.0, length(vLocal.xz) / uReach);
  gl_FragColor = vec4(uColour, uOpacity * fade * radial);
  #include <colorspace_fragment>
}
`;

const HALF = 0.5;
const QUARTER_TURN = Math.PI / 2;
const HALF_TURN = Math.PI;
const FOOT_RADIUS = 0.55;
const FOOT_INSET = 1.6;
const KNOB_MARK = [0.12, 0.55, 0.06] as const;
const DISPLAY = { width: 2.6, height: 1.1, depth: 0.08, texture: [256, 108] as const };
const LED_OFFSET_X = 2.2;
const BAND_RADIUS = 0.43;
const BAND_LENGTH = 0.55;
const SHADOW_SPREAD = 1.5;
const SHADOW_OPACITY = 0.8;

function body(context: PartContext, parent: Object3D): void {
  const [minX, maxX] = STIRRER.x;
  const [minZ, maxZ] = STIRRER.z;
  const halfX = (maxX - minX) * HALF;
  const halfZ = (maxZ - minZ) * HALF;
  const plateTop = STIRRER.y[1];
  const plateBottom = plateTop - STIRRER_LOOK.plateThickness;
  addMesh(
    context,
    parent,
    roundedSlab({
      halfX: halfX - STIRRER_LOOK.bodyInset,
      halfZ: halfZ - STIRRER_LOOK.bodyInset,
      corner: STIRRER_LOOK.bodyCorner,
      bottom: STIRRER_LOOK.footHeight,
      top: plateBottom,
      bevel: STIRRER_LOOK.bodyInset,
    }),
    'stirrer',
    'stirrerBody',
  );
  addMesh(
    context,
    parent,
    roundedSlab({
      halfX: halfX - STIRRER_LOOK.plateInset,
      halfZ: halfZ - STIRRER_LOOK.plateInset,
      corner: STIRRER_LOOK.plateCorner,
      bottom: plateBottom - STIRRER_LOOK.plateThickness,
      top: plateTop,
      bevel: STIRRER_LOOK.plateThickness * HALF,
    }),
    'stirrer',
    'stirrerPlate',
  );
  const feet = [-1, 1].flatMap((sx) =>
    [-1, 1].map((sz) =>
      cylinderAt(
        FOOT_RADIUS,
        0,
        STIRRER_LOOK.footHeight + STIRRER_LOOK.bodyInset,
        [sx * (halfX - FOOT_INSET), sz * (halfZ - FOOT_INSET)],
        DETAIL.bond,
      ),
    ),
  );
  addMesh(context, parent, mergeParts(feet), STRUCTURE_GROUP, 'rubber');
}

function front(context: PartContext, parent: Object3D): void {
  const faceZ = STIRRER.z[1];
  const { knobRadius, knobDepth, knobY, knobX } = STIRRER_LOOK;
  const knobs = [-knobX, knobX].map((x) =>
    cylinderAlongZ(knobRadius, knobDepth, [x, knobY, faceZ - 0.05], DETAIL.knob, knobRadius * 0.9),
  );
  addMesh(context, parent, mergeParts(knobs), 'stirrer', 'knob');
  const marks = [-knobX, knobX].map((x, index) => {
    const mark = box({
      minX: -KNOB_MARK[0] * HALF,
      maxX: KNOB_MARK[0] * HALF,
      minY: 0,
      maxY: KNOB_MARK[1] * knobRadius * 1.4,
      minZ: 0,
      maxZ: KNOB_MARK[2],
    });
    mark.rotateZ(index === 0 ? -0.9 : 0.6);
    mark.translate(x, knobY, faceZ + knobDepth - 0.04);
    return mark;
  });
  addMesh(context, parent, mergeParts(marks), 'stirrer', 'knobMark');
  addMesh(
    context,
    parent,
    sphereAt(STIRRER_LOOK.ledRadius, [-LED_OFFSET_X, knobY + 0.9, faceZ + 0.02], [12, 8]),
    'stirrer',
    'led',
  );
  display(context, parent, faceZ);
}

function display(context: PartContext, parent: Object3D, faceZ: number): void {
  const [width, height] = DISPLAY.texture;
  const texture = canvasTexture(context, width, height, (paint) => {
    paint.fillStyle = '#071b10';
    paint.fillRect(0, 0, width, height);
    paint.fillStyle = ACCENT.led;
    paint.font = font(height * 0.62);
    paint.textAlign = 'center';
    paint.textBaseline = 'middle';
    paint.fillText(String(STIR_RPM), width * HALF, height * 0.54);
  });
  const geometry = new PlaneGeometry(DISPLAY.width, DISPLAY.height);
  geometry.translate(0, STIRRER_LOOK.knobY, faceZ + 0.03);
  const screen = addMesh(context, parent, geometry, 'stirrer', {
    color: '#ffffff',
    map: texture,
    emissive: '#ffffff',
    emissiveMap: texture,
    emissiveIntensity: 0.9,
    roughness: 0.3,
  });
  screen.name = 'stirrerDisplay';
}

function trail(context: PartContext, parent: Object3D): void {
  const reach = STIR_BAR.length * HALF;
  const span = toRadians(STIRRER_LOOK.trailDeg);
  const shader = new ShaderMaterial({
    vertexShader: TRAIL_VERTEX,
    fragmentShader: TRAIL_FRAGMENT,
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
    uniforms: {
      uColour: { value: new Color('#f1f0ea') },
      uOpacity: { value: STIRRER_LOOK.trailOpacity },
      uSpan: { value: span },
      uReach: { value: reach },
    },
  });
  const geometries = [-span, HALF_TURN - span].map((start) => {
    const ring = new RingGeometry(STIR_BAR.width * HALF, reach, DETAIL.lathe / 2, 1, start, span);
    ring.rotateX(-QUARTER_TURN);
    return ring;
  });
  const mesh = addShaded(context, parent, mergeParts(geometries), 'stirBar', shader);
  mesh.name = 'stirTrail';
  mesh.renderOrder = 1;
}

function stirBar(context: PartContext, parent: Object3D): Object3D {
  const bar = namedGroup('stirBar', parent);
  bar.position.y = STIR_BAR_Y;
  const radius = STIR_BAR.height * HALF;
  const capsule = new CapsuleGeometry(radius, STIR_BAR.length - radius * 2, 6, 20);
  capsule.rotateZ(QUARTER_TURN);
  addMesh(context, bar, capsule, 'stirBar', 'stirBar');
  const band = new CylinderGeometry(BAND_RADIUS, BAND_RADIUS, BAND_LENGTH, 24);
  band.rotateZ(QUARTER_TURN);
  addMesh(context, bar, band, 'stirBar', 'stirBarBand');
  trail(context, bar);
  label(context, 'stirBar', bar, [0, 0, 0]);
  return bar;
}

export function buildStirrer(context: PartContext, parent: Object3D): Section {
  const root = namedGroup('stirrer', parent);
  body(context, root);
  front(context, root);
  const [minX, maxX] = STIRRER.x;
  const [minZ, maxZ] = STIRRER.z;
  contactShadow(
    context,
    root,
    (maxX - minX) * SHADOW_SPREAD,
    (maxZ - minZ) * SHADOW_SPREAD,
    SHADOW_OPACITY,
  );
  label(context, 'stirrer', root, [STIRRER.x[0] + 2, STIRRER.y[1] * 0.6, STIRRER.z[1]]);
  const bar = stirBar(context, root);
  return {
    root,
    setState: ({ clock }: AssemblyState) => {
      bar.rotation.y = toRadians(clock.stirDeg);
    },
  };
}
