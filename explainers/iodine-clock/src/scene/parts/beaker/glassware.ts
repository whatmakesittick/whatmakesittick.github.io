import { CylinderGeometry } from 'three';
import type { Mesh, Object3D } from 'three';
import { toRadians } from '@core/math';
import type { PartId } from '../../../ids';
import { BEAKER_LOOK, DETAIL } from '../../constants';
import { beakerSurfaces } from '../../geometry/beaker';
import type { BeakerShape } from '../../geometry/beaker';
import { canvasTexture, font } from '../canvas';
import type { Painter } from '../canvas';
import { addMesh } from '../context';
import type { PartContext } from '../context';
import { patchGlass } from '../patches';

export const RENDER_ORDER = {
  innerGlass: 1,
  liquid: 2,
  stream: 3,
  print: 4,
  outerGlass: 5,
  veil: 10,
} as const;

export interface Glassware {
  readonly outer: Mesh;
  readonly inner: Mesh;
}

export function addGlassware(
  context: PartContext,
  parent: Object3D,
  part: PartId,
  shape: BeakerShape,
): Glassware {
  const { outer, inner } = beakerSurfaces(shape);
  const outerMesh = addMesh(context, parent, outer, part, 'glass');
  const innerMesh = addMesh(context, parent, inner, part, 'innerGlass');
  outerMesh.renderOrder = RENDER_ORDER.outerGlass;
  innerMesh.renderOrder = RENDER_ORDER.innerGlass;
  [outerMesh, innerMesh].forEach((mesh) => patchGlass(mesh.material as never));
  return { outer: outerMesh, inner: innerMesh };
}

export interface Graduation {
  readonly millilitres: readonly number[];
  readonly labelled: readonly number[];
  readonly capacityLabel: string;
  readonly areaCm2: number;
}

const TEXTURE = [512, 1024] as const;
const MAJOR_TICK = 0.34;
const MINOR_TICK = 0.2;
const LINE_WIDTH = 5;
const TEXT_SIZE = 46;
const TITLE_SIZE = 54;
const TEXT_GAP = 14;
const TITLE_OFFSET = 1.25;

function graduationPainter(shape: BeakerShape, graduation: Graduation): Painter {
  const floor = shape.glass;
  const span = shape.height - floor;
  return (paint, width, height) => {
    paint.clearRect(0, 0, width, height);
    paint.strokeStyle = '#ffffff';
    paint.fillStyle = '#ffffff';
    paint.lineWidth = LINE_WIDTH;
    paint.textBaseline = 'middle';
    paint.font = font(TEXT_SIZE);
    graduation.millilitres.forEach((ml) => {
      const level = ml / graduation.areaCm2 / span;
      const y = height * (1 - level);
      const labelled = graduation.labelled.includes(ml);
      const tick = width * (labelled ? MAJOR_TICK : MINOR_TICK);
      paint.beginPath();
      paint.moveTo(0, y);
      paint.lineTo(tick, y);
      paint.stroke();
      if (labelled) paint.fillText(String(ml), tick + TEXT_GAP, y);
    });
    const top = graduation.millilitres[graduation.millilitres.length - 1];
    const titleY = height * (1 - top / graduation.areaCm2 / span) - TITLE_SIZE * TITLE_OFFSET;
    paint.font = font(TITLE_SIZE);
    paint.fillText(graduation.capacityLabel, 0, Math.max(TITLE_SIZE, titleY));
  };
}

export function addGraduation(
  context: PartContext,
  parent: Object3D,
  part: PartId,
  shape: BeakerShape,
  graduation: Graduation,
): Mesh {
  const [width, height] = TEXTURE;
  const texture = canvasTexture(context, width, height, graduationPainter(shape, graduation));
  const radius = shape.innerRadius + shape.glass + BEAKER_LOOK.printLift;
  const arc = toRadians(BEAKER_LOOK.printArcDeg);
  const start = toRadians(BEAKER_LOOK.printCentreDeg) - arc / 2;
  const span = shape.height - shape.glass;
  const geometry = new CylinderGeometry(
    radius,
    radius,
    span,
    DETAIL.lathe / 4,
    1,
    true,
    start,
    arc,
  );
  geometry.translate(0, shape.glass + span / 2, 0);
  const mesh = addMesh(context, parent, geometry, part, {
    color: '#f4f6f8',
    map: texture,
    transparent: true,
    depthWrite: false,
    roughness: 0.55,
    metalness: 0,
  });
  mesh.renderOrder = RENDER_ORDER.print;
  return mesh;
}
