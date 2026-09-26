import { Group, Object3D, Shape } from 'three';
import type { BufferGeometry } from 'three';
import { camAngle, exhaustLift, intakeLift, toRadians } from '../../model';
import { RADIAL_SEGMENTS, STRUCTURE, VALVE_TRAIN } from '../constants';
import type { ValveDimensions } from '../dimensions';
import { camProfile } from '../geometry/camProfile';
import { extrudeBetween } from '../geometry/prism';
import { axialCylinder } from '../geometry/primitives';
import { PLANE_FRAME } from '../layout';
import type { EmphasisGroup } from '../finishes';
import { hasOpenFront, partMesh, sharedMesh } from './context';
import type { PartContext } from './context';
import { valveTrainHeights } from './valveTrainLayout';

export interface CamshaftPart {
  object: Group;
  labelAnchor: Object3D;
  setAngle(engineAngle: number): void;
}

const CAM_DEGREES_PER_CRANK_DEGREE = 0.5;
const JOURNAL_SPACING = 20;
const CAM_SEGMENTS = RADIAL_SEGMENTS / 2;

function lobeGeometry(context: PartContext, valve: ValveDimensions): BufferGeometry {
  const { spec } = context;
  const liftAt =
    valve.side === 'intake'
      ? (angle: number) => intakeLift(angle, spec)
      : (angle: number) => exhaustLift(angle, spec);
  const profile = camProfile(liftAt, {
    baseRadius: VALVE_TRAIN.camBaseRadius,
    rollerRadius: VALVE_TRAIN.rollerRadius,
    samples: VALVE_TRAIN.camProfileSamples,
  });
  const half = VALVE_TRAIN.camLobeWidth / 2;
  return extrudeBetween(new Shape(profile), PLANE_FRAME, -half, half, {
    bevel: VALVE_TRAIN.camBevel,
  });
}

function shaftFront(context: PartContext): number {
  const { layout } = context;
  if (!hasOpenFront(context)) return layout.halfLength - STRUCTURE.wall / 2;
  const frontLobe = Math.max(...layout.cylinders.map((placement) => placement.z));
  return frontLobe + VALVE_TRAIN.camFrontOverhang;
}

export function createCamshaft(
  context: PartContext,
  valve: ValveDimensions,
  group: EmphasisGroup,
): CamshaftPart {
  const { layout, tracker } = context;
  const object = new Group();
  object.position.set(valve.sign * valve.offset, valveTrainHeights().camCenter, 0);
  const rotor = new Group();
  object.add(rotor);
  const rear = -layout.halfLength + STRUCTURE.wall / 2;
  const front = shaftFront(context);
  const shaft = partMesh(
    context,
    axialCylinder(VALVE_TRAIN.camShaftRadius, front - rear, CAM_SEGMENTS),
    group,
    'polished',
  );
  shaft.position.z = (front + rear) / 2;
  rotor.add(shaft);
  const lobe = tracker.track(lobeGeometry(context, valve));
  const journal = tracker.track(
    axialCylinder(VALVE_TRAIN.camJournalRadius, VALVE_TRAIN.camJournalWidth, CAM_SEGMENTS),
  );
  layout.cylinders.forEach(({ slot, z }) => {
    const lobeMesh = sharedMesh(context, lobe, group, 'polished');
    lobeMesh.position.z = z;
    lobeMesh.rotation.z = -toRadians(slot.phaseOffset * CAM_DEGREES_PER_CRANK_DEGREE);
    const journalMesh = sharedMesh(context, journal, group, 'forged');
    journalMesh.position.z = z - JOURNAL_SPACING;
    rotor.add(lobeMesh, journalMesh);
  });
  const labelAnchor = new Object3D();
  labelAnchor.position.set(valve.sign * VALVE_TRAIN.camBaseRadius, 0, layout.primaryCylinder.z);
  object.add(labelAnchor);
  return {
    object,
    labelAnchor,
    setAngle: (engineAngle) => {
      rotor.rotation.z = -toRadians(camAngle(engineAngle));
    },
  };
}
