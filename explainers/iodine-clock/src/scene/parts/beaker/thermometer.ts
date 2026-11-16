import {
  CapsuleGeometry,
  CylinderGeometry,
  Matrix4,
  PlaneGeometry,
  Quaternion,
  SphereGeometry,
  Vector3,
} from 'three';
import type { Object3D } from 'three';
import { clamp } from '@core/math';
import { STRUCTURE_GROUP } from '@core/scene/materials';
import { box } from '@core/scene/geometry/box';
import type { AssemblyState, Point } from '../../../ids';
import { THERMOMETER } from '../../../model';
import { DETAIL, THERMOMETER_LOOK } from '../../constants';
import { mergeParts } from '../../geometry/merge';
import { cylinderAt } from '../../geometry/solids';
import { canvasTexture, font } from '../canvas';
import { addMesh, label, namedGroup } from '../context';
import type { PartContext, Section } from '../context';
import { patchGlass } from '../patches';
import { RENDER_ORDER } from './glassware';

const STRIP_TEXTURE = [128, 1024] as const;
const STRIP_PAD = 0.04;
const STRIP_BACK = -0.12;
const TICK_STEP_C = 1;
const LABEL_STEP_C = 10;
const MID_STEP_C = 5;
const BULB_STRETCH = 2.2;
const BULB_CORE = 0.75;
const COLUMN_START = 0.9;
const HALF = 0.5;

const STAND = {
  base: [-11.5, 0, -6] as Point,
  plate: [6, 0.6, 9] as Point,
  rodRadius: 0.32,
  rodHeight: 30,
  armShare: 0.87,
  armRadius: 0.22,
  bossSize: 0.9,
  jaw: 0.55,
};

interface AxisFrame {
  readonly origin: Vector3;
  readonly direction: Vector3;
  readonly length: number;
  readonly rotation: Quaternion;
}

function axisFrame(): AxisFrame {
  const origin = new Vector3(...THERMOMETER.bulb);
  const direction = new Vector3(...THERMOMETER.top).sub(origin);
  const length = direction.length();
  direction.normalize();
  const front = new Vector3(0, 0, 1).addScaledVector(direction, -direction.z).normalize();
  const side = new Vector3().crossVectors(direction, front);
  const basis = new Matrix4().makeBasis(side, direction, front);
  return { origin, direction, length, rotation: new Quaternion().setFromRotationMatrix(basis) };
}

function stripPainter(paint: CanvasRenderingContext2D, width: number, height: number): void {
  const { min, max } = THERMOMETER.scaleC;
  paint.fillStyle = '#f3f1ea';
  paint.fillRect(0, 0, width, height);
  paint.fillStyle = '#1b1d22';
  paint.strokeStyle = '#1b1d22';
  paint.textBaseline = 'middle';
  paint.font = font(width * 0.34);
  const span = max - min;
  for (let degree = min; degree <= max; degree += TICK_STEP_C) {
    const share = (degree - min) / span;
    const y = height * (1 - (STRIP_PAD + share * (1 - STRIP_PAD * 2)));
    const major = degree % LABEL_STEP_C === 0;
    const mid = degree % MID_STEP_C === 0;
    paint.lineWidth = major ? 4 : 2;
    paint.beginPath();
    paint.moveTo(0, y);
    paint.lineTo(width * (major ? 0.42 : mid ? 0.32 : 0.2), y);
    paint.stroke();
    if (major) paint.fillText(String(degree), width * 0.5, y);
  }
}

function stand(context: PartContext, parent: Object3D, clampPoint: Vector3): void {
  const [x, , z] = STAND.base;
  const [width, height, depth] = STAND.plate;
  const plate = box({
    minX: x - width * HALF,
    maxX: x + width * HALF,
    minY: 0,
    maxY: height,
    minZ: z - depth * HALF,
    maxZ: z + depth * HALF,
  });
  const rod = cylinderAt(STAND.rodRadius, height, STAND.rodHeight, [x, z], DETAIL.bond * 2);
  const start = new Vector3(x, clampPoint.y, z);
  const reach = clampPoint.clone().sub(start);
  const arm = new CylinderGeometry(
    STAND.armRadius,
    STAND.armRadius,
    reach.length(),
    DETAIL.bond * 2,
  );
  arm.applyQuaternion(
    new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), reach.clone().normalize()),
  );
  arm.translate(...start.clone().addScaledVector(reach, HALF).toArray());
  const boss = box({
    minX: x - STAND.bossSize * HALF,
    maxX: x + STAND.bossSize * HALF,
    minY: clampPoint.y - STAND.bossSize * HALF,
    maxY: clampPoint.y + STAND.bossSize * HALF,
    minZ: z - STAND.bossSize * HALF,
    maxZ: z + STAND.bossSize * HALF,
  });
  const jaw = new SphereGeometry(STAND.jaw, DETAIL.bond * 2, DETAIL.bond);
  jaw.scale(1, 0.6, 1);
  jaw.translate(...clampPoint.toArray());
  addMesh(context, parent, mergeParts([plate, rod, arm, boss, jaw]), STRUCTURE_GROUP, 'standLeg');
}

export function buildThermometer(context: PartContext, parent: Object3D): Section {
  const root = namedGroup('thermometer', parent);
  const { origin, direction, length, rotation } = axisFrame();
  const body = namedGroup('thermometerBody', root);
  body.position.copy(origin);
  body.quaternion.copy(rotation);
  const { tubeRadius, bulbRadius, capillaryRadius, scaleStart, scaleEnd, stripWidth } =
    THERMOMETER_LOOK;
  const tube = new CapsuleGeometry(tubeRadius, length, 4, DETAIL.tube * 2);
  tube.translate(0, length * HALF, 0);
  const glass = addMesh(context, body, tube, 'thermometer', 'glass');
  glass.renderOrder = RENDER_ORDER.outerGlass;
  patchGlass(glass.material as never);
  const bulb = new SphereGeometry(bulbRadius * BULB_CORE, DETAIL.tube * 2, DETAIL.tube);
  bulb.scale(1, BULB_STRETCH, 1);
  bulb.translate(0, bulbRadius * BULB_STRETCH * BULB_CORE, 0);
  addMesh(context, body, bulb, 'thermometer', 'alcohol');
  const columnGeometry = new CylinderGeometry(capillaryRadius, capillaryRadius, 1, DETAIL.bond);
  columnGeometry.translate(0, HALF, 0);
  const column = addMesh(context, body, columnGeometry, 'thermometer', 'alcohol');
  column.name = 'thermometerColumn';
  column.position.y = COLUMN_START;
  const stripLength = length * (scaleEnd - scaleStart) * (1 + STRIP_PAD * 2);
  const strip = new PlaneGeometry(stripWidth, stripLength);
  strip.translate(0, length * (scaleStart + scaleEnd) * HALF, STRIP_BACK);
  const [textureWidth, textureHeight] = STRIP_TEXTURE;
  addMesh(context, body, strip, 'thermometer', {
    color: '#ffffff',
    map: canvasTexture(context, textureWidth, textureHeight, stripPainter),
    roughness: 0.6,
  });
  label(context, 'thermometer', body, [0, length * scaleEnd, 0]);
  stand(context, root, origin.clone().addScaledVector(direction, length * STAND.armShare));

  const { min, max } = THERMOMETER.scaleC;
  return {
    root,
    setState: ({ clock }: AssemblyState) => {
      const share = clamp((clock.temperatureC - min) / (max - min), 0, 1);
      const top = length * (scaleStart + share * (scaleEnd - scaleStart));
      column.scale.y = Math.max(0.01, top - COLUMN_START);
    },
  };
}
