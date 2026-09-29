import type { BufferGeometry } from 'three';
import type { Field, Vec3 } from './field';
import type { Offset, OffsetField } from './contraction';
import { insertPlane, subsetGeometry } from './planeCut';
import type { CutPlane } from './planeCut';
import type { Portal } from './vesselPath';

const CLEARANCE_MM = 2;
const XYZ = 3;
const CORNERS = 3;

export function portalPlane(portal: Portal): CutPlane {
  const [nx, ny, nz] = portal.normal;
  const [cx, cy, cz] = portal.centre;
  return { normal: portal.normal, constant: -(nx * cx + ny * cy + nz * cz) };
}

function along(portal: Portal, x: number, y: number, z: number): number {
  const [cx, cy, cz] = portal.centre;
  const [nx, ny, nz] = portal.normal;
  return (x - cx) * nx + (y - cy) * ny + (z - cz) * nz;
}

function aside(portal: Portal, x: number, y: number, z: number): number {
  const [cx, cy, cz] = portal.centre;
  const [nx, ny, nz] = portal.normal;
  const depth = along(portal, x, y, z);
  return Math.hypot(x - cx - nx * depth, y - cy - ny * depth, z - cz - nz * depth);
}

export function beyondPortal(portal: Portal, x: number, y: number, z: number): number {
  return Math.max(-along(portal, x, y, z), aside(portal, x, y, z) - portal.radius - CLEARANCE_MM);
}

export function portalExclusion(
  portals: readonly Portal[],
): (x: number, y: number, z: number) => number {
  return (x, y, z) => {
    let excluded = Number.NEGATIVE_INFINITY;
    for (const portal of portals) excluded = Math.max(excluded, -beyondPortal(portal, x, y, z));
    return excluded;
  };
}

function nearRoute(portal: Portal, point: Vec3): boolean {
  const reach = portal.radius + CLEARANCE_MM;
  return portal.beyond.some(
    (sample) =>
      Math.hypot(point[0] - sample[0], point[1] - sample[1], point[2] - sample[2]) < reach,
  );
}

function isBeyond(portal: Portal, point: Vec3): boolean {
  return along(portal, ...point) > 0 && nearRoute(portal, point);
}

export function trimAtPortals(
  geometry: BufferGeometry,
  portals: readonly Portal[],
): BufferGeometry {
  let current = geometry;
  for (const portal of portals) {
    const cut = insertPlane(current, portalPlane(portal));
    current.dispose();
    const positions = cut.getAttribute('position').array;
    current = subsetGeometry(cut, (corners) => {
      const centre: [number, number, number] = [0, 0, 0];
      for (const vertex of corners) {
        for (let axis = 0; axis < XYZ; axis += 1)
          centre[axis] += positions[vertex * XYZ + axis] / CORNERS;
      }
      return !isBeyond(portal, centre);
    });
    cut.dispose();
  }
  return current;
}

function smoothstep(edge0: number, edge1: number, value: number): number {
  const share = Math.min(Math.max((value - edge0) / (edge1 - edge0), 0), 1);
  return share * share * (3 - 2 * share);
}

export function pinnedNear(
  field: OffsetField,
  portals: readonly Portal[],
  fadeMm: number,
): OffsetField {
  return (x, y, z, out: Offset) => {
    field(x, y, z, out);
    let hold = 1;
    for (const portal of portals) {
      const [cx, cy, cz] = portal.centre;
      const gap = Math.hypot(x - cx, y - cy, z - cz) - portal.radius;
      hold = Math.min(hold, smoothstep(0, fadeMm, gap));
    }
    out[0] *= hold;
    out[1] *= hold;
    out[2] *= hold;
    return out;
  };
}

export function withPortalsExcluded(field: Field, portals: readonly Portal[]): Field {
  const excluded = portalExclusion(portals);
  return {
    centre: field.centre,
    reach: field.reach,
    box: field.box,
    distance: (x, y, z) => Math.max(field.distance(x, y, z), excluded(x, y, z)),
  };
}
