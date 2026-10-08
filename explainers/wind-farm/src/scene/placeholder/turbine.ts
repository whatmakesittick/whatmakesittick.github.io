import { CircleGeometry, RingGeometry, SphereGeometry } from 'three';
import type { Group, Mesh, Object3D } from 'three';
import { anchorAt } from '@core/scene/parts';
import type { AnchorId, AssemblyState, Point } from '../../ids';
import {
  BLADE_LENGTH_M,
  MAX_CHORD_M,
  ROTOR_DIAMETER_M,
  ROTOR_RADIUS_M,
  TURBINE_GEOMETRY,
  TURBINE_LAND,
} from '../../model';
import {
  PLUME_REFERENCE_M,
  bearingTurn,
  boxAt,
  boxBetween,
  degrees,
  groundPath,
  label,
  merged,
  namedGroup,
  partMesh,
  plumeGeometry,
  ribbon,
  upright,
} from './build';
import type { Labels, PlaceholderContext, PlaceholderScene } from './build';
import { buildInterior } from './interior';

const GEOMETRY = TURBINE_GEOMETRY;
const [HUB_X, HUB_Y] = GEOMETRY.hub;
const NACELLE = GEOMETRY.nacelle;
const LAND_SEGMENTS = 64;
const FOUNDATION_HEIGHT_M = 1;
const PANEL_M = 0.1;
const COOLER_HALF_WIDTH_M = 1.8;
const BLADE_COUNT = 3;
const BLADE_THICKNESS_M = 0.8;
const RING_WIDTH_M = 1;
const RING_SEGMENTS = 96;
const SPINNER_SEGMENTS = 24;
const CABLE_LIFT_M = 0.3;
const CABLE_WIDTH_M = 0.8;
const STREAMLINE_START_X = -450;
const STREAMLINE_END_X = 900;
const STREAMLINE_WIDTH_M = 0.8;
const STREAMLINE_ROWS = 4;
const STREAMLINE_COLUMNS = 6;
const STREAMLINE_SPREAD = 0.8;
const LAND_LABEL: Point = [-200, 0, 200];
const TOWER_LABEL_Y = 50;
const CABLE_LABEL_X = 60;
const STREAMLINE_LABEL: Point = [-300, HUB_Y + ROTOR_RADIUS_M, 0];

interface TurbineParts {
  yaw: Group;
  rotor: Group;
  blades: readonly Object3D[];
  openShell: Mesh;
  interior: ReturnType<typeof buildInterior>;
  streamlines: Group;
  wake: Group;
  wakeMesh: Mesh;
  towerCable: Group;
}

function buildGround(context: PlaceholderContext, root: Group, labels: Labels): Group {
  const { towerTopY, towerBaseDiameter, towerTopDiameter, foundationRadius, transformer } =
    GEOMETRY;
  partMesh(
    context,
    'land',
    new CircleGeometry(TURBINE_LAND.radius, LAND_SEGMENTS).rotateX(-Math.PI / 2),
    root,
  );
  partMesh(
    context,
    'foundation',
    upright(foundationRadius, foundationRadius, FOUNDATION_HEIGHT_M),
    root,
  );
  partMesh(context, 'tower', upright(towerBaseDiameter / 2, towerTopDiameter / 2, towerTopY), root);
  const transformerCentre: Point = [
    transformer.centre[0],
    transformer.size[1] / 2,
    transformer.centre[2],
  ];
  partMesh(context, 'transformer', boxAt(transformer.size, transformerCentre), root);
  const towerCable = namedGroup('towerCable', root);
  const cableZ = transformer.centre[2];
  const cablePath = groundPath(
    [
      [transformer.centre[0], cableZ],
      [TURBINE_LAND.radius, cableZ],
    ],
    CABLE_LIFT_M,
  );
  partMesh(context, 'towerCable', ribbon(cablePath, CABLE_WIDTH_M, CABLE_LIFT_M), towerCable);
  label(labels, 'land', root, LAND_LABEL);
  label(labels, 'foundation', root, [0, FOUNDATION_HEIGHT_M, foundationRadius]);
  label(labels, 'tower', root, [0, TOWER_LABEL_Y, towerBaseDiameter / 2]);
  label(labels, 'transformer', root, [
    transformer.centre[0],
    transformer.size[1],
    transformer.centre[2],
  ]);
  label(labels, 'towerCable', towerCable, [CABLE_LABEL_X, CABLE_LIFT_M, cableZ]);
  return towerCable;
}

