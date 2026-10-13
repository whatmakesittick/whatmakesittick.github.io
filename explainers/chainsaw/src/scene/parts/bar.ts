import { CircleGeometry, Color, Matrix4, Quaternion, RingGeometry, Shape, Vector3 } from 'three';
import type { InstancedMesh } from 'three';
import type { BufferGeometry, Object3D } from 'three';
import { createPointMaterial, PointCloud } from '@core/scene/pointCloud';
import type { AssemblyState } from '../../ids';
import {
  BAR_PLANE_Z,
  BAR_THICKNESS,
  CHAIN_ELEMENTS,
  CHAIN_PATH,
  CRANK_Y,
  DRIVE_LINK_MM,
  SAW_GEOMETRY,
  pointOnLoop,
  railY,
} from '../../model';
import type { ChainElement, RailSide } from '../../model';
import { THEME } from '../../theme';
import { BAR, CHAIN_LINKS, MM, OIL, ZONE } from '../constants';
import {
  cutterGeometry,
  depthGaugeGeometry,
  driveLinkGeometry,
  rivetGeometry,
  tieStrapGeometry,
} from '../geometry/chainLinks';
import { extrudeAlongZ, starShape } from '../geometry/profile';
import { sectorAroundZ } from '../geometry/sector';
import { conveyorPoint, windowStartAt } from './chainLabels';
import type { ConveyorPart } from './chainLabels';
import { addPart, instancedPart, label, namedGroup, partMesh, registeredMaterial } from './context';
import type { PartContext, Section } from './context';

const HALF_PITCH_MM = DRIVE_LINK_MM / 2;
const RIVET_OFFSET_MM = DRIVE_LINK_MM / 4;
const ZONE_SEGMENTS = 24;
const OIL_SIZE = 0.008;

type SideKind = 'cutterLeft' | 'cutterRight' | 'tie';

function plateEdge(x: number, side: RailSide): number {
  const sign = side === 'upper' ? 1 : -1;
  if (x <= CHAIN_PATH.heelX) return CRANK_Y + sign * (CHAIN_PATH.heelHalfHeight - BAR.rail);
  return railY(x, side) - sign * BAR.rail;
}

function edgePoints(fromX: number, toX: number, side: RailSide): [number, number][] {
  const xs = [
    fromX,
    ...(fromX < CHAIN_PATH.heelX && toX > CHAIN_PATH.heelX ? [CHAIN_PATH.heelX] : []),
    toX,
  ];
  return xs.map((x) => [x, plateEdge(x, side)]);
}

function plateShape(fromX: number, toX: number, withNose: boolean): Shape {
  const end = withNose ? CHAIN_PATH.noseMeetX : toX;
  const shape = new Shape();
  edgePoints(fromX, end, 'lower').forEach(([x, y], index) =>
    index === 0 ? shape.moveTo(x, y) : shape.lineTo(x, y),
  );
  if (withNose) {
    const radius = CHAIN_PATH.noseRadius - BAR.rail;
    const meet = CHAIN_PATH.noseMeet;
    shape.absarc(CHAIN_PATH.noseX, CRANK_Y, radius, -meet, meet, false);
  }
  edgePoints(fromX, end, 'upper')
    .reverse()
    .forEach(([x, y]) => shape.lineTo(x, y));
  shape.closePath();
  return shape;
}

interface ConveyorLabel {
  part: ConveyorPart;
  centreX: number;
  along: number;
  lift: number;
  z: number;
}

const CONVEYOR_LABELS: readonly ConveyorLabel[] = [
  { part: 'driveLinks', centreX: 0.15, along: 0, lift: -0.001, z: CHAIN_LINKS.driveThickness / 2 },
  { part: 'cutters', centreX: 0.27, along: -0.0027, lift: 0.0066, z: CHAIN_LINKS.sideOffset },
  { part: 'depthGauges', centreX: 0.36, along: 0.0055, lift: 0.0058, z: CHAIN_LINKS.sideOffset },
];

function conveyorLabels(context: PartContext, parent: Object3D): (chainMm: number) => void {
  const riders = CONVEYOR_LABELS.map((spec) => {
    label(context, spec.part, parent, [spec.centreX, CRANK_Y, BAR_PLANE_Z]);
    const anchor = context.labels.get(spec.part);
    if (!anchor) throw new Error(`No anchor for ${spec.part}`);
    return { spec, anchor, start: windowStartAt(spec.part, spec.centreX) };
  });
  return (chainMm) =>
    riders.forEach(({ spec, anchor, start }) => {
      const point = conveyorPoint(spec.part, chainMm, start);
      const normal = point.angle + Math.PI / 2;
      anchor.position.set(
        point.x + Math.cos(point.angle) * spec.along + Math.cos(normal) * spec.lift,
        point.y + Math.sin(point.angle) * spec.along + Math.sin(normal) * spec.lift,
        BAR_PLANE_Z + spec.z,
      );
    });
}

