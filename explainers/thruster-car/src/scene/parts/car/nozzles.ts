import { Group, Mesh, Vector3 } from 'three';
import type { BufferGeometry, Material, Object3D } from 'three';
import { anchorAt } from '@core/scene/parts';
import { NOZZLE_IDS, NOZZLE_PARTS } from '../../../ids';
import type { AssemblyState, NozzleId, NozzlePartId, PartId } from '../../../ids';
import { NOZZLES } from '../../../model/layout';
import {
  BELL_LENGTH,
  bellGeometry,
  collarGeometry,
  coneGeometry,
  nozzleReach,
  stemGeometry,
} from '../../geometry/gear/nozzle';
import type { PartContext } from '../context';
import { drawnNozzleAt } from './dimensions';
import { CONE_FINISHES, GEAR_FINISHES } from './gearFinishes';

const LABELLED: Readonly<Record<NozzlePartId, NozzleId>> = {
  cornerNozzles: 'cornerFrontRight',
  frontNozzles: 'frontRight',
  rearNozzles: 'rearOuterRight',
};

const BELL_UP = new Vector3(0, 1, 0);

export interface NozzleSet {
  readonly object: Group;
  readonly labels: ReadonlyMap<PartId, Object3D>;
  mouth(id: NozzleId): Object3D;
  setState(state: AssemblyState): void;
}

interface NozzleShapes {
  bell: BufferGeometry;
  collar: BufferGeometry;
  stem: BufferGeometry;
  cone: BufferGeometry;
}

interface NozzleLooks {
  body: Material;
  frost: Material;
  collar: Material;
  cone: Material;
}

interface Nozzle {
  object: Group;
  bell: Mesh;
  mouth: Object3D;
  cone: Mesh;
  looks: NozzleLooks;
}

function nozzleShapes(context: PartContext): NozzleShapes {
  const track = (geometry: BufferGeometry) => context.tracker.track(geometry);
  return {
    bell: track(bellGeometry()),
    collar: track(collarGeometry()),
    stem: track(stemGeometry()),
    cone: track(coneGeometry()),
  };
}

function nozzleLooks(context: PartContext, group: NozzlePartId): NozzleLooks {
  const { materials } = context;
  return {
    body: materials.get(group, GEAR_FINISHES.nozzleBody),
    frost: materials.get(group, GEAR_FINISHES.frost),
    collar: materials.get(group, GEAR_FINISHES.collar),
    cone: materials.get(group, CONE_FINISHES[group]),
  };
}

function addFeedStem(object: Group, id: NozzleId, shapes: NozzleShapes, looks: NozzleLooks): void {
  const length = nozzleReach(id) - BELL_LENGTH;
  if (length <= 0) return;
  const stem = new Mesh(shapes.stem, looks.body);
  stem.scale.y = length;
  object.add(stem);
}

function buildNozzle(id: NozzleId, shapes: NozzleShapes, looks: NozzleLooks): Nozzle {
  const reach = nozzleReach(id);
  const object = new Group();
  object.position.set(...drawnNozzleAt(id));
  object.quaternion.setFromUnitVectors(BELL_UP, new Vector3(...NOZZLES[id].dir).normalize());
  const bell = new Mesh(shapes.bell, looks.body);
  bell.name = id;
  const collar = new Mesh(shapes.collar, looks.collar);
  bell.position.y = reach - BELL_LENGTH;
  collar.position.y = bell.position.y;
  const mouth = anchorAt(object, 0, reach, 0);
  const cone = new Mesh(shapes.cone, looks.cone);
  cone.visible = false;
  mouth.add(cone);
  object.add(bell, collar);
  addFeedStem(object, id, shapes, looks);
  return { object, bell, mouth, cone, looks };
}

function labelAnchor(nozzle: Nozzle, id: NozzleId): Object3D {
  return anchorAt(nozzle.object, 0, nozzleReach(id) - BELL_LENGTH / 2, 0);
}

function byGroup<T>(make: (group: NozzlePartId) => T): Record<NozzlePartId, T> {
  return {
    cornerNozzles: make('cornerNozzles'),
    frontNozzles: make('frontNozzles'),
    rearNozzles: make('rearNozzles'),
  };
}

export function createNozzles(context: PartContext): NozzleSet {
  const shapes = nozzleShapes(context);
  const looks = byGroup((group) => nozzleLooks(context, group));
  const groups = byGroup(() => new Group());
  const nozzles = Object.fromEntries(
    NOZZLE_IDS.map((id) => [id, buildNozzle(id, shapes, looks[NOZZLE_PARTS[id]])]),
  ) as Record<NozzleId, Nozzle>;
  NOZZLE_IDS.forEach((id) => groups[NOZZLE_PARTS[id]].add(nozzles[id].object));
  const object = new Group();
  object.add(...Object.values(groups));
  const labels = new Map<PartId, Object3D>(
    Object.entries(LABELLED).map(([group, id]) => [
      group as NozzlePartId,
      labelAnchor(nozzles[id], id),
    ]),
  );
  return {
    object,
    labels,
    mouth: (id) => nozzles[id].mouth,
    setState(state) {
      NOZZLE_IDS.forEach((id) => {
        const nozzle = nozzles[id];
        nozzle.bell.material = state.nozzles[id] > 0 ? nozzle.looks.frost : nozzle.looks.body;
        nozzle.cone.visible = state.view.nozzles;
      });
    },
  };
}
