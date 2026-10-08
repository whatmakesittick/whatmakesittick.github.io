import { InstancedMesh, LineSegments, Matrix4, Mesh, Vector3 } from 'three';
import type { BufferGeometry, Object3D } from 'three';
import { describe, expect, it } from 'vitest';
import { MaterialLibrary } from '@core/scene/materials';
import { ResourceTracker } from '@core/scene/resources';
import type { SceneTextures } from '@core/scene/textures';
import type { AssemblyState, SpacingD } from '../../../ids';
import {
  MAX_RPM,
  ROTOR_RADIUS_M,
  SUBSTATION,
  TURBINE_COUNT,
  TURBINE_GEOMETRY,
  WAKE_DECAY,
  farmLayout,
} from '../../../model';
import type { PartContext } from '../context';
import { discOpacity } from './discs';
import { rotorMatrix } from './fleet';
import { ribbonGeometry } from './ground';
import { buildFarm } from './index';
import { plumeAlpha, plumeRadius } from './plumeGeometry';
import { plumeOpacity } from './plumes';
import { farmRoutes } from './routes';
import { SHADOW_HEADING } from './shadows';

const SPACING: SpacingD = 7;
const QUARTER_TURN = Math.PI / 2;
const TRIANGLE_BUDGET = 150_000;
const DRAW_CALL_BUDGET = 25;
const FLEET_PIECES = ['tower', 'nacelle', 'hub', 'rotor'] as const;

function farmState(spacing: SpacingD): AssemblyState {
  return {
    scene: 'farm',
    phase: 0,
    playing: false,
    wind: { speed: 9, fromDeg: 270, induction: 0.25 },
    rotor: { rpm: 8, pitchDeg: 0, yawDeg: 270, state: 'partial', braked: false, powerShare: 0.5 },
    farm: {
      spacing,
      sites: farmLayout(spacing),
      deficits: Array.from({ length: TURBINE_COUNT }, () => 0.2),
      plumeLengthD: 8,
      plumeStrength: 0.3,
      outputShare: 0.5,
    },
    view: { streamlines: false, wakes: true, cables: true, labels: true, cutaway: false },
  };
}

function farmContext(): PartContext {
  return {
    materials: new MaterialLibrary(),
    tracker: new ResourceTracker(),
    textures: {} as SceneTextures,
    labels: new Map(),
    anchors: {},
  };
}

function triangles(geometry: BufferGeometry): number {
  const count = geometry.index?.count ?? geometry.getAttribute('position').count;
  return count / 3;
}

function drawCalls(root: Object3D): number {
  let total = 0;
  root.traverse((object) => {
    if (object instanceof Mesh || object instanceof LineSegments) total += 1;
  });
  return total;
}

function drawnTriangles(root: Object3D): number {
  let total = 0;
  root.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    const copies = object instanceof InstancedMesh ? object.count : 1;
    total += triangles(object.geometry) * copies;
  });
  return total;
}

describe('farm diorama', () => {
  it('turns a rotor clockwise seen from upwind, top tip toward +z', () => {
    const tip = new Vector3(0, ROTOR_RADIUS_M, 0).applyMatrix4(
      rotorMatrix(new Matrix4(), QUARTER_TURN),
    );
    const [hubX, hubY] = TURBINE_GEOMETRY.hub;
    expect(tip.x).toBeCloseTo(hubX);
    expect(tip.y).toBeCloseTo(hubY);
    expect(tip.z).toBeCloseTo(ROTOR_RADIUS_M);
  });

  it('expands a plume by the wake decay and fades it at both ends', () => {
    expect(plumeRadius(0)).toBe(ROTOR_RADIUS_M);
    expect(plumeRadius(1000)).toBeCloseTo(ROTOR_RADIUS_M + WAKE_DECAY * 1000);
    expect(plumeAlpha(0, 1200)).toBe(0);
    expect(plumeAlpha(1200, 1200)).toBe(0);
    expect(plumeAlpha(300, 1200)).toBeGreaterThan(0.3);
  });

  it('thickens rotor blur discs with rpm and hides them at a standstill', () => {
    expect(discOpacity(0)).toBe(0);
    expect(discOpacity(MAX_RPM / 2)).toBeLessThan(discOpacity(MAX_RPM));
    expect(discOpacity(MAX_RPM)).toBeGreaterThan(0.25);
  });

  it('lets a strong wake plume reach its full opacity', () => {
    expect(plumeOpacity(0.6)).toBeCloseTo(0.45);
    expect(plumeOpacity(0.2)).toBeLessThan(plumeOpacity(0.6));
  });

  it('casts the turbine contact shadows toward the north-east', () => {
    expect(SHADOW_HEADING.x).toBeGreaterThan(0);
    expect(SHADOW_HEADING.y).toBeLessThan(0);
  });

  it('faces ground ribbons up whichever way they run', () => {
    const geometry = ribbonGeometry(
      [
        [0, 0],
        [0, 500],
        [-400, 900],
      ],
      { width: 10, lift: 2, period: 50 },
    );
    const normals = geometry.getAttribute('normal');
    for (let index = 0; index < normals.count; index += 1)
      expect(normals.getY(index)).toBeGreaterThan(0.9);
  });

  it('runs each collector route to the substation fence', () => {
    farmRoutes(SPACING).forEach((route) => {
      const [x, z] = route[route.length - 1];
      const onSide = Math.abs(Math.abs(x - SUBSTATION.x) - SUBSTATION.width / 2) < 1e-6;
      const onEnd = Math.abs(Math.abs(z - SUBSTATION.z) - SUBSTATION.depth / 2) < 1e-6;
      expect(onSide || onEnd).toBe(true);
    });
  });

  it('draws 27 instanced turbines within the triangle and draw call budgets', () => {
    const context = farmContext();
    const section = buildFarm(context);
    section.setState(farmState(SPACING));
    FLEET_PIECES.forEach((piece) => {
      const mesh = section.root.getObjectByName(`farmTurbines.${piece}`);
      expect(mesh).toBeInstanceOf(InstancedMesh);
      expect((mesh as InstancedMesh).count).toBe(TURBINE_COUNT);
    });
    const discs = section.root.getObjectByName('turbineDiscs');
    expect((discs as InstancedMesh).count).toBe(TURBINE_COUNT);
    expect(drawnTriangles(section.root)).toBeLessThan(TRIANGLE_BUDGET);
    expect(drawCalls(section.root)).toBeLessThan(DRAW_CALL_BUDGET);
    context.tracker.dispose();
  });
});