function shellPanels(open: boolean): readonly [Point, Point][] {
  const { minX, maxX, minY, maxY, halfWidth } = NACELLE;
  if (open) {
    return [
      [
        [minX, maxY - PANEL_M, 0],
        [maxX, maxY, halfWidth],
      ],
      [
        [minX, minY, halfWidth - PANEL_M],
        [maxX, maxY, halfWidth],
      ],
    ];
  }
  return [
    [
      [minX, minY, -halfWidth],
      [maxX, minY + PANEL_M, halfWidth],
    ],
    [
      [minX, maxY - PANEL_M, -halfWidth],
      [maxX, maxY, 0],
    ],
    [
      [minX, minY, -halfWidth],
      [maxX, maxY, -halfWidth + PANEL_M],
    ],
    [
      [minX, minY, -halfWidth],
      [minX + PANEL_M, maxY, halfWidth],
    ],
    [
      [maxX - PANEL_M, minY, -halfWidth],
      [maxX, maxY, halfWidth],
    ],
  ];
}

function shellMesh(context: PlaceholderContext, frame: Group, open: boolean): Mesh {
  const panels = shellPanels(open).map(([min, max]) => boxBetween(min, max));
  return partMesh(context, 'nacelle', merged(panels), frame);
}

function buildNacelle(context: PlaceholderContext, frame: Group, labels: Labels): Mesh {
  const { cooler } = GEOMETRY;
  shellMesh(context, frame, false);
  const openShell = shellMesh(context, frame, true);
  const coolerBox = boxBetween(
    [cooler.minX, NACELLE.maxY, -COOLER_HALF_WIDTH_M],
    [cooler.maxX, cooler.topY, COOLER_HALF_WIDTH_M],
  );
  partMesh(context, 'cooler', coolerBox, frame);
  label(labels, 'nacelle', frame, [
    (NACELLE.minX + NACELLE.maxX) / 2,
    NACELLE.maxY,
    NACELLE.halfWidth,
  ]);
  label(labels, 'cooler', frame, [(cooler.minX + cooler.maxX) / 2, cooler.topY, 0]);
  return openShell;
}

function buildBlades(context: PlaceholderContext, rotor: Group): readonly Object3D[] {
  const root = GEOMETRY.bladeRootRadius;
  const geometry = boxAt(
    [BLADE_THICKNESS_M, BLADE_LENGTH_M, MAX_CHORD_M],
    [0, root + BLADE_LENGTH_M / 2, 0],
  );
  return Array.from({ length: BLADE_COUNT }, (_, index) => {
    const arm = namedGroup(`bladeArm${index}`, rotor);
    arm.rotation.x = (index * 2 * Math.PI) / BLADE_COUNT;
    return partMesh(context, 'blades', geometry, arm);
  });
}

function buildRotor(context: PlaceholderContext, frame: Group, labels: Labels) {
  const rotor = namedGroup('rotor', frame);
  rotor.position.set(HUB_X, HUB_Y, 0);
  const spinner = new SphereGeometry(GEOMETRY.spinnerRadius, SPINNER_SEGMENTS, SPINNER_SEGMENTS);
  partMesh(context, 'hub', spinner, rotor);
  const blades = buildBlades(context, rotor);
  const ring = new RingGeometry(ROTOR_RADIUS_M - RING_WIDTH_M, ROTOR_RADIUS_M, RING_SEGMENTS)
    .rotateY(Math.PI / 2)
    .translate(HUB_X, HUB_Y, 0);
  partMesh(context, 'sweptArea', ring, frame);
  label(labels, 'hub', frame, [HUB_X - GEOMETRY.spinnerRadius, HUB_Y, 0]);
  label(labels, 'blades', frame, [HUB_X, HUB_Y + ROTOR_RADIUS_M / 2, 0]);
  label(labels, 'sweptArea', frame, [HUB_X, HUB_Y + ROTOR_RADIUS_M, 0]);
  return { rotor, blades };
}

