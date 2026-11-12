import {
  ExtrudeGeometry,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  Shape,
} from 'three';
import type { BufferGeometry, Mesh, Object3D, Texture } from 'three';
import type { AssemblyState, OpticsId } from '../../../ids';
import { WAFER } from '../../../model/layout';
import { SCAN_START_UNITS } from '../../../model/run';
import { fieldMm } from '../../../model/optics';
import { mm } from '../../../model/scale';
import { THEME } from '../../../theme';
import { registeredMaterial, registeredMesh } from '../context';
import type { PartContext } from '../context';
import { NOTCH_M, STRIP_LIFT, STRIP_OPACITY, WAFER_AT, WAFER_THICK } from './dims';
import { waferFieldTexture } from './textures';

const WAFER_SEGMENTS = 96;
const NOTCH_HALF_ANGLE = 0.02;
const STRIP_BIAS = -2;
const MIN_STRIP_M = 0.00001;

export interface WaferParts {
  strip: Mesh;
  update(state: AssemblyState): void;
}

function waferShape(): Shape {
  const radius = WAFER.diameterM / 2;
  const start = Math.PI / 2 + NOTCH_HALF_ANGLE;
  const shape = new Shape();
  shape.moveTo(radius * Math.cos(start), radius * Math.sin(start));
  shape.absarc(0, 0, radius, start, Math.PI / 2 - NOTCH_HALF_ANGLE + Math.PI * 2, false);
  shape.lineTo(0, radius - NOTCH_M);
  shape.closePath();
  return shape;
}

function waferGeometry(): BufferGeometry {
  const geometry = new ExtrudeGeometry(waferShape(), {
    depth: WAFER_THICK,
    bevelEnabled: false,
    curveSegments: WAFER_SEGMENTS,
  });
  const position = geometry.getAttribute('position');
  const uv = geometry.getAttribute('uv');
  for (let index = 0; index < uv.count; index += 1) {
    uv.setXY(
      index,
      position.getX(index) / WAFER.diameterM + 0.5,
      position.getY(index) / WAFER.diameterM + 0.5,
    );
  }
  return geometry.rotateX(-Math.PI / 2);
}

export function buildWafer(context: PartContext, carriage: Object3D): WaferParts {
  const textures: Record<OpticsId, Texture> = {
    na033: waferFieldTexture(context, 'na033'),
    na055: waferFieldTexture(context, 'na055'),
  };
  const material = registeredMaterial(
    context,
    'wafer',
    new MeshStandardMaterial({
      color: '#ffffff',
      roughness: 0.22,
      metalness: 0.7,
      map: textures.na033,
    }),
  );
  const disc = registeredMesh(context, waferGeometry(), 'wafer', material);
  disc.position.set(WAFER_AT[0], WAFER_AT[1] - WAFER_THICK, WAFER_AT[2]);
  const strip = registeredMesh(
    context,
    new PlaneGeometry(1, 1).rotateX(-Math.PI / 2),
    'wafer',
    new MeshBasicMaterial({
      color: THEME.euv,
      transparent: true,
      opacity: STRIP_OPACITY,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: STRIP_BIAS,
      polygonOffsetUnits: STRIP_BIAS,
    }),
  );
  strip.position.set(WAFER_AT[0], WAFER_AT[1] + STRIP_LIFT, WAFER_AT[2]);
  strip.visible = false;
  carriage.add(disc, strip);
  return {
    strip,
    update(state) {
      if (material.map !== textures[state.optics]) {
        material.map = textures[state.optics];
        material.needsUpdate = true;
      }
      const field = fieldMm(state.optics);
      const half = mm(field.h) / 2;
      const width = half - state.scan.waferOffsetM;
      strip.visible = state.phase >= SCAN_START_UNITS && width > MIN_STRIP_M;
      strip.scale.set(width, 1, mm(field.w));
      strip.position.x = WAFER_AT[0] - half + width / 2;
    },
  };
}
