import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { InstancedMesh, Vector3 } from 'three';
import type { Box3, Object3D } from 'three';
import { MaterialLibrary } from '@core/scene/materials';
import { isShown } from '@core/scene/parts';
import { createSceneTextures } from '@core/scene/textures';
import { FARM_PART_IDS, PART_IDS, TURBINE_PART_IDS } from '../ids';
import type {
  AnchorId,
  AssemblyState,
  PartId,
  RegionId,
  SceneId,
  SpacingD,
  ViewOptions,
} from '../ids';
import { SUBSTATION, TURBINE_COUNT, farmLayout } from '../model';
import type { Assembly } from './assembly';
import { EASE_SECONDS } from './constants';
import { GROUND_ARROW } from './parts/air/constants';
import { createWindFarmAssembly } from './windFarmAssembly';

const ANCHOR_IDS: readonly AnchorId[] = [
  'hub',
  'yawPivot',
  'towerBase',
  'farmCentre',
  'heroSite',
  'substation',
];
const REGION_IDS: readonly RegionId[] = ['farm', 'wakes', 'grid', 'turbine', 'nacelle', 'rotor'];
const INTERIOR_PARTS: readonly PartId[] = [
  'bedplate',
  'pitchCylinders',
  'mainBearing',
  'mainShaft',
  'gearbox',
  'brakeDisc',
  'generator',
  'converter',
  'yawDrives',
];
const ALL_VIEWS: ViewOptions = {
  streamlines: true,
  wakes: true,
  cables: true,
  labels: true,
  cutaway: true,
};
const QUIET_VIEWS: ViewOptions = {
  streamlines: false,
  wakes: false,
  cables: false,
  labels: true,
  cutaway: false,
};
const DEFAULT_SPACING: SpacingD = 7;
const FRAME_SECONDS = 1 / 60;
const FARM_TURBINE_MESHES = 4;
const TURNING_RPM = 10;

function stateWith(
  scene: SceneId,
  view: ViewOptions,
  rpm = TURNING_RPM,
  spacing = DEFAULT_SPACING,
): AssemblyState {
  return {
    scene,
    phase: 0,
    playing: false,
    wind: { speed: 9, fromDeg: 270, induction: 0.25 },
    rotor: { rpm, pitchDeg: 0, yawDeg: 270, state: 'partial', braked: false, powerShare: 0.5 },
    farm: {
      spacing,
      sites: farmLayout(spacing),
      deficits: Array.from({ length: TURBINE_COUNT }, () => 0),
      plumeLengthD: 8,
      plumeStrength: 0.3,
      outputShare: 0.5,
    },
    view,
  };
}

function isFilled(box: Box3): boolean {
  return !box.isEmpty() && box.max.x > box.min.x && box.max.y > box.min.y && box.max.z > box.min.z;
}

function worldPoint(object: Object3D): number[] {
  object.updateWorldMatrix(true, false);
  return object
    .getWorldPosition(new Vector3())
    .toArray()
    .map((value) => Math.round(value * 10) / 10);
}

function shownParts(parts: readonly PartId[]): boolean[] {
  return parts.map((id) => isShown(assembly.labelAnchors().get(id)!));
}

let textures: ReturnType<typeof createSceneTextures>;
let assembly: Assembly;

beforeAll(() => {
  textures = createSceneTextures();
  assembly = createWindFarmAssembly(
    { materials: new MaterialLibrary(), textures },
    stateWith('turbine', ALL_VIEWS),
  );
});

afterAll(() => {
  assembly.dispose();
  textures.dispose();
});

