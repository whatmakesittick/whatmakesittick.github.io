import { Matrix4, PlaneGeometry, Quaternion, Vector3 } from 'three';
import type { BufferGeometry, Group, InstancedMesh, Object3D } from 'three';
import { anchorAt } from '@core/scene/parts';
import type { AnchorId, AssemblyState, FarmSite, Point, SpacingD } from '../../ids';
import {
  BLADE_LENGTH_M,
  COLUMN_COUNT,
  FARM_TERRAIN,
  GRID_LINE_END,
  HERO_SITE,
  HUB_HEIGHT_M,
  MAX_CHORD_M,
  PYLON_SPACING_M,
  ROTOR_DIAMETER_M,
  SUBSTATION,
  TIP_HEIGHT_M,
  TURBINE_COUNT,
  TURBINE_GEOMETRY,
  farmLayout,
  terrainHeight,
} from '../../model';
import {
  PLUME_REFERENCE_M,
  bearingTurn,
  boxAt,
  boxBetween,
  groundPath,
  instancedPart,
  label,
  merged,
  namedGroup,
  partMesh,
  plumeGeometry,
  ribbon,
} from './build';
import type { Labels, PlaceholderContext, PlaceholderScene } from './build';
import { FarmOverlays } from './overlays';
import { SUBSTATION_HEIGHT_M } from './regions';

const [HUB_X, HUB_Y] = TURBINE_GEOMETRY.hub;
const NACELLE = TURBINE_GEOMETRY.nacelle;
const TERRAIN_SEGMENTS = 100;
const STAND_IN_TOWER_M = 3.5;
const STAND_IN_BLADE_M = 2;
const BLADE_COUNT = 3;
const GRID_LINE_HEIGHT_M = 30;
const GRID_LINE_WIDTH_M = 1.5;
const PYLON_WIDTH_M = 4;
const FARM_LAND_LABEL: readonly [x: number, z: number] = [
  FARM_TERRAIN.minX + 1000,
  FARM_TERRAIN.maxZ - 1000,
];
const PLUME_LABEL_REACH_M = 3 * ROTOR_DIAMETER_M;
const LABELLED_TURBINE = COLUMN_COUNT + HERO_SITE;
const UNIT_SCALE = new Vector3(1, 1, 1);
const X_AXIS = new Vector3(1, 0, 0);
const Y_AXIS = new Vector3(0, 1, 0);

interface Fleet {
  towers: InstancedMesh;
  rotors: InstancedMesh;
  plumes: InstancedMesh;
  plumeGroup: Group;
}

const placement = new Matrix4();
const local = new Matrix4();
const turn = new Quaternion();

function terrainGeometry(): BufferGeometry {
  const { minX, maxX, minZ, maxZ } = FARM_TERRAIN;
  const geometry = new PlaneGeometry(maxX - minX, maxZ - minZ, TERRAIN_SEGMENTS, TERRAIN_SEGMENTS)
    .rotateX(-Math.PI / 2)
    .translate((minX + maxX) / 2, 0, (minZ + maxZ) / 2);
  const position = geometry.getAttribute('position');
  for (let index = 0; index < position.count; index += 1) {
    position.setY(index, terrainHeight(position.getX(index), position.getZ(index)));
  }
  geometry.computeVertexNormals();
  return geometry;
}

function towerGeometry(): BufferGeometry {
  const { towerTopY } = TURBINE_GEOMETRY;
  return merged([
    boxAt([STAND_IN_TOWER_M, towerTopY, STAND_IN_TOWER_M], [0, towerTopY / 2, 0]),
    boxBetween(
      [NACELLE.minX, NACELLE.minY, -NACELLE.halfWidth],
      [NACELLE.maxX, NACELLE.maxY, NACELLE.halfWidth],
    ),
  ]);
}

