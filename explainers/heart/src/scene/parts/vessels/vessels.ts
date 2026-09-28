import { BufferAttribute, Color, Group, SphereGeometry } from 'three';
import type { BufferGeometry, Mesh, Vector3 } from 'three';
import type { PartId } from '../../../ids';
import { THEME } from '../../../theme';
import {
  PORTAL_OVERLAP_MM,
  VESSEL_SEAM_MM,
  VESSEL_WALL_MM,
  VESSELS,
  VESSEL_DETAIL,
} from '../../constants';
import type { VesselName, VesselSpec } from '../../constants';
import { FINISHES, desaturate } from '../../finishes';
import { vesselHalves } from '../../geometry/vesselMesh';
import { TUBE_LAYER, hollowTube } from '../../geometry/tube';
import { radiusAt, routeCurve } from '../../geometry/vesselPath';
import { mergeParts } from '../../geometry/merge';
import { partMesh } from '../context';
import type { PartContext } from '../context';

const ENDS_AT_SPLIT: ReadonlySet<VesselName> = new Set(['pulmonaryTrunk']);
const XYZ = 3;

function jointGeometry(centre: Vector3, radius: number, colour: string): BufferGeometry {
  const sphere = new SphereGeometry(
    radius,
    VESSEL_DETAIL.jointSegments,
    VESSEL_DETAIL.jointSegments / 2,
  );
  sphere.deleteAttribute('uv');
  sphere.translate(centre.x, centre.y, centre.z);
  const count = sphere.getAttribute('position').count;
  const colours = new Float32Array(count * XYZ);
  const tint = new Color(colour);
  for (let vertex = 0; vertex < count; vertex += 1) tint.toArray(colours, vertex * XYZ);
  sphere.setAttribute('color', new BufferAttribute(colours, XYZ));
  sphere.setAttribute(
    'layer',
    new BufferAttribute(new Float32Array(count).fill(TUBE_LAYER.wall), 1),
  );
  return sphere;
}

function tintFor(vessel: VesselSpec): { wall: string; lumen: string; rim: string } {
  const base = vessel.blood === 'arterial' ? THEME.arterial : THEME.venous;
  const wall = desaturate(base, VESSEL_DETAIL.saturation, VESSEL_DETAIL.brightness);
  return {
    wall,
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

function vesselGeometry(name: VesselName, vessel: VesselSpec): BufferGeometry {
  const { route, portalMm } = vessel;
  const joined = portalMm !== undefined;
  const fromMm = joined ? (portalMm ?? 0) - PORTAL_OVERLAP_MM : 0;
  const seam = joined ? VESSEL_SEAM_MM : 0;
  const tint = tintFor(vessel);
  const radius = radiusAt(route, fromMm);
  return hollowTube({
    curve: routeCurve(route),
    fromMm,
    outer: (distance) => radiusAt(route, distance) + seam + collarLip(portalMm, distance),
    inner: (distance) => radiusAt(route, distance) - VESSEL_WALL_MM + seam,
    segmentMm: VESSEL_DETAIL.segmentMm,
    radialSegments: Math.max(
      VESSEL_DETAIL.minRadialSegments,
      Math.round(radius * VESSEL_DETAIL.radialPerMm),
    ),
    wallColour: tint.wall,
    lumenColour: tint.lumen,
    plugInsetMm: VESSEL_DETAIL.plugInsetMm,
    plugs: { start: false, end: !ENDS_AT_SPLIT.has(name) },
    lumenFade: joined
      ? {
          colour: THEME.cavity,
          fromMm: portalMm ?? 0,
          toMm: (portalMm ?? 0) + VESSEL_DETAIL.lumenFadeMm,
        }
      : undefined,
  });
}

export class VesselsPart {
  readonly object = new Group();
  private readonly fronts: Mesh[] = [];
  private readonly walls: { mesh: Mesh; part: PartId }[] = [];
  private readonly lumens: Mesh[] = [];
  private cutaway = false;
  private glass = false;
  private readonly context: PartContext;

  constructor(context: PartContext) {
    this.context = context;
    const byPart = new Map<PartId, { geometries: BufferGeometry[]; rim: string }>();
    for (const [name, vessel] of Object.entries(VESSELS) as [VesselName, VesselSpec][]) {
      const entry = byPart.get(vessel.part) ?? { geometries: [], rim: tintFor(vessel).rim };
      entry.geometries.push(vesselGeometry(name, vessel));
      if (ENDS_AT_SPLIT.has(name)) {
        const end = routeCurve(vessel.route).getPointAt(1);
        const radius = vessel.route.radius + VESSEL_DETAIL.jointMarginMm;
        entry.geometries.push(jointGeometry(end, radius, tintFor(vessel).wall));
      }
      byPart.set(vessel.part, entry);
    }
    for (const [part, { geometries, rim }] of byPart) {
      const merged = geometries.length > 1 ? mergeParts(geometries) : geometries[0];
      const { front, back } = vesselHalves(merged, rim);
      merged.dispose();
      const frontWall = partMesh(context, front.wall, part, FINISHES.vessel);
      const frontLumen = partMesh(context, front.lumen, part, FINISHES.vessel);
      const backWall = partMesh(context, back.wall, part, FINISHES.vessel);
      const backLumen = partMesh(context, back.lumen, part, FINISHES.vessel);
      this.fronts.push(frontWall, frontLumen);
      this.walls.push({ mesh: frontWall, part }, { mesh: backWall, part });
      this.lumens.push(frontLumen, backLumen);
      context.materials.get(part, FINISHES.vesselGlass);
      this.object.add(frontWall, frontLumen, backWall, backLumen);
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
