import {
  AdditiveBlending,
  BoxGeometry,
  CylinderGeometry,
  Quaternion,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  TorusGeometry,
  Vector3,
} from 'three';
import type { BufferGeometry, Object3D, Mesh } from 'three';
import { toRadians } from '@core/math';
import { box } from '@core/scene/geometry/box';
import type { AssemblyState, Point } from '../../ids';
import { CRANK_Y, SAW_GEOMETRY, SPARK_DEG, STARTER_GEOMETRY } from '../../model';
import { THEME } from '../../theme';
import { mergeParts } from '../geometry/merge';
import { sectorAroundZ } from '../geometry/sector';
import { tubeThrough } from '../geometry/profile';
import { Ease } from './ease';
import { addPart, label, namedGroup, partMesh, registeredMaterial } from './context';
import type { PartContext, Section } from './context';

const { flywheel: FLYWHEEL, pawls: PAWLS, pulley: PULLEY } = STARTER_GEOMETRY;
const FLY_FRONT = FLYWHEEL.centre[2] - FLYWHEEL.thickness / 2;
const FLY_BACK = FLYWHEEL.centre[2] + FLYWHEEL.thickness / 2;
const PULLEY_FRONT = PULLEY.centre[2] - PULLEY.thickness / 2;
const PULLEY_BACK = PULLEY.centre[2] + PULLEY.thickness / 2;
const VANES = 12;
const VANE = { inner: 0.012, depth: 0.004, width: 0.0016 } as const;
const MAGNET_HALF_DEG = 13;
const HUB = 0.009;
const PAWL = { pivot: 0.007, length: 0.009, width: 0.003, depth: 0.003, swingDeg: 35 } as const;
const PULLEY_PARTS = {
  hub: 0.005,
  rimInner: 0.013,
  groove: 0.017,
  flange: 0.0015,
  spokes: 3,
  spoke: 0.004,
} as const;
const ROPE = { radius: 0.0018, coil: 0.0195, segments: 8 } as const;
const GRIP = { radius: 0.0072, knob: 0.0085 } as const;
const COIL = { leg: 0.004, legSpan: 0.0065, depth: 0.01, bar: 0.005, winding: 0.009 } as const;
const COIL_LEAD: readonly Point[] = [
  [0.034, 0.156, -0.078],
  [0.03, 0.19, -0.074],
  [0.018, 0.235, -0.05],
  [0.006, 0.26, -0.02],
  [0, 0.264, -0.004],
];
const SPARK_SIZE = 0.022;
const PRIMER_SQUASH = 0.65;
const CHOKE = { width: 0.008, thickness: 0.004, knob: 0.005 } as const;
const BUTTON_HEIGHT = 0.006;
const UNIT_Y = new Vector3(0, 1, 0);

function zDisc(radius: number, from: number, to: number, x = 0, y = 0): BufferGeometry {
  const geometry = new CylinderGeometry(radius, radius, to - from, 24);
  geometry.rotateX(Math.PI / 2);
  geometry.translate(x, y, (from + to) / 2);
  return geometry;
}

function ring(
  inner: number,
  outer: number,
  from: number,
  to: number,
  fromDeg = 0,
  toDeg = 360,
): BufferGeometry {
  return sectorAroundZ({ inner, outer, bottom: from, top: to, fromDeg, toDeg });
}

function flywheelBody(): BufferGeometry {
  const vanes = Array.from({ length: VANES }, (_, index) => {
    const vane = new BoxGeometry(FLYWHEEL.radius - VANE.inner, VANE.width, VANE.depth);
    vane.translate((FLYWHEEL.radius + VANE.inner) / 2, 0, FLY_FRONT - VANE.depth / 2);
    vane.rotateZ((Math.PI * 2 * index) / VANES);
    return vane;
  });
  return mergeParts([
    ring(HUB, FLYWHEEL.radius, FLY_FRONT, FLY_BACK),
    ring(0, HUB, FLY_FRONT - VANE.depth, FLY_BACK),
    ...vanes,
  ]);
}

function magnet(): BufferGeometry {
  const centre = STARTER_GEOMETRY.coilAngleDeg + SPARK_DEG;
  return ring(
    FLYWHEEL.radius - 0.005,
    FLYWHEEL.radius + 0.0006,
    FLY_FRONT - 0.0003,
    FLY_BACK + 0.0003,
    centre - MAGNET_HALF_DEG,
    centre + MAGNET_HALF_DEG,
  );
}

