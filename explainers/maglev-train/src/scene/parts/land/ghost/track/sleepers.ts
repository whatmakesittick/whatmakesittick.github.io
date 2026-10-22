import { Color } from 'three';
import type { BufferGeometry } from 'three';
import { SIDE_SIGNS } from '../../../../../model';
import { BED, RAIL } from '../constants';
import { TRACK_TONES } from '../finishes';
import type { BoxBounds } from '@core/scene/geometry/box';
import { evenlySpaced } from '../../../line/geometry';
import { QuadSink } from '../geometry/quads';
import type { BoxFace } from '../geometry/quads';
import { BASEPLATE, SLEEPER, TRACK_PERIOD } from './constants';

const SIDES: readonly BoxFace[] = ['top', 'minX', 'maxX'];
const TOP_ONLY: readonly BoxFace[] = ['top'];

function sleeperBounds(x: number): BoxBounds {
  return {
    minX: x - SLEEPER.width / 2,
    maxX: x + SLEEPER.width / 2,
    minY: BED.ballastTop - SLEEPER.buried,
    maxY: BED.sleeperTop,
    minZ: -SLEEPER.length / 2,
    maxZ: SLEEPER.length / 2,
  };
}

function baseplateBounds(x: number, side: number): BoxBounds {
  const z = side * RAIL.centreZ;
  return {
    minX: x - BASEPLATE.length / 2,
    maxX: x + BASEPLATE.length / 2,
    minY: BED.sleeperTop,
    maxY: BED.railFoot,
    minZ: z - BASEPLATE.width / 2,
    maxZ: z + BASEPLATE.width / 2,
  };
}

function rack(addSleeper: (sink: QuadSink, x: number) => void): BufferGeometry {
  const sink = new QuadSink();
  evenlySpaced(SLEEPER.perPeriod, 0, TRACK_PERIOD).forEach((x) => addSleeper(sink, x));
  return sink.geometry();
}

export function nearSleepers(): BufferGeometry {
  const concrete = new Color(TRACK_TONES.sleeper);
  const plate = new Color(TRACK_TONES.baseplate);
  return rack((sink, x) => {
    sink.addBox(sleeperBounds(x), SIDES, concrete);
    SIDE_SIGNS.forEach((side) => sink.addBox(baseplateBounds(x, side), SIDES, plate));
  });
}

function plateShare(): number {
  const plates = SIDE_SIGNS.length * BASEPLATE.length * BASEPLATE.width;
  return plates / (SLEEPER.length * SLEEPER.width);
}

export function farSleepers(): BufferGeometry {
  const plate = new Color(TRACK_TONES.baseplate);
  const seen = new Color(TRACK_TONES.sleeper).lerp(plate, plateShare());
  return rack((sink, x) => sink.addBox(sleeperBounds(x), TOP_ONLY, seen));
}
