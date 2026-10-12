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
} from '../../model';
import type { ChainElement } from '../../model';
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
import { addPart, instancedPart, label, namedGroup, partMesh, registeredMaterial } from './context';
import type { PartContext, Section } from './context';

const ALPHA = Math.asin((CHAIN_PATH.sprocketRadius - CHAIN_PATH.noseRadius) / CHAIN_PATH.noseX);
const NORMAL = Math.PI / 2 - ALPHA;
const HALF_PITCH_MM = DRIVE_LINK_MM / 2;
const RIVET_OFFSET_MM = DRIVE_LINK_MM / 4;
const ZONE_SEGMENTS = 24;
const OIL_SIZE = 0.008;

type SideKind = 'cutterLeft' | 'cutterRight' | 'tie';

function railLine(x: number, radius: number, sign: number): number {
  return CRANK_Y + (sign * (radius - x * Math.cos(NORMAL))) / Math.sin(NORMAL);
}

function plateShape(fromX: number, withNose: boolean, toX: number): Shape {
  const sprocketRail = CHAIN_PATH.sprocketRadius - BAR.rail;
  const noseRail = CHAIN_PATH.noseRadius - BAR.rail;
  const shape = new Shape();
  shape.moveTo(fromX, railLine(fromX, sprocketRail, -1));
  if (withNose) {
    const { noseX } = CHAIN_PATH;
    shape.lineTo(noseX + noseRail * Math.cos(-NORMAL), CRANK_Y + noseRail * Math.sin(-NORMAL));
    shape.absarc(noseX, CRANK_Y, noseRail, -NORMAL, NORMAL, false);
  } else {
    shape.lineTo(toX, railLine(toX, sprocketRail, -1));
    shape.lineTo(toX, railLine(toX, sprocketRail, 1));
  }
  shape.lineTo(fromX, railLine(fromX, sprocketRail, 1));
  shape.closePath();
  return shape;
}

function barSpan() {
  return { from: BAR_PLANE_Z - BAR_THICKNESS / 2, to: BAR_PLANE_Z + BAR_THICKNESS / 2 };
}

function noseDetails(): BufferGeometry {
  const sprocket = extrudeAlongZ(
    starShape(BAR.noseTeeth, BAR.noseSprocket, BAR.noseSprocket - 0.0028, 0),
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
    extrudeAlongZ(plateShape(BAR.rearX, false, split), barSpan(), 0.0012),
    'bar',
  );
  addPart(
    context,
    root,
    extrudeAlongZ(plateShape(split, true, split), barSpan(), 0.0012),
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
  const topY = (x: number) => railLine(x, CHAIN_PATH.sprocketRadius, 1);
  label(context, 'chain', root, [
    0.2,
    topY(0.2) + 0.002,
    BAR_PLANE_Z + CHAIN_LINKS.sideOffset + 0.0005,
  ]);
  label(context, 'cutters', root, [0.3, topY(0.3) + 0.0066, BAR_PLANE_Z]);
  label(context, 'depthGauges', root, [0.33, topY(0.33) + 0.0055, BAR_PLANE_Z]);
  label(context, 'driveLinks', root, [0.15, topY(0.15) - 0.001, BAR_PLANE_Z + 0.0007]);

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
      noseSprocket.rotation.z = -(chainMm * MM) / CHAIN_PATH.noseRadius;
      zone.visible = state.view.zone;
      placeOil(oil, chainMm, oiling);
    },
  };
}