function pawlGeometry(): BufferGeometry {
  const geometry = new BoxGeometry(PAWL.length, PAWL.width, PAWL.depth);
  geometry.translate(PAWL.length / 2, 0, PAWLS.z);
  return geometry;
}

function pulleyBody(): BufferGeometry {
  const spokes = Array.from({ length: PULLEY_PARTS.spokes }, (_, index) => {
    const spoke = new BoxGeometry(
      PULLEY_PARTS.rimInner - PULLEY_PARTS.hub,
      PULLEY_PARTS.spoke,
      PULLEY.thickness,
    );
    spoke.translate((PULLEY_PARTS.rimInner + PULLEY_PARTS.hub) / 2, 0, PULLEY.centre[2]);
    spoke.rotateZ((Math.PI * 2 * index) / PULLEY_PARTS.spokes);
    return spoke;
  });
  return mergeParts([
    ring(0, PULLEY_PARTS.hub, PULLEY_FRONT, PULLEY_BACK),
    ring(PULLEY_PARTS.rimInner, PULLEY_PARTS.groove, PULLEY_FRONT, PULLEY_BACK),
    ring(PULLEY_PARTS.groove, PULLEY.radius, PULLEY_FRONT, PULLEY_FRONT + PULLEY_PARTS.flange),
    ring(PULLEY_PARTS.groove, PULLEY.radius, PULLEY_BACK - PULLEY_PARTS.flange, PULLEY_BACK),
    ...spokes,
  ]);
}

function coilBody(): BufferGeometry {
  const inner = FLYWHEEL.radius + STARTER_GEOMETRY.coilDrawnGap;
  const outer = inner + COIL.depth;
  const z = { minZ: FLY_FRONT, maxZ: FLY_BACK };
  const leg = (side: number) =>
    box({
      minX: inner,
      maxX: outer,
      minY: side * COIL.legSpan - COIL.leg / 2,
      maxY: side * COIL.legSpan + COIL.leg / 2,
      ...z,
    });
  const bar = box({
    minX: outer,
    maxX: outer + COIL.bar,
    minY: -COIL.legSpan - COIL.leg / 2,
    maxY: COIL.legSpan + COIL.leg / 2,
    ...z,
  });
  return mergeParts([leg(1), leg(-1), bar]);
}

function winding(): BufferGeometry {
  const inner = FLYWHEEL.radius + STARTER_GEOMETRY.coilDrawnGap + COIL.depth + COIL.bar;
  return box({
    minX: inner,
    maxX: inner + COIL.winding,
    minY: -COIL.winding / 2,
    maxY: COIL.winding / 2,
    minZ: FLY_FRONT - 0.001,
    maxZ: FLY_BACK + 0.001,
  });
}

function gripBody(): BufferGeometry {
  const half = STARTER_GEOMETRY.gripLength / 2;
  const bar = new CylinderGeometry(GRIP.radius, GRIP.radius, STARTER_GEOMETRY.gripLength, 16);
  bar.rotateZ(Math.PI / 2);
  const knob = (x: number) => new SphereGeometry(GRIP.knob, 12, 8).translate(x, 0, 0);
  return mergeParts([bar, knob(half), knob(-half)]);
}

function primerDome(): BufferGeometry {
  const dome = new SphereGeometry(
    SAW_GEOMETRY.primerBulb.radius,
    18,
    9,
    0,
    Math.PI * 2,
    0,
    Math.PI / 2,
  );
  dome.rotateX(-Math.PI / 2);
  return dome;
}

function chokeTab(): BufferGeometry {
  const { length } = SAW_GEOMETRY.chokeLever;
  return mergeParts([
    box({
      minX: -CHOKE.width / 2,
      maxX: CHOKE.width / 2,
      minY: 0,
      maxY: length,
      minZ: -CHOKE.thickness / 2,
      maxZ: CHOKE.thickness / 2,
    }),
    new SphereGeometry(CHOKE.knob, 10, 6).translate(0, length, 0),
  ]);
}

