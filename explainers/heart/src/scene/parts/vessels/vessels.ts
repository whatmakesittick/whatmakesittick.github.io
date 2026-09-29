import { Group, Vector3 } from 'three';
import type { BufferGeometry, Mesh } from 'three';
import type { PartId } from '../../../ids';
import { SCENE_EXTENT } from '../../../model';
import { THEME } from '../../../theme';
import {
  PORTAL_OVERLAP_MM,
  VESSEL_DETAIL,
  VESSEL_SEAM_MM,
  VESSEL_WALL_MM,
  VESSELS,
} from '../../constants';
import type { VesselName, VesselSpec } from '../../constants';
import { FINISHES, desaturate } from '../../finishes';
import { carveInside } from '../../geometry/carve';
import { collarGeometry, collarLoop, loopPoints } from '../../geometry/collar';
import type { Field } from '../../geometry/field';
import { sweptTube } from '../../geometry/field';
import { mergeParts } from '../../geometry/merge';
import {
  FRONTAL_PLANE,
  insertPlane,
  openLoops,
  sideFilter,
  subsetGeometry,
} from '../../geometry/planeCut';
import { portalAt, radiusAt, routeCurve, routeField } from '../../geometry/vesselPath';
import type { Portal } from '../../geometry/vesselPath';
import { hollowTube, tubePieces } from '../../geometry/tube';
import type { TubeSurfaces } from '../../geometry/tube';
import type { Clip, SectionTube } from '../../geometry/vesselCap';
import { vesselCaps, vesselSection } from '../../geometry/vesselCap';
import { partMesh } from '../context';
import type { PartContext } from '../context';

interface Tint {
  readonly wall: string;
  readonly lumen: string;
  readonly rim: string;
}

interface Piece {
  readonly part: PartId;
  surfaces: TubeSurfaces;
}

interface BuiltVessel {
  readonly name: VesselName;
  readonly spec: VesselSpec;
  readonly tint: Tint;
  readonly pieces: Piece[];
  readonly outer: Field;
  readonly inner: Field;
  readonly collars: BufferGeometry[];
}

const XYZ = 3;
const VESSEL_ENTRIES = Object.entries(VESSELS) as [VesselName, VesselSpec][];

function tintFor(vessel: VesselSpec): Tint {
  const base = vessel.blood === 'arterial' ? THEME.arterial : THEME.venous;
  return {
    wall: desaturate(base, VESSEL_DETAIL.saturation, VESSEL_DETAIL.brightness),
    lumen: desaturate(base, VESSEL_DETAIL.saturation, VESSEL_DETAIL.lumenBrightness),
    rim: desaturate(
      base,
      VESSEL_DETAIL.saturation,
      VESSEL_DETAIL.brightness * VESSEL_DETAIL.rimShade,
    ),
  };
}

function collarLip(portalMm: number | undefined, distance: number): number {
  if (portalMm === undefined) return 0;
  const share = Math.min(Math.max((distance - portalMm) / VESSEL_DETAIL.collarMm, 0), 1);
  return VESSEL_DETAIL.collarLipMm * (1 - share * share * (3 - 2 * share));
}

function lumenTuck(portalMm: number | undefined, distance: number): number {
  if (portalMm === undefined) return 0;
  const share = Math.min(Math.max((portalMm - distance) / PORTAL_OVERLAP_MM, 0), 1);
  return VESSEL_DETAIL.lumenTuckMm * share;
}

function startOf(vessel: VesselSpec): number {
  return vessel.portalMm === undefined ? 0 : vessel.portalMm - PORTAL_OVERLAP_MM;
}

function seamOf(vessel: VesselSpec): number {
  return vessel.portalMm === undefined ? 0 : VESSEL_SEAM_MM;
}

function tubeGeometry(vessel: VesselSpec, tint: Tint): BufferGeometry {
  const { route, portalMm } = vessel;
  const rooted = portalMm !== undefined;
  const fromMm = startOf(vessel);
  const seam = seamOf(vessel);
  const radius = radiusAt(route, fromMm);
  return hollowTube({
    curve: routeCurve(route),
    fromMm,
    outer: (distance) => radiusAt(route, distance) + seam + collarLip(portalMm, distance),
    inner: (distance) =>
      radiusAt(route, distance) - VESSEL_WALL_MM + seam - lumenTuck(portalMm, distance),
    segmentMm: VESSEL_DETAIL.segmentMm,
    radialSegments: Math.max(
      VESSEL_DETAIL.minRadialSegments,
      Math.round(radius * VESSEL_DETAIL.radialPerMm),
    ),
    wallColour: tint.wall,
    lumenColour: tint.lumen,
    plugInsetMm: VESSEL_DETAIL.plugInsetMm,
    annuli: { start: rooted, end: true },
    plugs: { start: false, end: true },
    lumenFade: rooted
      ? {
          colour: THEME.cavity,
          fromMm: portalMm ?? 0,
          toMm: (portalMm ?? 0) + VESSEL_DETAIL.lumenFadeMm,
        }
      : undefined,
  });
}

