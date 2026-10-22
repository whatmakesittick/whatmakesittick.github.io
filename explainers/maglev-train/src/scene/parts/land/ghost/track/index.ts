import { InstancedMesh, Matrix4 } from 'three';
import type { BufferGeometry, Mesh } from 'three';
import type { AssemblyState } from '../../../../../ids';
import { SIDE_SIGNS } from '../../../../../model';
import { wrapOffset } from '../../../../pose';
import { LINE_GROUP, finishMesh, namedGroup } from '../../../context';
import type { PartContext, Section } from '../../../context';
import { BED, RAIL, TRACK_Z } from '../constants';
import { TRACK_FINISHES } from '../finishes';
import { merged } from '../geometry/merge';
import { mirrored, profileStrip, shifted } from '../geometry/strip';
import { RACK_REACH, STRIP_SPAN, TRACK_PERIOD } from './constants';
import { BALLAST_HALF_PROFILE, RAIL_HALF_PROFILE } from './profiles';
import { gravelTexture } from './gravel';
import { farRack, nearRack } from './racks';
import { slotRange, slotsOf } from './slots';
import { catenaryWires } from './wires';

const NEAR_SLOTS = slotRange(RACK_REACH.near, TRACK_PERIOD);
const FAR_SLOTS = slotRange(RACK_REACH.far, TRACK_PERIOD);

function ballast(context: PartContext): Mesh {
  const geometry = profileStrip(mirrored(BALLAST_HALF_PROFILE), STRIP_SPAN, true);
  const map = context.tracker.track(gravelTexture());
  return finishMesh(context, geometry, LINE_GROUP, { ...TRACK_FINISHES.ballast, map });
}

function rails(context: PartContext): Mesh {
  const profile = mirrored(RAIL_HALF_PROFILE);
  const strips = SIDE_SIGNS.map((side) =>
    profileStrip(shifted(profile, side * RAIL.centreZ, BED.railFoot), STRIP_SPAN),
  );
  return finishMesh(context, merged(strips), LINE_GROUP, TRACK_FINISHES.rails);
}

function racks(context: PartContext, geometry: BufferGeometry, slots: readonly number[]) {
  const material = context.materials.get(LINE_GROUP, TRACK_FINISHES.trackside);
  const mesh = new InstancedMesh(context.tracker.track(geometry), material, slots.length);
  const matrix = new Matrix4();
  slots.forEach((slot, index) =>
    mesh.setMatrixAt(index, matrix.makeTranslation(slot * TRACK_PERIOD, 0, 0)),
  );
  return context.tracker.track(mesh);
}

export function buildTrack(context: PartContext): Section {
  const root = namedGroup('ghostTrack');
  root.position.z = TRACK_Z;
  const stream = namedGroup('ghostTrackStream', root);
  stream.add(
    ballast(context),
    rails(context),
    racks(context, nearRack(), slotsOf(NEAR_SLOTS)),
    racks(context, farRack(), slotsOf(FAR_SLOTS, NEAR_SLOTS)),
    catenaryWires(context, FAR_SLOTS),
  );
  return {
    root,
    setState(state: AssemblyState) {
      stream.position.x = wrapOffset(state.motion.distance, TRACK_PERIOD);
    },
  };
}