function sparkSprite(context: PartContext, parent: Object3D, at: Point): Sprite {
  const material = registeredMaterial(
    context,
    'ignitionCoil',
    new SpriteMaterial({
      map: context.textures.glow,
      color: THEME.spark,
      blending: AdditiveBlending,
      depthWrite: false,
      depthTest: false,
    }),
  );
  const sprite = new Sprite(material);
  sprite.position.set(...at);
  sprite.renderOrder = 2;
  parent.add(sprite);
  return sprite;
}

function stretch(mesh: Mesh, from: Vector3, to: Vector3): void {
  const span = to.clone().sub(from);
  const length = Math.max(span.length(), 1e-4);
  mesh.position.copy(from).addScaledVector(span, 0.5);
  mesh.quaternion.copy(new Quaternion().setFromUnitVectors(UNIT_Y, span.divideScalar(length)));
  mesh.scale.set(1, length, 1);
}

export function buildStarter(context: PartContext, parent: Object3D): Section {
  const root = namedGroup('starterSide', parent);

  const flywheel = namedGroup('flywheel', root);
  flywheel.position.set(0, CRANK_Y, 0);
  addPart(context, flywheel, flywheelBody(), 'flywheel');
  addPart(context, flywheel, magnet(), 'flywheel', 'magnet');
  label(context, 'flywheel', root, [-0.024, CRANK_Y - 0.024, FLY_FRONT - VANE.depth]);
  const pawls = [0, 180].map((deg) => {
    const pawl = namedGroup('pawl', flywheel);
    const angle = toRadians(deg);
    pawl.position.set(PAWL.pivot * Math.cos(angle), PAWL.pivot * Math.sin(angle), 0);
    addPart(context, pawl, pawlGeometry(), 'pawls');
    return { pawl, base: angle + Math.PI / 2 };
  });
  label(context, 'pawls', root, [0, CRANK_Y + PAWLS.radius, PAWLS.z]);

  const pulley = namedGroup('starterPulley', root);
  pulley.position.set(0, CRANK_Y, 0);
  addPart(context, pulley, pulleyBody(), 'starterPulley');
  addPart(
    context,
    pulley,
    ring(
      PULLEY_PARTS.groove,
      ROPE.coil,
      PULLEY_FRONT + PULLEY_PARTS.flange,
      PULLEY_BACK - PULLEY_PARTS.flange,
    ),
    'starterRope',
  );
  label(context, 'starterPulley', root, [
    PULLEY.radius * 0.7,
    CRANK_Y + PULLEY.radius * 0.7,
    PULLEY_FRONT,
  ]);

  const [eyeX, eyeY, eyeZ] = STARTER_GEOMETRY.ropeEye;
  const eye = new Vector3(eyeX, eyeY, eyeZ);
  const leave = new Vector3(-ROPE.coil, CRANK_Y, PULLEY.centre[2]);
  const fixedRope = partMesh(
    context,
    new CylinderGeometry(ROPE.radius, ROPE.radius, 1, ROPE.segments),
    'starterRope',
  );
  stretch(fixedRope, leave, eye);
  root.add(fixedRope);
  const drawnRope = partMesh(
    context,
    new CylinderGeometry(ROPE.radius, ROPE.radius, 1, ROPE.segments),
    'starterRope',
  );
  root.add(drawnRope);
  addPart(
    context,
    root,
    new TorusGeometry(0.004, 0.0015, 8, 16).translate(eyeX, eyeY, eyeZ),
    'starter',
    'grip',
  );
  label(context, 'starterRope', root, [eyeX, (eyeY + CRANK_Y) / 2 + 0.02, eyeZ]);

  const grip = namedGroup('starterGrip', root);
  addPart(context, grip, gripBody(), 'starterGrip');
  label(context, 'starterGrip', grip, [STARTER_GEOMETRY.gripLength * 0.3, GRIP.radius, 0]);

  const coil = namedGroup('ignitionCoil', root);
  coil.position.set(0, CRANK_Y, 0);
  coil.rotation.z = toRadians(STARTER_GEOMETRY.coilAngleDeg);
  addPart(context, coil, coilBody(), 'ignitionCoil');
  addPart(context, coil, winding(), 'ignitionCoil', 'winding');
  label(context, 'ignitionCoil', coil, [
    FLYWHEEL.radius + STARTER_GEOMETRY.coilDrawnGap + COIL.depth,
    0,
    FLY_FRONT - 0.001,
  ]);
  addPart(context, root, tubeThrough(COIL_LEAD, 0.0016), 'ignitionCoil', 'plugBoot');
  const gap = FLYWHEEL.radius + STARTER_GEOMETRY.coilDrawnGap / 2;
  const coilAngle = toRadians(STARTER_GEOMETRY.coilAngleDeg);
  const coilSpark = sparkSprite(context, root, [
    gap * Math.cos(coilAngle),
    CRANK_Y + gap * Math.sin(coilAngle),
    FLY_FRONT - 0.002,
  ]);

  const primer = namedGroup('primerBulb', root);
  primer.position.set(...SAW_GEOMETRY.primerBulb.centre);
  const clear = addPart(context, primer, primerDome(), 'primerBulb');
  const filled = addPart(context, primer, primerDome(), 'primerBulb', 'primerFuel');
  addPart(
    context,
    root,
    new TorusGeometry(SAW_GEOMETRY.primerBulb.radius, 0.0015, 8, 24).translate(
      ...SAW_GEOMETRY.primerBulb.centre,
    ),
    'primerBulb',
    'grip',
  );
  label(context, 'primerBulb', primer, [0, 0, -SAW_GEOMETRY.primerBulb.radius]);

  const choke = namedGroup('chokeLever', root);
  choke.position.set(...SAW_GEOMETRY.chokeLever.pivot);
  addPart(context, choke, chokeTab(), 'chokeLever');
  label(context, 'chokeLever', choke, [0, SAW_GEOMETRY.chokeLever.length, -CHOKE.knob]);

  const button = namedGroup('decompressionValve', root);
  const [buttonX, buttonY, buttonZ] = SAW_GEOMETRY.decompressionValve.centre;
  addPart(
    context,
    button,
    zDisc(SAW_GEOMETRY.decompressionValve.radius, 0, BUTTON_HEIGHT)
      .rotateX(-Math.PI / 2)
      .translate(0, -BUTTON_HEIGHT, 0),
    'decompressionValve',
  );
  label(context, 'decompressionValve', button, [0, BUTTON_HEIGHT, 0]);

  const swing = new Ease(0);
  const sink = new Ease(0);
  const gripAt = new Vector3();
  const pose = () => {
    pawls.forEach(({ pawl, base }) => {
      pawl.rotation.z = base - toRadians(PAWL.swingDeg) * swing.value;
    });
    button.position.set(
      buttonX,
      buttonY + BUTTON_HEIGHT - SAW_GEOMETRY.decompressionValve.travel * sink.value,
      buttonZ,
    );
  };
  return {
    root,
    setState: (state: AssemblyState) => {
      const { start, crank } = state;
      flywheel.rotation.z = -toRadians(crank.angle);
      pulley.rotation.z = -toRadians(start.pulleyDeg);
      const reach = start.ropeOut * STARTER_GEOMETRY.ropeDrawM;
      gripAt
        .set(...STARTER_GEOMETRY.gripRest)
        .addScaledVector(new Vector3(...STARTER_GEOMETRY.ropeDirection), reach);
      grip.position.copy(gripAt);
      stretch(drawnRope, eye, gripAt);
      coilSpark.visible = crank.sparkGlow > 0;
      coilSpark.scale.setScalar(SPARK_SIZE * Math.max(crank.sparkGlow, 0.001));
      primer.scale.set(1, 1, 1 - PRIMER_SQUASH * start.primerSqueeze);
      const primed =
        start.engine !== 'stopped' ||
        (start.starting &&
          start.step !== 'brake' &&
          start.step !== 'choke' &&
          start.step !== 'decompression');
      filled.visible = primed;
      clear.visible = !primed;
      choke.rotation.x = -toRadians(SAW_GEOMETRY.chokeLever.onDeg) * start.chokeLever;
      swing.aim(start.pawlsEngaged ? 1 : 0);
      sink.aim(start.decompressionIn ? 1 : 0);
      pose();
    },
    update: (deltaSeconds: number) => {
      swing.step(deltaSeconds);
      sink.step(deltaSeconds);
      pose();
      return swing.running || sink.running;
    },
  };
}