function build(name: VesselName, spec: VesselSpec): BuiltVessel {
  const tint = tintFor(spec);
  const geometry = tubeGeometry(spec, tint);
  const breaks = spec.breaks ?? [];
  const surfaces = tubePieces(
    geometry,
    breaks.map((entry) => entry.atMm),
  );
  geometry.dispose();
  const parts = [spec.part, ...breaks.map((entry) => entry.part)];
  const length = routeCurve(spec.route).getLength();
  const seam = seamOf(spec);
  return {
    name,
    spec,
    tint,
    pieces: surfaces.map((piece, index) => ({ part: parts[index], surfaces: piece })),
    outer: routeField(spec.route, length, -seam, startOf(spec)),
    inner: routeField(spec.route, length, VESSEL_WALL_MM - seam, startOf(spec)),
    collars: [],
  };
}

function carvePieces(vessel: BuiltVessel, outer: Field, inner: Field): void {
  for (const piece of vessel.pieces) {
    const { wall, lumen } = piece.surfaces;
    piece.surfaces = { wall: carveInside(wall, outer), lumen: carveInside(lumen, inner) };
    wall.dispose();
    lumen.dispose();
  }
}

function junctionLoop(child: BuiltVessel): Vector3[] | null {
  const wall = child.pieces[0].surfaces.wall;
  const positions = wall.getAttribute('position').array;
  const start = new Vector3(...child.spec.route.points[0]);
  const loops = openLoops(wall).map((loop) =>
    loop.map(
      (vertex) =>
        new Vector3(
          positions[vertex * XYZ],
          positions[vertex * XYZ + 1],
          positions[vertex * XYZ + 2],
        ),
    ),
  );
  const centre = (loop: Vector3[]) =>
    loop.reduce((sum, point) => sum.add(point), new Vector3()).divideScalar(loop.length);
  const nearest = loops.sort(
    (a, b) => centre(a).distanceTo(start) - centre(b).distanceTo(start),
  )[0];
  return nearest ?? null;
}

function joinBranch(child: BuiltVessel, parent: BuiltVessel): Field | null {
  carvePieces(child, parent.outer, parent.inner);
  carvePieces(parent, child.outer, child.inner);
  const raw = junctionLoop(child);
  if (!raw) return null;
  const style = VESSEL_DETAIL.collar;
  const loop = collarLoop(raw, style);
  child.collars.push(collarGeometry(loop, style, child.tint.wall));
  const points = loopPoints(loop);
  return sweptTube(
    points,
    points.map(() => style.radiusMm),
  );
}

function beforePortal(portal: Portal): Clip {
  const [cx, cy] = portal.centre;
  const [nx, ny, nz] = portal.normal;
  const reach = portal.radius + VESSEL_DETAIL.portalClearanceMm;
  return (x, y) => {
    const dx = x - cx;
    const dy = y - cy;
    const along = dx * nx + dy * ny;
    const aside = Math.hypot(dx - nx * along, dy - ny * along, -nz * along);
    const inside = Math.max(along, -along - VESSEL_DETAIL.portalDepthMm, aside - reach);
    return -inside;
  };
}

const SCENE_BOX: Clip = (x, y) =>
  Math.max(
    SCENE_EXTENT.x[0] - x,
    x - SCENE_EXTENT.x[1],
    SCENE_EXTENT.y[0] - y,
    y - SCENE_EXTENT.y[1],
  );

function sectionClips(): Clip[] {
  const portals = VESSEL_ENTRIES.filter(([, spec]) => spec.portalMm !== undefined).map(([, spec]) =>
    beforePortal(portalAt(spec.route, spec.portalMm ?? 0)),
  );
  return [SCENE_BOX, ...portals];
}

function halves(geometry: BufferGeometry): { front: BufferGeometry; back: BufferGeometry } {
  const cut = insertPlane(geometry, FRONTAL_PLANE);
  const front = subsetGeometry(cut, sideFilter(cut, FRONTAL_PLANE, true));
  const back = subsetGeometry(cut, sideFilter(cut, FRONTAL_PLANE, false));
  cut.dispose();
  return { front, back };
}

function mergedOrSingle(geometries: BufferGeometry[]): BufferGeometry {
  return geometries.length > 1 ? mergeParts(geometries) : geometries[0];
}

export class VesselsPart {
  readonly object = new Group();
  private readonly fronts: Mesh[] = [];
  private readonly walls: { mesh: Mesh; part: PartId }[] = [];
  private readonly lumens: Mesh[] = [];
  private readonly context: PartContext;
  private cutaway = false;
  private glass = false;

