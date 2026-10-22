import type { BufferGeometry } from 'three';
import type { Extent } from '@core/scene/regions';
import type { AssemblyState } from '../../../../../ids';
import { LINE_DRAW } from '../../../../constants';
import { lineX } from '../../../../pose';
import { label, namedGroup, partMesh } from '../../../context';
import type { PartContext, Section } from '../../../context';
import { RAIL, TRACK_Z } from '../constants';
import { mergeParts } from '../../../line/geometry';
import { overlaps } from '../../../line/slots';
import { trainBody } from './body';
import { bogie } from './bogies';
import { BODY, CONSIST } from './constants';
import { bogieCentres, carSpans, pantographs } from './layout';
import type { CarSpan } from './layout';
import { ghostOutline } from './outline';
import { pantograph } from './pantograph';

const DRAWN: Extent = [-LINE_DRAW.behind, LINE_DRAW.ahead];

function trainGeometry(cars: readonly CarSpan[]): BufferGeometry {
  return mergeParts([
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
      root.visible = state.view.ghost && overlaps(x, CONSIST.length / 2, DRAWN);
    },
  };
}