function barSpan() {
  return { from: BAR_PLANE_Z - BAR_THICKNESS / 2, to: BAR_PLANE_Z + BAR_THICKNESS / 2 };
}

function noseDetails(): BufferGeometry {
  const sprocket = extrudeAlongZ(
    starShape(BAR.noseTeeth, BAR.noseSprocket, BAR.noseSprocket - BAR.noseToothDepth, 0),
    {
      from: BAR_PLANE_Z - BAR_THICKNESS / 2 - 0.0004,
      to: BAR_PLANE_Z + BAR_THICKNESS / 2 + 0.0004,
    },
  );
  return sprocket;
}

function noseHub(): BufferGeometry {
  const reach = BAR_THICKNESS / 2 + 0.0005;
  return sectorAroundZ({
    inner: 0,
    outer: 0.0035,
    bottom: BAR_PLANE_Z - reach,
    top: BAR_PLANE_Z + reach,
    fromDeg: 0,
    toDeg: 360,
  });
}

function sideKind(element: ChainElement, side: 'left' | 'right'): SideKind {
  if (side === 'left' && element.kind === 'cutterLeft') return 'cutterLeft';
  if (side === 'right' && element.kind === 'cutterRight') return 'cutterRight';
  return 'tie';
}

function sideOffsets(kind: SideKind): number[] {
  const sides =
    kind === 'tie'
      ? (['left', 'right'] as const)
      : ([kind === 'cutterLeft' ? 'left' : 'right'] as const);
  return sides.flatMap((side) =>
    CHAIN_ELEMENTS.filter((element) => sideKind(element, side) === kind).map(
      (element) => element.offsetMm + HALF_PITCH_MM,
    ),
  );
}

function tieZ(): number[] {
  const left = CHAIN_ELEMENTS.filter((element) => sideKind(element, 'left') === 'tie').map(
    () => -CHAIN_LINKS.sideOffset,
  );
  const right = CHAIN_ELEMENTS.filter((element) => sideKind(element, 'right') === 'tie').map(
    () => CHAIN_LINKS.sideOffset,
  );
  return [...left, ...right];
}

class ChainInstances {
  private readonly sets: { mesh: InstancedMesh; offsets: number[]; z: number[] }[] = [];
  private readonly matrix = new Matrix4();
  private readonly quaternion = new Quaternion();
  private readonly position = new Vector3();
  private readonly scale = new Vector3(1, 1, 1);
  private readonly axis = new Vector3(0, 0, 1);
  private chainMm = Number.NaN;

  add(mesh: InstancedMesh, offsets: number[], z: number[] | number): void {
    const depths = Array.isArray(z) ? z : offsets.map(() => z);
    this.sets.push({ mesh, offsets, z: depths });
  }

  place(chainMm: number): void {
    if (chainMm === this.chainMm) return;
    this.chainMm = chainMm;
    this.sets.forEach(({ mesh, offsets, z }) => {
      offsets.forEach((offset, index) => {
        const point = pointOnLoop(offset + chainMm);
        this.position.set(point.x, point.y, BAR_PLANE_Z + z[index]);
        this.quaternion.setFromAxisAngle(this.axis, point.angle);
        mesh.setMatrixAt(index, this.matrix.compose(this.position, this.quaternion, this.scale));
      });
      mesh.instanceMatrix.needsUpdate = true;
    });
  }
}

function buildChain(context: PartContext, parent: Object3D): ChainInstances {
  const instances = new ChainInstances();
  const drive = CHAIN_ELEMENTS.map((element) => element.offsetMm);
  const left = sideOffsets('cutterLeft');
  const right = sideOffsets('cutterRight');
  const ties = sideOffsets('tie');
  const rivets = CHAIN_ELEMENTS.flatMap((element) => [
    element.offsetMm + RIVET_OFFSET_MM,
    element.offsetMm + RIVET_OFFSET_MM * 3,
  ]);
  const gauges = [...left, ...right];
  const gaugeZ = [
    ...left.map(() => -CHAIN_LINKS.sideOffset),
    ...right.map(() => CHAIN_LINKS.sideOffset),
  ];
  const meshes: [InstancedMesh, number[], number[] | number][] = [
    [instancedPart(context, driveLinkGeometry(), 'driveLinks', drive.length), drive, 0],
    [instancedPart(context, tieStrapGeometry(), 'chain', ties.length), ties, tieZ()],
    [instancedPart(context, rivetGeometry(), 'chain', rivets.length, 'driveLink'), rivets, 0],
    [instancedPart(context, cutterGeometry('left'), 'cutters', left.length), left, 0],
    [instancedPart(context, cutterGeometry('right'), 'cutters', right.length), right, 0],
    [instancedPart(context, depthGaugeGeometry(), 'depthGauges', gauges.length), gauges, gaugeZ],
  ];
  meshes.forEach(([mesh, offsets, z]) => {
    parent.add(mesh);
    instances.add(mesh, offsets, z);
  });
  return instances;
}

