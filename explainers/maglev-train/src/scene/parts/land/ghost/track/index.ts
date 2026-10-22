import { Matrix4 } from 'three';
import type { BufferGeometry, InstancedMesh, Mesh } from 'three';
import type { AssemblyState } from '../../../../../ids';
import { SIDE_SIGNS } from '../../../../../model';
import { wrapOffset } from '../../../../pose';
import { LINE_GROUP, finishMesh, namedGroup } from '../../../context';
import type { PartContext, Section } from '../../../context';
import { BED, RAIL, TRACK_Z } from '../constants';
import { TRACK_FINISHES } from '../finishes';
import { mergeParts } from '../../../line/geometry';
import { slotIndices } from '../../../line/slots';
import { instances } from '../../../lineUp/cut';
import { mirrored, profileStrip, shifted } from '../geometry/strip';
import { RACK_REACH, STRIP_SPAN, TRACK_PERIOD } from './constants';
import { gravelTexture } from './gravel';
import { BALLAST_HALF_PROFILE, RAIL_HALF_PROFILE } from './profiles';
import { farRack, nearRack } from './racks';
import { catenaryWires } from './wires';

const NEAR_SLOTS = slotIndices(TRACK_PERIOD, RACK_REACH.near, RACK_REACH.near);
const FAR_SLOTS = slotIndices(TRACK_PERIOD, RACK_REACH.far, RACK_REACH.far);
const OUTER_SLOTS = FAR_SLOTS.filter((slot) => !NEAR_SLOTS.includes(slot));

function ballast(context: PartContext): Mesh {
  const geometry = profileStrip(mirrored(BALLAST_HALF_PROFILE), STRIP_SPAN, true);
  const map = context.tracker.track(gravelTexture());
  const mesh = finishMesh(context, geometry, LINE_GROUP, { ...TRACK_FINISHES.ballast, map });
  mesh.name = 'ghostBallast';
  return mesh;
}

function rails(context: PartContext): Mesh {
  const profile = mirrored(RAIL_HALF_PROFILE);
  const strips = SIDE_SIGNS.map((side) =>
    profileStrip(shifted(profile, side * RAIL.centreZ, BED.railFoot), STRIP_SPAN),
  );
  const mesh = finishMesh(context, mergeParts(strips), LINE_GROUP, TRACK_FINISHES.rails);
  mesh.name = 'ghostRails';
  return mesh;
}

function racks(
  context: PartContext,
  name: string,
  geometry: BufferGeometry,
  slots: readonly number[],
): InstancedMesh {
  const matrices = slots.map((slot) => new Matrix4().makeTranslation(slot * TRACK_PERIOD, 0, 0));
  const mesh = instances(context, geometry, LINE_GROUP, TRACK_FINISHES.trackside, matrices);
  mesh.name = name;
  return mesh;
}

export function buildTrack(context: PartContext): Section {
  const root = namedGroup('ghostTrack');
  root.position.z = TRACK_Z;
  const stream = namedGroup('ghostTrackStream', root);
  stream.add(
    ballast(context),
    rails(context),
    racks(context, 'ghostRacksNear', nearRack(), NEAR_SLOTS),
    racks(context, 'ghostRacksFar', farRack(), OUTER_SLOTS),
    catenaryWires(context, FAR_SLOTS),
  );
  return {
    root,
    setState(state: AssemblyState) {
      stream.position.x = wrapOffset(state.motion.distance, TRACK_PERIOD);
    },
  };
}