function rotorGeometry(): BufferGeometry {
  const root = TURBINE_GEOMETRY.bladeRootRadius;
  const blades = Array.from({ length: BLADE_COUNT }, (_, index) =>
    boxAt(
      [STAND_IN_BLADE_M, BLADE_LENGTH_M, MAX_CHORD_M],
      [0, root + BLADE_LENGTH_M / 2, 0],
    ).rotateX((index * 2 * Math.PI) / BLADE_COUNT),
  );
  return merged(blades);
}

function gridLineGeometry(): BufferGeometry {
  const route: [number, number][] = [
    [SUBSTATION.x, SUBSTATION.z],
    [GRID_LINE_END.x, GRID_LINE_END.z],
  ];
  const line = ribbon(groundPath(route, GRID_LINE_HEIGHT_M), GRID_LINE_WIDTH_M);
  const pylonCount = Math.floor((GRID_LINE_END.x - SUBSTATION.x) / PYLON_SPACING_M);
  const half = PYLON_WIDTH_M / 2;
  const pylons = Array.from({ length: pylonCount }, (_, index) => {
    const x = SUBSTATION.x + (index + 1) * PYLON_SPACING_M;
    const ground = terrainHeight(x, GRID_LINE_END.z);
    return boxBetween(
      [x - half, ground, GRID_LINE_END.z - half],
      [x + half, ground + GRID_LINE_HEIGHT_M, GRID_LINE_END.z + half],
    );
  });
  return merged([line, ...pylons]);
}

function substationPoint(lift: number): Point {
  return [SUBSTATION.x, terrainHeight(SUBSTATION.x, SUBSTATION.z) + lift, SUBSTATION.z];
}

function buildStatic(context: PlaceholderContext, root: Group, labels: Labels): Group {
  const [landX, landZ] = FARM_LAND_LABEL;
  partMesh(context, 'farmLand', terrainGeometry(), root);
  const [x, ground, z] = substationPoint(0);
  const footprint = boxAt(
    [SUBSTATION.width, SUBSTATION_HEIGHT_M, SUBSTATION.depth],
    [x, ground + SUBSTATION_HEIGHT_M / 2, z],
  );
  partMesh(context, 'substation', footprint, root);
  const gridLine = namedGroup('gridLine', root);
  partMesh(context, 'gridLine', gridLineGeometry(), gridLine);
  label(labels, 'farmLand', root, [landX, terrainHeight(landX, landZ), landZ]);
  label(labels, 'substation', root, substationPoint(SUBSTATION_HEIGHT_M));
  const middleX = (SUBSTATION.x + GRID_LINE_END.x) / 2;
  label(labels, 'gridLine', gridLine, [
    middleX,
    terrainHeight(middleX, GRID_LINE_END.z) + GRID_LINE_HEIGHT_M,
    GRID_LINE_END.z,
  ]);
  return gridLine;
}

function buildFleet(context: PlaceholderContext, root: Group): Fleet {
  const towers = instancedPart(context, 'farmTurbines', towerGeometry(), TURBINE_COUNT, root);
  const rotors = instancedPart(context, 'farmTurbines', rotorGeometry(), TURBINE_COUNT, root);
  const plumeGroup = namedGroup('wakePlumes', root);
  const plumes = instancedPart(context, 'wakePlumes', plumeGeometry(), TURBINE_COUNT, plumeGroup);
  return { towers, rotors, plumes, plumeGroup };
}

function sitePlacement(site: FarmSite, yaw: number): Matrix4 {
  turn.setFromAxisAngle(Y_AXIS, yaw);
  return placement.compose(
    new Vector3(site.x, terrainHeight(site.x, site.z), site.z),
    turn,
    UNIT_SCALE,
  );
}

function writeTowers(
  fleet: Fleet,
  sites: readonly FarmSite[],
  yaw: number,
  plumeScale: number,
): void {
  sites.forEach((site, index) => {
    const base = sitePlacement(site, yaw);
    fleet.towers.setMatrixAt(index, base);
    local.compose(new Vector3(HUB_X, HUB_Y, 0), turn.identity(), new Vector3(plumeScale, 1, 1));
    fleet.plumes.setMatrixAt(index, base.multiply(local));
  });
  fleet.towers.instanceMatrix.needsUpdate = true;
  fleet.plumes.instanceMatrix.needsUpdate = true;
}

