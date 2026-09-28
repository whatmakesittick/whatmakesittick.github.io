import type { Object3D } from 'three';
import { anchorAt } from '@core/scene/parts';
import { BANKING_PINS } from '../../../model/layout';
import { ANCHOR_LIFT_MM, BANKING_PIN, SEGMENTS } from '../../constants';
import { merge } from '../../geometry/merge';
import { disc } from '../../geometry/solids';
import { partMesh } from '../context';
import type { PartContext } from '../context';

export function createBankingPins(context: PartContext, frame: Object3D): Object3D {
  const { radius, span, collar } = BANKING_PIN;
  const pins = BANKING_PINS.flatMap((pin) => [
    disc({ ...pin, r: radius }, span, SEGMENTS.pin),
    disc({ ...pin, r: collar.radius }, [span[0], collar.top], SEGMENTS.pin),
  ]);
  frame.add(partMesh(context, merge(pins), 'bankingPins', 'brightSteel'));
  const [first] = BANKING_PINS;
  return anchorAt(frame, first.x, first.y, span[1] + ANCHOR_LIFT_MM);
}
