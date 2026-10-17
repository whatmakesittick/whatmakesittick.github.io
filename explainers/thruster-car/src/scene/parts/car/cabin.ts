import { Group } from 'three';
import type { BufferGeometry, Mesh, Object3D } from 'three';
import type { MaterialFinish } from '@core/scene/materials';
import { anchorAt } from '@core/scene/parts';
import { SEAT } from '../../../model/layout';
import { CABIN_FINISHES } from '../../finishes';
import { buildCockpit } from '../../geometry/body/cabinCockpit';
import { buildSeat } from '../../geometry/body/cabinSeat';
import { buildTub } from '../../geometry/body/cabinTub';
import { mergeParts, partMesh } from '../context';
import type { EmphasisGroup, PartContext } from '../context';

export interface CabinUnit {
  readonly object: Group;
  readonly label: Object3D;
}

function merged(
  context: PartContext,
  parts: readonly BufferGeometry[],
  group: EmphasisGroup,
  finish: MaterialFinish,
): Mesh {
  return partMesh(context, mergeParts(parts), group, finish);
}

export function createCabin(context: PartContext): CabinUnit {
  const seat = buildSeat();
  const cockpit = buildCockpit();
  const tub = buildTub();
  const shell = merged(context, seat.shell, 'seat', CABIN_FINISHES.seatShell);
  const object = new Group();
  object.add(
    shell,
    merged(context, seat.cushion, 'seat', CABIN_FINISHES.seatCushion),
    merged(context, seat.harness, 'seat', CABIN_FINISHES.harness),
    merged(context, seat.buckle, 'seat', CABIN_FINISHES.buckle),
    merged(context, [...cockpit.wheel, ...cockpit.dash], 'body', CABIN_FINISHES.dash),
    merged(context, cockpit.screen, 'body', CABIN_FINISHES.screen),
    merged(context, tub.floor, 'body', CABIN_FINISHES.tub),
    merged(context, tub.walls, 'body', CABIN_FINISHES.liner),
  );
  return { object, label: anchorAt(shell, ...SEAT) };
}