  constructor(context: PartContext) {
    this.context = context;
    const vessels = new Map(VESSEL_ENTRIES.map(([name, spec]) => [name, build(name, spec)]));
    const collarFields: Field[] = [];
    for (const vessel of vessels.values()) {
      const parent = vessel.spec.parent ? vessels.get(vessel.spec.parent) : undefined;
      if (!parent) continue;
      const collar = joinBranch(vessel, parent);
      if (collar) collarFields.push(collar);
    }
    const caps = this.caps([...vessels.values()], collarFields);
    for (const [part, surfaces] of this.byPart([...vessels.values()])) {
      this.addPart(part, surfaces.walls, surfaces.lumens, caps.get(part) ?? []);
    }
  }

  setCutaway(cutaway: boolean): void {
    this.cutaway = cutaway;
    this.refresh();
  }

  setGlass(glass: boolean): void {
    this.glass = glass;
    const finish = glass ? FINISHES.vesselGlass : FINISHES.vessel;
    this.walls.forEach(({ mesh, part }) => {
      mesh.material = this.context.materials.get(part, finish);
    });
    this.refresh();
  }

  private byPart(vessels: readonly BuiltVessel[]) {
    const byPart = new Map<PartId, { walls: BufferGeometry[]; lumens: BufferGeometry[] }>();
    for (const vessel of vessels) {
      vessel.pieces.forEach((piece, index) => {
        const entry = byPart.get(piece.part) ?? { walls: [], lumens: [] };
        entry.walls.push(piece.surfaces.wall, ...(index === 0 ? vessel.collars : []));
        entry.lumens.push(piece.surfaces.lumen);
        byPart.set(piece.part, entry);
      });
    }
    return byPart;
  }

  private caps(
    vessels: readonly BuiltVessel[],
    collars: readonly Field[],
  ): Map<PartId, BufferGeometry[]> {
    const tubes: SectionTube[] = vessels.map((vessel, owner) => ({
      outer: vessel.outer,
      inner: vessel.inner,
      owner,
    }));
    const colours = new Map(vessels.map((vessel, owner) => [owner, vessel.tint.rim]));
    const pieces = vesselCaps(vesselSection(tubes, collars, sectionClips()), tubes, colours, {
      depthMm: VESSEL_DETAIL.capDepthMm,
      grid: {
        min: [SCENE_EXTENT.x[0], SCENE_EXTENT.y[0]],
        max: [SCENE_EXTENT.x[1], SCENE_EXTENT.y[1]],
        cell: VESSEL_DETAIL.capCellMm,
      },
    });
    const byPart = new Map<PartId, BufferGeometry[]>();
    for (const [owner, geometry] of pieces) {
      const part = this.capPart(vessels[owner], geometry);
      byPart.set(part, [...(byPart.get(part) ?? []), geometry]);
    }
    return byPart;
  }

  private capPart(vessel: BuiltVessel, cap: BufferGeometry): PartId {
    const breaks = vessel.spec.breaks ?? [];
    if (breaks.length === 0) return vessel.spec.part;
    const positions = cap.getAttribute('position').array;
    const curve = routeCurve(vessel.spec.route);
    const middle = new Vector3(positions[0], positions[1], 0);
    const samples = curve.getSpacedPoints(VESSEL_DETAIL.capOwnerSamples);
    let nearest = 0;
    samples.forEach((sample, index) => {
      if (sample.distanceToSquared(middle) < samples[nearest].distanceToSquared(middle))
        nearest = index;
    });
    const along = (curve.getLength() * nearest) / VESSEL_DETAIL.capOwnerSamples;
    const passed = breaks.filter((entry) => along >= entry.atMm);
    return passed.length ? passed[passed.length - 1].part : vessel.spec.part;
  }

  private addPart(
    part: PartId,
    walls: BufferGeometry[],
    lumens: BufferGeometry[],
    caps: BufferGeometry[],
  ): void {
    const wall = halves(mergedOrSingle(walls));
    const lumen = halves(mergedOrSingle(lumens));
    const back = caps.length ? mergeParts([wall.back, ...caps]) : wall.back;
    const frontWall = partMesh(this.context, wall.front, part, FINISHES.vessel);
    const frontLumen = partMesh(this.context, lumen.front, part, FINISHES.vessel);
    const backWall = partMesh(this.context, back, part, FINISHES.vessel);
    const backLumen = partMesh(this.context, lumen.back, part, FINISHES.vessel);
    this.fronts.push(frontWall, frontLumen);
    this.walls.push({ mesh: frontWall, part }, { mesh: backWall, part });
    this.lumens.push(frontLumen, backLumen);
    this.context.materials.get(part, FINISHES.vesselGlass);
    this.object.add(frontWall, frontLumen, backWall, backLumen);
  }

  private refresh(): void {
    this.fronts.forEach((mesh) => {
      mesh.visible = !this.cutaway;
    });
    this.lumens.forEach((mesh) => {
      if (this.glass) mesh.visible = false;
      else if (!this.fronts.includes(mesh)) mesh.visible = true;
    });
  }
}
