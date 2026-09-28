import { Group, Vector2 } from 'three';
import type { BufferGeometry, Mesh, Object3D } from 'three';
import { FULL_TURN } from '@core/math';
import { latheAlongX } from '@core/scene/geometry/lathe';
import { anchorAt } from '@core/scene/parts';
import { ARM, KNOBS, SEGMENTS } from '../constants';
import { partMesh } from './context';
import type { PartContext } from './context';

export interface FocusKnobsPart {
  object: Group;
  anchor: Object3D;
  setFocus(micrometres: number): void;
}

const EDGE_SHARE = 0.18;
const MIRROR = -1;

function knobGeometry(radius: number, width: number, start: number): BufferGeometry {
  const edge = width * EDGE_SHARE;
  const profile = [
    new Vector2(0, 0),
    new Vector2(radius - edge, 0),
    new Vector2(radius, edge),
    new Vector2(radius, width - edge),
    new Vector2(radius - edge, width),
    new Vector2(0, width),
  ];
  return latheAlongX(profile, SEGMENTS.knob).translate(start, 0, 0);
}

function knobPair(context: PartContext): { side: Group; fine: Mesh } {
  const coarse = partMesh(
    context,
    knobGeometry(KNOBS.coarse.radius, KNOBS.coarse.width, 0),
    'focusKnob',
    'rubber',
  );
  const fine = partMesh(
    context,
    knobGeometry(KNOBS.fine.radius, KNOBS.fine.width, KNOBS.coarse.width),
    'focusKnob',
    'steel',
  );
  const side = new Group();
  side.position.x = ARM.halfWidth;
  side.add(coarse, fine);
  return { side, fine };
}

export function createFocusKnobs(context: PartContext): FocusKnobsPart {
  const near = knobPair(context);
  const far = knobPair(context);
  const farSide = new Group();
  farSide.scale.x = MIRROR;
  farSide.add(far.side);
  const object = new Group();
  object.position.set(0, KNOBS.height, KNOBS.z);
  object.add(near.side, farSide);
  const outerFace = ARM.halfWidth + KNOBS.coarse.width + KNOBS.fine.width;
  return {
    object,
    anchor: anchorAt(object, outerFace, 0, 0),
    setFocus: (micrometres) => {
      const turn = (micrometres / KNOBS.finePerTurnUm) * FULL_TURN;
      near.fine.rotation.x = turn;
      far.fine.rotation.x = turn;
    },
  };
}
