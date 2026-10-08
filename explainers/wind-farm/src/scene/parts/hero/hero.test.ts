import { Mesh, Raycaster, Texture, Vector3 } from 'three';
import type { Object3D } from 'three';
import { describe, expect, it } from 'vitest';
import { MaterialLibrary } from '@core/scene/materials';
import { ResourceTracker } from '@core/scene/resources';
import type { AssemblyState } from '../../../ids';
import { TURBINE_COUNT, farmLayout } from '../../../model';
import { CAMERA_VIEWS } from '../../cameraViews';
import type { Motion, PartContext } from '../context';
import { buildHero } from './index';

const TRIANGLE_BUDGET = 60_000;
const TIP_RADIUS = 75;
const NACELLE_VIEW_TARGET = new Vector3(0, 105, 0);
const NACELLE_VIEW_DISTANCES = [30, 60];
const AZIMUTH_STEPS = 72;
const PITCH_RANGE_DEG = [0, 90];
const LABELS_BESIDE_BLADES = ['hub', 'pitchCylinders'] as const;

function heroState(yawDeg: number): AssemblyState {
  return {
    scene: 'turbine',
    phase: 0,
    playing: false,
    wind: { speed: 9, fromDeg: yawDeg, induction: 0.25 },
    rotor: { rpm: 8, pitchDeg: 0, yawDeg, state: 'partial', braked: false, powerShare: 0.5 },
    farm: {
      spacing: 7,
      sites: farmLayout(7),
      deficits: Array.from({ length: TURBINE_COUNT }, () => 0.2),
      plumeLengthD: 8,
      plumeStrength: 0.6,
      outputShare: 0.5,
    },
    view: { streamlines: false, wakes: true, cables: true, labels: true, cutaway: false },
  };
}

function motion(azimuth: number, pitchDeg: number): Motion {
  return { delta: 0, azimuth, pitchDeg, rpm: 8, cameraDistance: 300 };
}

function buildScene() {
  const texture = new Texture();
  const context: PartContext = {
    materials: new MaterialLibrary(),
    tracker: new ResourceTracker(),
    textures: { dot: texture, glow: texture, shadow: texture, dispose: () => undefined },
    labels: new Map(),
    anchors: {},
  };
  return { context, hero: buildHero(context) };
}

function worldOf(object: Object3D | undefined): Vector3 {
  object?.updateWorldMatrix(true, false);
  return new Vector3().setFromMatrixPosition(object?.matrixWorld ?? new Mesh().matrixWorld);
}

function bladeTip(root: Object3D, index: number): Vector3 {
  const pitch = root.getObjectByName(`bladePitch${index}`);
  pitch?.updateWorldMatrix(true, false);
  return new Vector3(0, TIP_RADIUS, 0).applyMatrix4(pitch?.matrixWorld ?? new Mesh().matrixWorld);
}

function bladeMeshes(context: PartContext, root: Object3D): Mesh[] {
  const meshes: Mesh[] = [];
  root.traverse((object) => {
    if (!(object instanceof Mesh) || Array.isArray(object.material)) return;
    if (context.materials.groupOf(object.material) === 'blades') meshes.push(object);
  });
  return meshes;
}

describe('buildHero', () => {
  it('places the hub upwind of the tower at both yaw extremes', () => {
    const { context, hero } = buildScene();
    hero.setState(heroState(270));
    expect(worldOf(context.anchors.hub).distanceTo(new Vector3(-7, 105, 0))).toBeCloseTo(0, 5);
    hero.setState(heroState(0));
    expect(worldOf(context.anchors.hub).distanceTo(new Vector3(0, 105, -7))).toBeCloseTo(0, 5);
  });

  it('turns the top tip toward +z as the azimuth grows', () => {
    const { hero } = buildScene();
    hero.setState(heroState(270));
    hero.animate?.(motion(Math.PI / 2, 0), heroState(270));
    const tip = bladeTip(hero.root, 0);
    expect(tip.z).toBeCloseTo(TIP_RADIUS, 3);
    expect(tip.y).toBeCloseTo(105, 3);
  });

  it('feathers the leading edge into the wind', () => {
    const { hero } = buildScene();
    hero.setState(heroState(270));
    hero.animate?.(motion(0, 90), heroState(270));
    const pitch = hero.root.getObjectByName('bladePitch0');
    pitch?.updateWorldMatrix(true, false);
    const leading = new Vector3(0, 30, 1).applyMatrix4(
      pitch?.matrixWorld ?? new Mesh().matrixWorld,
    );
    expect(leading.x).toBeLessThan(-7.5);
  });

  it('stays within the triangle budget', () => {
    const { hero } = buildScene();
    let triangles = 0;
    hero.root.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      const geometry = object.geometry;
      triangles += (geometry.index?.count ?? geometry.getAttribute('position').count) / 3;
    });
    expect(triangles).toBeLessThan(TRIANGLE_BUDGET);
  });

  it('keeps the hub and pitch cylinder labels clear of the turning blades in the nacelle view', () => {
    const { context, hero } = buildScene();
    const state = heroState(270);
    hero.setState(state);
    const blades = bladeMeshes(context, hero.root);
    const raycaster = new Raycaster();
    const crossings: string[] = [];
    for (const direction of Object.values(CAMERA_VIEWS.nacelleCutaway.direction)) {
      for (const distance of NACELLE_VIEW_DISTANCES) {
        const camera = new Vector3(...direction)
          .normalize()
          .multiplyScalar(distance)
          .add(NACELLE_VIEW_TARGET);
        for (let step = 0; step < AZIMUTH_STEPS * PITCH_RANGE_DEG.length; step += 1) {
          const pitchDeg = PITCH_RANGE_DEG[step % PITCH_RANGE_DEG.length];
          hero.animate?.(motion((step * 2 * Math.PI) / AZIMUTH_STEPS, pitchDeg), state);
          hero.root.updateMatrixWorld(true);
          for (const part of LABELS_BESIDE_BLADES) {
            const anchor = worldOf(context.labels.get(part));
            const sight = camera.clone().sub(anchor);
            raycaster.set(anchor, sight.clone().normalize());
            raycaster.far = sight.length();
            if (raycaster.intersectObjects(blades, false).length > 0) {
              crossings.push(`${part} ${distance} m step ${step}`);
            }
          }
        }
      }
    }
    expect(crossings).toEqual([]);
  });
});
