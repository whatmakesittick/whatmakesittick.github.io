import { Color } from 'three';
import type { BufferGeometry } from 'three';
import { SIDE_SIGNS } from '../../../../../model';
import { BED, RAIL } from '../constants';
import { TRACK_TONES } from '../finishes';
import { QuadSink } from '../geometry/quads';
import type { BoxFace, Bounds } from '../geometry/quads';
import { BASEPLATE, SLEEPER, TRACK_PERIOD } from './constants';
import { evenCentres } from './slots';

const SIDES: readonly BoxFace[] = ['top', 'minX', 'maxX'];
const TOP_ONLY: readonly BoxFace[] = ['top'];

function sleeperBounds(x: number): Bounds {
  return {
    minX: x - SLEEPER.width / 2,
    maxX: x + SLEEPER.width / 2,
    minY: BED.ballastTop - SLEEPER.buried,
    maxY: BED.sleeperTop,
    minZ: -SLEEPER.length / 2,
    maxZ: SLEEPER.length / 2,
  };
}

function baseplateBounds(x: number, side: number): Bounds {
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
  evenCentres(SLEEPER.perPeriod, TRACK_PERIOD).forEach((x) => addSleeper(sink, x));
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

export function farSleepers(): BufferGeometry {
  const concrete = new Color(TRACK_TONES.sleeper);
  return rack((sink, x) => sink.addBox(sleeperBounds(x), TOP_ONLY, concrete));
}
