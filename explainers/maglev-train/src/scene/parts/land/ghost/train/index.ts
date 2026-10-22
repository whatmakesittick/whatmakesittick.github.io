import type { BufferGeometry } from 'three';
import type { AssemblyState } from '../../../../../ids';
import { LINE_DRAW } from '../../../../constants';
import { lineX } from '../../../../pose';
import { label, namedGroup, partMesh } from '../../../context';
import type { PartContext, Section } from '../../../context';
import { RAIL, TRACK_Z } from '../constants';
import { merged } from '../geometry/merge';
import { trainBody } from './body';
import { bogie } from './bogies';
import { BODY, CONSIST } from './constants';
import { bogieCentres, carSpans, pantographs } from './layout';
import type { CarSpan } from './layout';
import { ghostOutline } from './outline';
import { pantograph } from './pantograph';
import { isWithinWindow } from './window';

function trainGeometry(cars: readonly CarSpan[]): BufferGeometry {
  return merged([
    trainBody(),
    ...cars.flatMap((car) => bogieCentres(car).flatMap(bogie)),
    ...pantographs(cars).flatMap(pantograph),
  ]);
}

export function buildGhostTrain(context: PartContext): Section {
  const root = namedGroup('ghostTrain');
  const cars = carSpans();
  root.add(partMesh(context, trainGeometry(cars), 'ghostTrain'), ghostOutline(context, cars));
  root.position.set(0, RAIL.top, TRACK_Z);
  label(context, 'ghostTrain', root, [0, BODY.top, 0]);
  return {
    root,
    setState(state: AssemblyState) {
      const x = lineX(state.ghost.distance, state.motion.distance);
      root.position.x = x;
      root.visible = state.view.ghost && isWithinWindow(x, CONSIST.length, LINE_DRAW);
    },
  };
}