function writeRotors(fleet: Fleet, sites: readonly FarmSite[], yaw: number, azimuth: number): void {
  sites.forEach((site, index) => {
    const base = sitePlacement(site, yaw);
    turn.setFromAxisAngle(X_AXIS, azimuth);
    local.compose(new Vector3(HUB_X, HUB_Y, 0), turn, UNIT_SCALE);
    fleet.rotors.setMatrixAt(index, base.multiply(local));
  });
  fleet.rotors.instanceMatrix.needsUpdate = true;
}

function placeLayoutAnchors(
  labels: Labels,
  anchors: Record<'farmCentre' | 'heroSite', Object3D>,
  spacing: SpacingD,
) {
  const sites = farmLayout(spacing);
  const hero = sites[HERO_SITE];
  const heroGround = terrainHeight(hero.x, hero.z);
  const centreX = sites.reduce((sum, site) => sum + site.x, 0) / sites.length;
  const centreZ = sites.reduce((sum, site) => sum + site.z, 0) / sites.length;
  const labelled = sites[LABELLED_TURBINE];
  anchors.heroSite.position.set(hero.x, heroGround + HUB_HEIGHT_M, hero.z);
  anchors.farmCentre.position.set(centreX, terrainHeight(centreX, centreZ), centreZ);
  labels
    .get('farmTurbines')
    ?.position.set(labelled.x, terrainHeight(labelled.x, labelled.z) + TIP_HEIGHT_M, labelled.z);
  labels
    .get('wakePlumes')
    ?.position.set(hero.x + PLUME_LABEL_REACH_M, heroGround + HUB_HEIGHT_M, hero.z);
}

export function buildFarmScene(context: PlaceholderContext): PlaceholderScene {
  const root = namedGroup('farmScene');
  const labels: Labels = new Map();
  const gridLine = buildStatic(context, root, labels);
  const fleet = buildFleet(context, root);
  const overlays = new FarmOverlays(context, root, labels);
  label(labels, 'farmTurbines', root, [0, 0, 0]);
  label(labels, 'wakePlumes', fleet.plumeGroup, [0, 0, 0]);
  const layoutAnchors = { farmCentre: anchorAt(root, 0, 0, 0), heroSite: anchorAt(root, 0, 0, 0) };
  const anchors: Partial<Record<AnchorId, Object3D>> = {
    ...layoutAnchors,
    substation: anchorAt(root, ...substationPoint(SUBSTATION_HEIGHT_M)),
  };
  let current: AssemblyState | undefined;
  let azimuth = 0;
  return {
    root,
    labels,
    anchors,
    setState: (state) => {
      const { view, farm, rotor } = state;
      if (farm.spacing !== current?.farm.spacing)
        placeLayoutAnchors(labels, layoutAnchors, farm.spacing);
      current = state;
      overlays.layOut(farm.spacing);
      overlays.group('collectorCables').visible = view.cables;
      overlays.group('windArrows').visible = view.streamlines;
      overlays.group('shearProfile').visible = view.streamlines;
      gridLine.visible = view.cables;
      fleet.plumeGroup.visible = view.wakes && farm.plumeLengthD > 0;
      const plumeScale =
        (Math.max(farm.plumeLengthD, Number.EPSILON) * ROTOR_DIAMETER_M) / PLUME_REFERENCE_M;
      writeTowers(fleet, farm.sites, bearingTurn(rotor.yawDeg), plumeScale);
      writeRotors(fleet, farm.sites, bearingTurn(rotor.yawDeg), azimuth);
    },
    setAzimuth: (next) => {
      azimuth = next;
      if (!current || !root.visible) return;
      writeRotors(fleet, current.farm.sites, bearingTurn(current.rotor.yawDeg), azimuth);
    },
  };
}
