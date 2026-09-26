import {
  CylinderGeometry,
  Group,
  LatheGeometry,
  Object3D,
  QuadraticBezierCurve,
  TubeGeometry,
  Vector2,
} from 'three';
import type { BufferGeometry } from 'three';
import { HEAD, RADIAL_SEGMENTS, VALVE, VALVE_TRAIN } from '../constants';
import type { ValveDimensions } from '../dimensions';
import { HelixCurve } from '../geometry/helix';
import { withCreasedNormals } from '../geometry/prism';
import { axialCylinder, verticalCylinder } from '../geometry/primitives';
import type { EmphasisGroup } from '../finishes';
import { sharedMesh } from './context';
import type { PartContext } from './context';
import { valveTrainHeights } from './valveTrainLayout';

export interface ValveTrainPart {
  object: Group;
  labelAnchor: Object3D;
  setLift(lift: number): void;
}

const TULIP_SAMPLES = 10;
const SPRING_SEGMENTS_PER_COIL = 28;
const SPRING_WIRE_SEGMENTS = 8;
const RETAINER_TAPER = 0.7;
const LABEL_HEIGHT = 2;
const TRAIN_SEGMENTS = RADIAL_SEGMENTS / 2;

function valveProfile(headRadius: number, stemTop: number): Vector2[] {
  const seatTop = VALVE.marginHeight + VALVE.seatWidth;
  const tulip = new QuadraticBezierCurve(
    new Vector2(headRadius - VALVE.seatWidth, seatTop),
    new Vector2(VALVE.stemRadius, seatTop),
    new Vector2(VALVE.stemRadius, VALVE.tulipHeight),
  );
  return [
    new Vector2(0, 0),
    new Vector2(headRadius, 0),
    new Vector2(headRadius, VALVE.marginHeight),
    ...tulip.getPoints(TULIP_SAMPLES),
    new Vector2(VALVE.stemRadius, stemTop),
    new Vector2(0, stemTop),
  ];
}

interface ValveTrainGeometries {
  valve: BufferGeometry;
  retainer: BufferGeometry;
  tappet: BufferGeometry;
  roller: BufferGeometry;
  spring: BufferGeometry;
  washer: BufferGeometry;
}

function buildGeometries(context: PartContext, valve: ValveDimensions): ValveTrainGeometries {
  const heights = valveTrainHeights();
  const { tracker } = context;
  const retainer = new CylinderGeometry(
    VALVE_TRAIN.retainerRadius,
    VALVE_TRAIN.retainerRadius * RETAINER_TAPER,
    VALVE_TRAIN.retainerHeight,
    TRAIN_SEGMENTS,
  );
  const tappet = verticalCylinder(
    VALVE_TRAIN.tappetRadius,
    heights.stemTop,
    heights.tappetTop,
    TRAIN_SEGMENTS,
  );
  const roller = axialCylinder(VALVE_TRAIN.rollerRadius, VALVE_TRAIN.rollerWidth, TRAIN_SEGMENTS);
  const helix = new HelixCurve(
    VALVE_TRAIN.springMeanRadius,
    VALVE_TRAIN.springRestLength,
    VALVE_TRAIN.springCoils,
  );
  const spring = new TubeGeometry(
    helix,
    Math.ceil(VALVE_TRAIN.springCoils * SPRING_SEGMENTS_PER_COIL),
    VALVE_TRAIN.springWireRadius,
    SPRING_WIRE_SEGMENTS,
  );
  const washer = verticalCylinder(
    VALVE.seatWasherRadius,
    HEAD.deckHeight,
    heights.springBase,
    TRAIN_SEGMENTS,
  );
  const valveLathe = new LatheGeometry(
    valveProfile(valve.headRadius, heights.stemTop),
    RADIAL_SEGMENTS,
  );
  return {
    valve: tracker.track(withCreasedNormals(valveLathe)),
    retainer: tracker.track(retainer),
    tappet: tracker.track(tappet),
    roller: tracker.track(roller),
    spring: tracker.track(spring),
    washer: tracker.track(washer),
  };
}

function movingAssembly(
  context: PartContext,
  geometries: ValveTrainGeometries,
  group: EmphasisGroup,
): Group {
  const heights = valveTrainHeights();
  const moving = new Group();
  moving.add(sharedMesh(context, geometries.valve, group, 'polished'));
  const retainer = sharedMesh(context, geometries.retainer, group, 'forged');
  retainer.position.y = heights.retainerBottom + VALVE_TRAIN.retainerHeight / 2;
  const tappet = sharedMesh(context, geometries.tappet, group, 'forged');
  const roller = sharedMesh(context, geometries.roller, group, 'polished');
  roller.position.y = heights.rollerCenter;
  moving.add(retainer, tappet, roller);
  return moving;
}

export function valveTrainFactory(
  context: PartContext,
  valve: ValveDimensions,
  group: EmphasisGroup,
): (z: number) => ValveTrainPart {
  const geometries = buildGeometries(context, valve);
  const heights = valveTrainHeights();
  const restLength = VALVE_TRAIN.springRestLength;
  return (z) => {
    const object = new Group();
    object.position.set(valve.sign * valve.offset, 0, z);
    const moving = movingAssembly(context, geometries, group);
    const spring = sharedMesh(context, geometries.spring, group, 'spring');
    spring.position.y = heights.springBase;
    const washer = sharedMesh(context, geometries.washer, group, 'forged');
    object.add(moving, spring, washer);
    const labelAnchor = new Object3D();
    labelAnchor.position.set(valve.sign * valve.headRadius, LABEL_HEIGHT, 0);
    moving.add(labelAnchor);
    return {
      object,
      labelAnchor,
      setLift: (lift) => {
        moving.position.y = -lift;
        spring.scale.y = (restLength - lift) / restLength;
      },
    };
  };
}
