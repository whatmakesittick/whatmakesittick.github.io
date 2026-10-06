import { BoxGeometry, Matrix4, Quaternion, Vector3 } from 'three';
import type { BufferGeometry, Group } from 'three';
import type { MaterialFinish } from '@core/scene/materials';
import type { PartId } from '../../../ids';
import { LAYERS, MAIN_COILS, SHIELD_COILS, SHIMS } from '../../../model/layout';
import type { CoilRings, Shell } from '../../../model/layout';
import { hollowRect, rectLoop, roundCorners } from '../../geometry/profile';
import type { Profile } from '../../geometry/profile';
import { sweepProfile } from '../../geometry/sweep';
import { instanced, mergeParts } from '../context';
import type { PartContext } from '../context';
import { addMeshes, boreGroup, isInWedge, REST_ARC } from './cutaway';
import {
  ALUMINIUM_FINISH,
  HELIUM_STEEL_FINISH,
  HELIUM_VAPOUR_FINISH,
  LIQUID_HELIUM_FINISH,
  SHIM_FINISH,
  SHIM_TRAY_FINISH,
  STEEL_FINISH,
  VACUUM_FINISH,
} from './looks';
import type { MagnetLooks } from './looks';
import { slice, sliceFaces } from './slice';
import type { SliceLayer } from './slice';

const SEGMENTS = 112;
const CORNER_STEPS = 3;
const COIL_CORNER = 0.006;
const COIL_GROWTH = { radial: 0.035, width: 1.6 } as const;
const COIL_CLEARANCE = 0.008;
const LIQUID_FILL = 0.6;
const SHIM_POCKETS = 10;
const SHIM_POCKET = { width: 0.03, thickness: 0.006, length: 0.05 } as const;

interface VesselSpec {
  shell: Shell;
  wall: number;
  corner: number;
}

export const VESSELS = {
  vacuumVessel: { shell: LAYERS.vacuumVessel, wall: 0.014, corner: 0.05 },
  radiationShield: { shell: LAYERS.radiationShield, wall: 0.016, corner: 0.035 },
  heliumVessel: { shell: LAYERS.heliumVessel, wall: 0.016, corner: 0.03 },
} as const satisfies Record<string, VesselSpec>;

export type CryostatParts = Partial<Record<PartId, Group>>;

interface VesselLayers {
  wall: SliceLayer;
  inside: SliceLayer;
}

interface VesselPieces {
  body: BufferGeometry;
  inside: BufferGeometry;
}

function vesselProfile({ shell, wall, corner }: VesselSpec): Profile {
  return hollowRect(shell.inner, shell.outer, shell.halfLength, wall, corner, CORNER_STEPS);
}

function vesselPieces(spec: VesselSpec, layers: VesselLayers): VesselPieces {
  const profile = vesselProfile(spec);
  const sweep = sweepProfile(profile, { arc: REST_ARC, segmentsPerTurn: SEGMENTS, capped: false });
  return {
    body: mergeParts([sweep, slice({ outer: profile.outer, holes: [] }, layers.wall)]),
    inside: slice({ outer: profile.holes[0], holes: [] }, layers.inside),
  };
}

function vesselPart(
  context: PartContext,
  id: keyof typeof VESSELS,
  finish: MaterialFinish,
  insideFinish: MaterialFinish,
  layers: VesselLayers,
): Group {
  const { body, inside } = vesselPieces(VESSELS[id], layers);
  const group = boreGroup(id);
  addMeshes(context, group, id, finish, [body]);
  addMeshes(context, group, id, insideFinish, [inside]);
  return group;
}

function liquidSlice({ shell, wall, corner }: VesselSpec): BufferGeometry {
  const inner = shell.inner + wall;
  const outer = shell.outer - wall;
  const halfLength = shell.halfLength - wall;
  const level = inner + LIQUID_FILL * (outer - inner);
  return sliceFaces('liquid', ({ angle }) => {
    const rise = Math.sin(angle);
    const surface = rise > 0 ? Math.min(outer, level / rise) : outer;
    const loop = rectLoop(inner, surface, -halfLength, halfLength);
    return { outer: roundCorners(loop, Math.max(corner - wall, 0), CORNER_STEPS), holes: [] };
  });
}

function drawnRings(rings: CoilRings): CoilRings {
  const { shell, wall } = VESSELS.heliumVessel;
  return {
    ...rings,
    inner: Math.max(rings.inner - COIL_GROWTH.radial, shell.inner + wall + COIL_CLEARANCE),
    outer: Math.min(rings.outer + COIL_GROWTH.radial, shell.outer - wall - COIL_CLEARANCE),
    width: rings.width * COIL_GROWTH.width,
  };
}