describe('wind farm assembly', () => {
  it('has a label anchor for every part', () => {
    const anchors = assembly.labelAnchors();
    expect(PART_IDS.filter((id) => !anchors.has(id))).toEqual([]);
  });

  it('resolves every anchor and region', () => {
    ANCHOR_IDS.forEach((id) => expect(assembly.anchor(id)).toBeDefined());
    REGION_IDS.forEach((id) => expect(isFilled(assembly.region(id)), id).toBe(true));
  });

  it('shows only the labels of the visible scene', () => {
    assembly.setState(stateWith('farm', ALL_VIEWS));
    expect(shownParts(TURBINE_PART_IDS).every((shown) => !shown)).toBe(true);
    expect(shownParts(FARM_PART_IDS).every(Boolean)).toBe(true);
    assembly.setState(stateWith('turbine', ALL_VIEWS));
    expect(shownParts(TURBINE_PART_IDS).every(Boolean)).toBe(true);
    expect(shownParts(FARM_PART_IDS).every((shown) => !shown)).toBe(true);
  });

  it('hides the interior labels while the nacelle is closed', () => {
    assembly.setState(stateWith('turbine', { ...ALL_VIEWS, cutaway: false }));
    expect(shownParts(INTERIOR_PARTS).every((shown) => !shown)).toBe(true);
    expect(isShown(assembly.labelAnchors().get('nacelle')!)).toBe(true);
  });

  it('draws one instance per farm turbine', () => {
    const meshes: InstancedMesh[] = [];
    assembly.root.traverse((object) => {
      if (object instanceof InstancedMesh && object.name.startsWith('farmTurbines'))
        meshes.push(object);
    });
    expect(meshes.length).toBe(FARM_TURBINE_MESHES);
    meshes.forEach((mesh) => expect(mesh.count).toBe(TURBINE_COUNT));
  });

  it('keeps animating only while something moves', () => {
    assembly.setState(stateWith('turbine', QUIET_VIEWS));
    expect(assembly.update(FRAME_SECONDS, 0)).toBe(true);
    assembly.setState(stateWith('turbine', QUIET_VIEWS, 0));
    expect(assembly.update(FRAME_SECONDS, 0)).toBe(true);
    assembly.update(EASE_SECONDS, 0);
    expect(assembly.update(FRAME_SECONDS, 0)).toBe(false);
  });

  it('eases a pitch jump over the ease time', () => {
    const still = stateWith('turbine', QUIET_VIEWS, 0);
    assembly.setState(still);
    assembly.update(EASE_SECONDS, 0);
    assembly.setState({ ...still, rotor: { ...still.rotor, pitchDeg: 90 } });
    expect(assembly.update(EASE_SECONDS / 2, 0)).toBe(true);
    expect(assembly.update(EASE_SECONDS / 2, 0)).toBe(false);
  });

  it('keeps the farm moving while the cables carry power', () => {
    const farm = stateWith('farm', QUIET_VIEWS, 0);
    assembly.setState({ ...farm, view: { ...QUIET_VIEWS, cables: true } });
    assembly.update(EASE_SECONDS, 0);
    expect(assembly.update(FRAME_SECONDS, 0)).toBe(true);
    assembly.setState({ ...farm, farm: { ...farm.farm, outputShare: 0 } });
    expect(assembly.update(FRAME_SECONDS, 0)).toBe(false);
  });

  it('turns the hub toward the bearing the wind comes from', () => {
    const west = stateWith('turbine', ALL_VIEWS);
    assembly.setState(west);
    expect(worldPoint(assembly.anchor('hub'))).toEqual([-7, 105, 0]);
    assembly.setState({ ...west, rotor: { ...west.rotor, yawDeg: 0 } });
    expect(worldPoint(assembly.anchor('hub'))).toEqual([0, 105, -7]);
  });

  it('moves the farm region with the spacing', () => {
    assembly.setState(stateWith('farm', ALL_VIEWS, TURNING_RPM, 5));
    const tight = assembly.region('farm').clone();
    assembly.setState(stateWith('farm', ALL_VIEWS, TURNING_RPM, 9));
    expect(assembly.region('farm').equals(tight)).toBe(false);
    expect(assembly.region('farm').min.x).toBeLessThan(tight.min.x);
  });

  it('anchors the substation label on the yard edge', () => {
    assembly.setState(stateWith('farm', ALL_VIEWS));
    const [x, , z] = worldPoint(assembly.labelAnchors().get('substation')!);
    expect(x).toBeCloseTo(SUBSTATION.x, 0);
    expect(z).toBeCloseTo(SUBSTATION.z - SUBSTATION.depth / 2, 0);
  });

  it('anchors the prevailing wind label at the arrow tail', () => {
    assembly.setState(stateWith('farm', ALL_VIEWS));
    const anchor = assembly.labelAnchors().get('prevailingWind')!;
    const [x, , z] = worldPoint(anchor);
    const [centreX, , centreZ] = worldPoint(anchor.parent!);
    expect(Math.hypot(x - centreX, z - centreZ)).toBeCloseTo(GROUND_ARROW.length / 2, 0);
  });
});