function streamlineGeometry() {
  const reach = ROTOR_RADIUS_M * STREAMLINE_SPREAD;
  const offsets = (count: number) =>
    Array.from({ length: count }, (_, index) => -reach + (2 * reach * index) / (count - 1));
  const lines = offsets(STREAMLINE_ROWS).flatMap((dy) =>
    offsets(STREAMLINE_COLUMNS).map((dz) =>
      boxBetween(
        [STREAMLINE_START_X, HUB_Y + dy, dz],
        [STREAMLINE_END_X, HUB_Y + dy + STREAMLINE_WIDTH_M, dz + STREAMLINE_WIDTH_M],
      ),
    ),
  );
  return merged(lines);
}

function buildStreamlines(context: PlaceholderContext, root: Group, labels: Labels): Group {
  const streamlines = namedGroup('streamlines', root);
  partMesh(context, 'streamlinesGroup', streamlineGeometry(), streamlines);
  label(labels, 'streamlinesGroup', streamlines, STREAMLINE_LABEL);
  return streamlines;
}

function buildHeroWake(context: PlaceholderContext, frame: Group, labels: Labels) {
  const wake = namedGroup('heroWake', frame);
  const wakeMesh = partMesh(context, 'heroWake', plumeGeometry(), wake);
  wakeMesh.position.set(HUB_X, HUB_Y, 0);
  label(labels, 'heroWake', wake, [HUB_X + ROTOR_DIAMETER_M, HUB_Y + ROTOR_RADIUS_M, 0]);
  return { wake, wakeMesh };
}

function buildYaw(root: Group): { yaw: Group; frame: Group } {
  const yaw = namedGroup('yawPivot', root);
  yaw.position.set(0, GEOMETRY.towerTopY, 0);
  const frame = namedGroup('nacelleFrame', yaw);
  frame.position.set(0, -GEOMETRY.towerTopY, 0);
  return { yaw, frame };
}

function applyState(parts: TurbineParts, state: AssemblyState): void {
  const { rotor, view, wind, farm } = state;
  parts.yaw.rotation.y = bearingTurn(rotor.yawDeg);
  parts.blades.forEach((blade) => (blade.rotation.y = degrees(rotor.pitchDeg)));
  parts.interior.group.visible = view.cutaway;
  parts.openShell.visible = !view.cutaway;
  parts.streamlines.visible = view.streamlines;
  parts.streamlines.rotation.y = bearingTurn(wind.fromDeg);
  parts.towerCable.visible = view.cables;
  parts.wake.visible = view.wakes && farm.plumeLengthD > 0;
  if (parts.wake.visible)
    parts.wakeMesh.scale.x = (farm.plumeLengthD * ROTOR_DIAMETER_M) / PLUME_REFERENCE_M;
}

export function buildTurbineScene(context: PlaceholderContext): PlaceholderScene {
  const root = namedGroup('turbineScene');
  const labels: Labels = new Map();
  const towerCable = buildGround(context, root, labels);
  const { yaw, frame } = buildYaw(root);
  const openShell = buildNacelle(context, frame, labels);
  const { rotor, blades } = buildRotor(context, frame, labels);
  const interior = buildInterior(context, frame, labels);
  const streamlines = buildStreamlines(context, root, labels);
  const { wake, wakeMesh } = buildHeroWake(context, frame, labels);
  const parts: TurbineParts = {
    yaw,
    rotor,
    blades,
    openShell,
    interior,
    streamlines,
    wake,
    wakeMesh,
    towerCable,
  };
  const anchors: Partial<Record<AnchorId, Object3D>> = {
    hub: anchorAt(frame, HUB_X, HUB_Y, 0),
    yawPivot: yaw,
    towerBase: anchorAt(root, 0, 0, 0),
  };
  return {
    root,
    labels,
    anchors,
    setState: (state) => applyState(parts, state),
    setAzimuth: (azimuth) => {
      rotor.rotation.x = azimuth;
      interior.spinner.rotation.x = azimuth;
    },
  };
}
