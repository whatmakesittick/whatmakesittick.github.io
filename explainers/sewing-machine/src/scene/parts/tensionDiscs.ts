import type { Object3D } from 'three';
import { Group } from 'three';
import { toRadians } from '@core/math';
import { STRUCTURE_GROUP } from '@core/scene/materials';
import { anchorAt } from '@core/scene/parts';
import { TENSIONS } from '../../model';
import type { Tension } from '../../model';
import { HEAD, TENSION } from '../constants';
import { box, cylinderAlongZ } from '../geometry/primitives';
import { partMesh } from './context';
import type { PartContext } from './context';

export interface TensionDiscsPart {
  object: Group;
  labelAnchor: Object3D;
  setTension(tension: Tension): void;
}

const BALANCED_INDEX = TENSIONS.indexOf('balanced');

export function createTensionDiscs(context: PartContext): TensionDiscsPart {
  const { face, discRadius, discThickness, gap, studRadius, knobRadius, knobDepth } = TENSION;
  const { ridgeWidth, ridgeDepth, labelReach } = TENSION;
  const object = new Group();
  object.position.set(TENSION.x, TENSION.y, 0);
  const firstDisc = face + discThickness;
  const secondDisc = firstDisc + gap;
  const knobStart = secondDisc + discThickness;
  const knobEnd = knobStart + knobDepth;
  const knob = new Group();
  knob.add(
    partMesh(context, cylinderAlongZ(knobRadius, knobStart, knobEnd), 'tensionDiscs', 'trim'),
    partMesh(
      context,
      box({
        minX: -ridgeWidth / 2,
        maxX: ridgeWidth / 2,
        minY: 0,
        maxY: knobRadius,
        minZ: knobEnd,
        maxZ: knobEnd + ridgeDepth,
      }),
      'tensionDiscs',
      'paint',
    ),
  );
  object.add(
    partMesh(
      context,
      cylinderAlongZ(TENSION.bossRadius, HEAD.front, face),
      STRUCTURE_GROUP,
      'trim',
    ),
    partMesh(context, cylinderAlongZ(studRadius, face, knobStart), 'tensionDiscs', 'steel'),
    partMesh(context, cylinderAlongZ(discRadius, face, firstDisc), 'tensionDiscs', 'chrome'),
    partMesh(context, cylinderAlongZ(discRadius, secondDisc, knobStart), 'tensionDiscs', 'chrome'),
    knob,
  );
  return {
    object,
    labelAnchor: anchorAt(object, discRadius * labelReach, discRadius * labelReach, knobStart),
    setTension: (tension) => {
      const steps = TENSIONS.indexOf(tension) - BALANCED_INDEX;
      knob.rotation.z = -toRadians(steps * TENSION.knobTurnDegrees);
    },
  };
}