const OIL_COLOR = new Color(THEME.barOil);
const OIL_ALPHA = 0.95;

function oilCloud(context: PartContext, parent: Object3D): PointCloud {
  const material = registeredMaterial(
    context,
    'oilFlow',
    createPointMaterial(context.textures.dot, OIL_SIZE),
  );
  const cloud = new PointCloud(OIL.drops, material);
  parent.add(cloud.points);
  return cloud;
}

function placeOil(cloud: PointCloud, chainMm: number, shown: boolean): void {
  const span = (OIL.to - OIL.from) / MM;
  const spacing = span / OIL.drops;
  for (let index = 0; index < OIL.drops; index += 1) {
    const along = (((index * spacing + chainMm) % span) + span) % span;
    const point = pointOnLoop(OIL.from / MM + along);
    const normal = point.angle + Math.PI / 2;
    const alpha = shown ? OIL_ALPHA * Math.sin((along / span) * Math.PI) : 0;
    cloud.setPoint(
      index,
      point.x + Math.cos(normal) * OIL.lift,
      point.y + Math.sin(normal) * OIL.lift,
      BAR_PLANE_Z + CHAIN_LINKS.sideOffset * 2,
    );
    cloud.setColor(index, OIL_COLOR.r, OIL_COLOR.g, OIL_COLOR.b, alpha);
  }
  cloud.commit();
}

export function buildBar(context: PartContext, parent: Object3D, oilParent: Object3D): Section {
  const root = namedGroup('barAndChain', parent);
  const split = CHAIN_PATH.noseX - BAR.noseLength;
  addPart(
    context,
    root,
    extrudeAlongZ(plateShape(BAR.rearX, split, false), barSpan(), 0.0012),
    'bar',
  );
  addPart(
    context,
    root,
    extrudeAlongZ(plateShape(split, split, true), barSpan(), 0.0012),
    'barNose',
  );
  label(context, 'bar', root, [0.26, CRANK_Y - 0.006, BAR_PLANE_Z + BAR_THICKNESS / 2]);
  const noseSprocket = namedGroup('noseSprocket', root);
  noseSprocket.position.set(CHAIN_PATH.noseX, CRANK_Y, 0);
  addPart(context, noseSprocket, noseDetails(), 'barNose', 'steel');
  addPart(context, root, noseHub().translate(CHAIN_PATH.noseX, CRANK_Y, 0), 'barNose', 'steel');
  label(context, 'barNose', root, [
    CHAIN_PATH.noseX - 0.006,
    CRANK_Y + 0.006,
    BAR_PLANE_Z + BAR_THICKNESS / 2,
  ]);

  const chain = buildChain(context, root);
  const topY = (x: number) => railY(x, 'upper');
  label(context, 'chain', root, [
    0.2,
    topY(0.2) + 0.002,
    BAR_PLANE_Z + CHAIN_LINKS.sideOffset + 0.0005,
  ]);
  const conveyor = conveyorLabels(context, root);

  const zone = partMesh(
    context,
    new CircleGeometry(SAW_GEOMETRY.zoneRadius, ZONE_SEGMENTS, 0, Math.PI / 2),
    'kickbackZone',
  );
  zone.position.set(CHAIN_PATH.noseX, CRANK_Y, BAR_PLANE_Z + ZONE.lift);
  zone.renderOrder = 1;
  const edge = new RingGeometry(
    SAW_GEOMETRY.zoneRadius - 0.0012,
    SAW_GEOMETRY.zoneRadius,
    ZONE_SEGMENTS,
    1,
    0,
    Math.PI / 2,
  );
  zone.add(partMesh(context, edge, 'kickbackZone', 'bandOn'));
  root.add(zone);
  label(context, 'kickbackZone', zone, [
    SAW_GEOMETRY.zoneRadius * 0.6,
    SAW_GEOMETRY.zoneRadius * 0.6,
    0,
  ]);

  const oil = oilCloud(context, oilParent);

  return {
    root,
    setState: (state: AssemblyState) => {
      const { chainMm, oiling } = state.drive;
      chain.place(chainMm);
      conveyor(chainMm);
      noseSprocket.rotation.z = -(chainMm * MM) / CHAIN_PATH.noseRadius;
      zone.visible = state.view.zone;
      placeOil(oil, chainMm, oiling);
    },
  };
}
