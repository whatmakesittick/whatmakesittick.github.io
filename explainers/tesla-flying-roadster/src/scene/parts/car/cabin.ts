import { Group } from 'three';
import type { BufferGeometry, Mesh, Object3D } from 'three';
import { anchorAt } from '@core/scene/parts';
import { SEAT } from '../../../model/layout';
import type { CarSwatch } from '../../finishes';
import { buildCockpit } from '../../geometry/body/cabinCockpit';
import { buildSeat } from '../../geometry/body/cabinSeat';
import { buildTub } from '../../geometry/body/cabinTub';
import { mergeParts, partMesh } from '../context';
import type { EmphasisGroup, PartContext } from '../context';
import type { CarLook } from './look';

export interface CabinUnit {
  readonly object: Group;
  readonly label: Object3D;
}

type Swatched = readonly (readonly [CarSwatch, readonly BufferGeometry[]])[];

function painted(context: PartContext, look: CarLook, group: EmphasisGroup, parts: Swatched): Mesh {
  const geometries = parts.flatMap(([swatch, list]) =>
    list.map((geometry) => look.palette.paint(geometry, swatch)),
  );
  return partMesh(context, mergeParts(geometries), group, look.finishes.solid);
}

export function createCabin(context: PartContext, look: CarLook): CabinUnit {
  const seat = buildSeat();
  const cockpit = buildCockpit();
  const tub = buildTub();
  const seatMesh = painted(context, look, 'seat', [
    ['seatShell', seat.shell],
    ['seatCushion', seat.cushion],
    ['harness', seat.harness],
    ['buckle', seat.buckle],
  ]);
  const cockpitMesh = painted(context, look, 'body', [
    ['dash', [...cockpit.wheel, ...cockpit.dash]],
    ['screen', cockpit.screen],
    ['tub', tub.floor],
    ['liner', tub.walls],
  ]);
  const object = new Group();
  object.add(seatMesh, cockpitMesh);
  return { object, label: anchorAt(seatMesh, ...SEAT) };
}
