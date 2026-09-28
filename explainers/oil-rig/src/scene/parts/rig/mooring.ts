import {
  BufferAttribute,
  CatmullRomCurve3,
  Color,
  Group,
  Matrix4,
  Quaternion,
  TorusGeometry,
  TubeGeometry,
  Vector3,
} from 'three';
import type { BufferGeometry, Object3D } from 'three';
import { smoothstep } from '@core/math';
import { anchorAt } from '@core/scene/parts';
import { HULL, MOORING } from '../../constants';
import { mooringPoint, mooringPoints, shareAtLength } from '../../geometry/catenary';
import type { MooringLine } from '../../geometry/catenary';
import { merge } from '../../geometry/merge';
import { instancedMesh, partMesh } from '../context';
import type { PartContext } from '../context';
import { CORNERS, fairleadPoints } from './hull';

export interface MooringPart {
  object: Group;
  anchor: Object3D;
}

interface LinkPlacement {
  position: Vector3;
  tangent: Vector3;
}

const RGBA = 4;
const WIRE_RADIAL = 5;
const LENGTH_SAMPLES = 200;
const FADE_FROM = 0.2;
const DIAGONAL = Math.PI / 4;
const CHAIN_STANDOFF = 0.45;
const LINK_SEGMENTS = { radial: 4, tubular: 10 } as const;
const WIRE_TONE = '#2f3438';
const LABEL_SHARE = 0.03;
const LABEL_LINE = 1;
const X_AXIS = new Vector3(1, 0, 0);
const QUARTER_TURN = Math.PI / 2;

function lines(): MooringLine[] {
  const fairleads = fairleadPoints();
  return CORNERS.flatMap(([sx, sz], corner) =>
    [DIAGONAL - MOORING.spread, DIAGONAL + MOORING.spread].map((angle, slot) => {
      const [x, y, z] = fairleads[corner * 2 + slot];
      const outward = slot === 0 ? [sx * CHAIN_STANDOFF, 0] : [0, sz * CHAIN_STANDOFF];
      return {
        fairlead: new Vector3(x + outward[0], y, z + outward[1]),
        heading: new Vector3(sx * Math.cos(angle), 0, sz * Math.sin(angle)),
        reach: MOORING.reach,
        drop: MOORING.drop,
      };
    }),
  );
}

function verticalLinks(line: MooringLine): LinkPlacement[] {
  const height = HULL.deck.top - line.fairlead.y;
  const count = Math.floor(height / MOORING.link.pitch);
  return Array.from({ length: count }, (_, index) => ({
    position: line.fairlead.clone().setY(line.fairlead.y + index * MOORING.link.pitch),
    tangent: new Vector3(0, 1, 0),
  }));
}

function curveLinks(line: MooringLine, endShare: number): LinkPlacement[] {
  const points = mooringPoints(line, LENGTH_SAMPLES).filter(
    (_, index) => index / LENGTH_SAMPLES <= endShare,
  );
  const placements: LinkPlacement[] = [];
  let carried = 0;
  for (let index = 1; index < points.length; index++) {
    const segment = points[index].clone().sub(points[index - 1]);
    const length = segment.length();
    const tangent = segment.normalize();
    for (let along = carried; along < length; along += MOORING.link.pitch) {
      placements.push({
        position: points[index - 1].clone().addScaledVector(tangent, along),
        tangent,
      });
    }
    carried = (carried - length) % MOORING.link.pitch;
    if (carried < 0) carried += MOORING.link.pitch;
  }
  return placements;
}

function linkGeometry(): BufferGeometry {
  const { width, bar, length } = MOORING.link;
  const link = new TorusGeometry(width / 2 - bar, bar, LINK_SEGMENTS.radial, LINK_SEGMENTS.tubular);
  link.scale(length / width, 1, 1);
  return link;
}

function wireGeometry(line: MooringLine, startShare: number): BufferGeometry {
  const points = mooringPoints(line, MOORING.wireSegments).filter(
    (_, index) => index / MOORING.wireSegments >= startShare,
  );
  points.unshift(mooringPoint(line, startShare));
  const tube = new TubeGeometry(
    new CatmullRomCurve3(points),
    MOORING.wireSegments,
    MOORING.wireRadius,
    WIRE_RADIAL,
  );
  const rings = MOORING.wireSegments + 1;
  const perRing = WIRE_RADIAL + 1;
  const tone = new Color(WIRE_TONE);
  const colors = new Float32Array(rings * perRing * RGBA);
  for (let ring = 0; ring < rings; ring++) {
    const share = startShare + (1 - startShare) * (ring / MOORING.wireSegments);
    const alpha = 1 - smoothstep(share, FADE_FROM, MOORING.fadeShare);
    for (let side = 0; side < perRing; side++) {
      colors.set([tone.r, tone.g, tone.b, alpha], (ring * perRing + side) * RGBA);
    }
  }
  tube.setAttribute('color', new BufferAttribute(colors, RGBA));
  return tube;
}

function chainMesh(context: PartContext, placements: LinkPlacement[]) {
  const mesh = instancedMesh(context, linkGeometry(), 'mooring', 'chain', placements.length);
  const matrix = new Matrix4();
  const turn = new Quaternion();
  const twist = new Quaternion();
  const scale = new Vector3(1, 1, 1);
  placements.forEach((link, index) => {
    turn.setFromUnitVectors(X_AXIS, link.tangent);
    twist.setFromAxisAngle(link.tangent, (index % 2) * QUARTER_TURN);
    mesh.setMatrixAt(index, matrix.compose(link.position, twist.multiply(turn), scale));
  });
  mesh.computeBoundingSphere();
  return mesh;
}

export function createMooring(context: PartContext): MooringPart {
  const object = new Group();
  const all = lines();
  const chainEnds = all.map((line) => shareAtLength(line, MOORING.chainAlongLine, LENGTH_SAMPLES));
  const links = all.flatMap((line, index) => [
    ...verticalLinks(line),
    ...curveLinks(line, chainEnds[index]),
  ]);
  const wires = merge(all.map((line, index) => wireGeometry(line, chainEnds[index])));
  const wire = partMesh(context, wires, 'mooring', 'mooringWire');
  object.add(chainMesh(context, links), wire);
  const label = mooringPoint(all[LABEL_LINE], LABEL_SHARE);
  return { object, anchor: anchorAt(object, label.x, label.y, label.z) };
}