interface CoilGeometry {
  sides: BufferGeometry;
  caps: BufferGeometry;
}

function coilGeometry(rings: CoilRings): CoilGeometry {
  const drawn = drawnRings(rings);
  const profiles = drawn.z.map((z) => {
    const loop = rectLoop(drawn.inner, drawn.outer, z - drawn.width / 2, z + drawn.width / 2);
    return { outer: roundCorners(loop, COIL_CORNER, CORNER_STEPS), holes: [] };
  });
  return {
    sides: mergeParts(
      profiles.map((profile) =>
        sweepProfile(profile, { arc: REST_ARC, segmentsPerTurn: SEGMENTS, capped: false }),
      ),
    ),
    caps: mergeParts(profiles.map((profile) => slice(profile, 'coil'))),
  };
}

function coilPart(
  context: PartContext,
  id: PartId,
  [finish, cutFinish]: readonly [MaterialFinish, MaterialFinish],
  rings: CoilRings,
): Group {
  const { sides, caps } = coilGeometry(rings);
  const group = boreGroup(id);
  addMeshes(context, group, id, finish, [sides]);
  addMeshes(context, group, id, cutFinish, [caps]);
  return group;
}

function radialMatrix(angle: number, radius: number, z: number): Matrix4 {
  const turn = new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), angle - Math.PI / 2);
  const position = new Vector3(radius * Math.cos(angle), radius * Math.sin(angle), z);
  return new Matrix4().compose(position, turn, new Vector3(1, 1, 1));
}

function shimAngles(): number[] {
  const step = (2 * Math.PI) / SHIMS.count;
  return Array.from({ length: SHIMS.count }, (_, index) => (index + 0.5) * step).filter(
    (angle) => !isInWedge(angle),
  );
}

function addShims(context: PartContext, group: Group): void {
  const trayRadius = SHIMS.radius + VESSELS.vacuumVessel.wall;
  const pocketRadius = trayRadius + (SHIMS.thickness + SHIM_POCKET.thickness) / 2;
  const pitch = (2 * SHIMS.halfLength) / SHIM_POCKETS;
  const angles = shimAngles();
  const tray = new BoxGeometry(SHIMS.width, SHIMS.thickness, 2 * SHIMS.halfLength);
  const pocket = new BoxGeometry(SHIM_POCKET.width, SHIM_POCKET.thickness, SHIM_POCKET.length);
  const pocketMatrices = angles.flatMap((angle) =>
    Array.from({ length: SHIM_POCKETS }, (_, index) =>
      radialMatrix(angle, pocketRadius, (index + 0.5) * pitch - SHIMS.halfLength),
    ),
  );
  group.add(
    instanced(
      context,
      tray,
      'shims',
      SHIM_TRAY_FINISH,
      angles.map((angle) => radialMatrix(angle, trayRadius, 0)),
    ),
    instanced(context, pocket, 'shims', SHIM_FINISH, pocketMatrices),
  );
}

export function buildCryostat(context: PartContext, looks: MagnetLooks): CryostatParts {
  const helium = vesselPart(context, 'heliumVessel', HELIUM_STEEL_FINISH, HELIUM_VAPOUR_FINISH, {
    wall: 'heliumWall',
    inside: 'vapour',
  });
  addMeshes(context, helium, 'heliumVessel', LIQUID_HELIUM_FINISH, [
    liquidSlice(VESSELS.heliumVessel),
  ]);
  const shims = boreGroup('shims');
  addShims(context, shims);
  return {
    vacuumVessel: vesselPart(context, 'vacuumVessel', STEEL_FINISH, VACUUM_FINISH, {
      wall: 'vacuumWall',
      inside: 'vacuumGap',
    }),
    radiationShield: vesselPart(context, 'radiationShield', ALUMINIUM_FINISH, VACUUM_FINISH, {
      wall: 'shieldWall',
      inside: 'shieldGap',
    }),
    heliumVessel: helium,
    mainCoils: coilPart(context, 'mainCoils', [looks.winding, looks.windingCut], MAIN_COILS),
    shieldCoils: coilPart(
      context,
      'shieldCoils',
      [looks.shieldWinding, looks.shieldWindingCut],
      SHIELD_COILS,
    ),
    shims,
  };
}
