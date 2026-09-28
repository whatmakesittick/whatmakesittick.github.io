import { Vector3 } from 'three';
import { DRILL_FLOOR_Y } from '../../model/scale';
import { DRILL_FLOOR, FLARE } from '../constants';

const DECK_LIFT = 0.8;

export function flareTipPoint(): Vector3 {
  const [x, y, z] = FLARE.base;
  const reach = FLARE.length + FLARE.burnerLength;
  const horizontal = reach * Math.cos(FLARE.pitch);
  return new Vector3(
    x + horizontal * Math.cos(FLARE.yaw),
    y + reach * Math.sin(FLARE.pitch),
    z - horizontal * Math.sin(FLARE.yaw),
  );
}

export function testLineRoute(): Vector3[] {
  const [x, y, z] = FLARE.base;
  const deckY = DRILL_FLOOR_Y + DECK_LIFT;
  return [
    new Vector3(0, deckY, 0),
    new Vector3(-DRILL_FLOOR.halfX, deckY, -DRILL_FLOOR.halfZ),
    new Vector3(x, y, z),
    flareTipPoint(),
  ];
}
