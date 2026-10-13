import { CylinderGeometry, Group } from 'three';
import type { BufferGeometry, Mesh, Object3D } from 'three';
import { toRadians } from '@core/math';
import { box } from '@core/scene/geometry/box';
import type { AssemblyState } from '../../ids';
import { BAR_PLANE_Z, CHAIN_PATH, CRANK_Y, SPROCKET_TEETH } from '../../model';
import { CLUTCH } from '../constants';
import { mergeParts } from '../geometry/merge';
import { extrudeAlongZ, starShape, tubeThrough } from '../geometry/profile';
import { sectorAroundZ } from '../geometry/sector';
import type { Vec3 } from '../geometry/builder';
import { Ease } from './ease';
import { addPart, label, namedGroup } from './context';
import type { PartContext, Section } from './context';

const ROUND = 24;
const PUMP = { x: 0.03, y: 0.068, z: 0.064 } as const;
const OIL_LINE: readonly Vec3[] = [
  [PUMP.x + 0.006, PUMP.y + 0.004, PUMP.z + 0.006],
  [0.046, 0.078, 0.078],
  [0.056, 0.092, BAR_PLANE_Z - 0.003],
];
const WORM_TURNS_PER_DRUM = 3;
const [DRUM_FROM, DRUM_TO] = CLUTCH.drumZ;
const [FACE_FROM, FACE_TO] = CLUTCH.faceZ;
const [SHOE_FROM, SHOE_TO] = CLUTCH.shoeZ;
const [BAND_FROM, BAND_TO] = CLUTCH.bandZ;
const [GAP_FROM, GAP_TO] = CLUTCH.bandGapDeg;

function zCylinder(
  radius: number,
  from: number,
  to: number,
  x = 0,
  y = 0,
  segments = ROUND,
): BufferGeometry {
  const geometry = new CylinderGeometry(radius, radius, to - from, segments);
  geometry.rotateX(Math.PI / 2);
  geometry.translate(x, y, (from + to) / 2);
  return geometry;
}

function shoe(centreDeg: number, lining: boolean): BufferGeometry {
  const half = CLUTCH.shoeSpanDeg / 2;
  const edge = CLUTCH.shoeOuter - CLUTCH.liningDepth;
  return sectorAroundZ({
    inner: lining ? edge : CLUTCH.shoeInner,
    outer: lining ? CLUTCH.shoeOuter : edge,
    bottom: SHOE_FROM,
    top: SHOE_TO,
    fromDeg: centreDeg - half,
    toDeg: centreDeg + half,
  });
}

function sprocket(): BufferGeometry {
  const teeth = starShape(
    SPROCKET_TEETH,
    CLUTCH.sprocketTip,
    CLUTCH.sprocketRoot,
    CHAIN_PATH.sprocketLeave,
  );
  return mergeParts([
    extrudeAlongZ(
      teeth,
      { from: BAR_PLANE_Z - CLUTCH.sprocketHalf, to: BAR_PLANE_Z + CLUTCH.sprocketHalf },
      0.0006,
    ),
    sectorAroundZ({
      inner: 0.006,
      outer: 0.014,
      bottom: FACE_FROM,
      top: BAR_PLANE_Z + CLUTCH.sprocketHalf + 0.0012,
      fromDeg: 0,
      toDeg: 360,
    }),
  ]);
}

function band(): BufferGeometry {
  const lug = (deg: number) => {
    const angle = toRadians(deg);
    const radius = CLUTCH.bandOuter + 0.003;
    const x = radius * Math.cos(angle);
    const y = radius * Math.sin(angle);
    return box({
      minX: x - 0.003,
      maxX: x + 0.003,
      minY: y - 0.003,
      maxY: y + 0.003,
      minZ: BAND_FROM,
      maxZ: BAND_TO,
    });
  };
  return mergeParts([
    sectorAroundZ({
      inner: CLUTCH.bandInner,
      outer: CLUTCH.bandOuter,
      bottom: BAND_FROM,
      top: BAND_TO,
      fromDeg: GAP_TO,
      toDeg: GAP_FROM + 360,
    }),
    lug(GAP_TO + 3),
    lug(GAP_FROM - 3),
  ]);
}

function pumpBody(): BufferGeometry {
  return box({
    minX: PUMP.x - 0.009,
    maxX: PUMP.x + 0.009,
    minY: PUMP.y - 0.006,
    maxY: PUMP.y + 0.006,
    minZ: PUMP.z - 0.006,
    maxZ: PUMP.z + 0.004,
  });
}

function worm(): BufferGeometry {
  const geometry = mergeParts([
    zCylinder(0.0042, -0.003, 0.003, 0, 0, 8),
    box({ minX: -0.0055, maxX: 0.0055, minY: -0.001, maxY: 0.001, minZ: -0.0032, maxZ: 0.0032 }),
  ]);
  return geometry;
}

export function buildClutch(context: PartContext, parent: Object3D): Section {
  const root = namedGroup('clutchAssembly', parent);
  root.position.set(0, CRANK_Y, 0);

  const hub = namedGroup('clutchHub', root);
  addPart(context, hub, zCylinder(CLUTCH.hub, DRUM_FROM, SHOE_TO + 0.003, 0, 0, 6), 'clutch');
  const shoes = Array.from({ length: CLUTCH.shoeCount }, (_, index) => {
    const centreDeg = 90 + (360 / CLUTCH.shoeCount) * index;
    const group = new Group();
    hub.add(group);
    addPart(context, group, shoe(centreDeg, false), 'clutch');
    addPart(context, group, shoe(centreDeg, true), 'clutch', 'lining');
    return { group, angle: toRadians(centreDeg) };
  });
  label(context, 'clutch', root, [-0.016, 0.014, SHOE_TO]);

  const drum = namedGroup('clutchDrum', root);
  addPart(
    context,
    drum,
    sectorAroundZ({
      inner: CLUTCH.drumInner,
      outer: 0.035,
      bottom: DRUM_FROM,
      top: DRUM_TO,
      fromDeg: 0,
      toDeg: 360,
    }),
    'clutchDrum',
  );
  const face = addPart(
    context,
    drum,
    sectorAroundZ({
      inner: 0.006,
      outer: 0.035,
      bottom: FACE_FROM - 0.0005,
      top: FACE_TO,
      fromDeg: 0,
      toDeg: 360,
    }),
    'clutchDrum',
  );
  addPart(context, drum, sprocket(), 'sprocket');
  label(context, 'clutchDrum', root, [0.026, 0.023, DRUM_TO]);
  label(context, 'sprocket', root, [0, 0, BAR_PLANE_Z + CLUTCH.sprocketHalf + 0.0012]);

  const bandGroup = namedGroup('brakeBand', root);
  const loose = addPart(context, bandGroup, band(), 'chainBrakeBand');
  const tight: Mesh = addPart(context, bandGroup, band(), 'chainBrakeBand', 'bandOn');
  label(context, 'chainBrakeBand', bandGroup, [-0.026, -0.026, BAND_TO]);

  const pump = namedGroup('oilPump', parent);
  addPart(context, pump, pumpBody(), 'oilPump');
  addPart(context, pump, tubeThrough(OIL_LINE, 0.0016), 'oilPump', 'pulseLine');
  const wormGroup = namedGroup('worm', pump);
  wormGroup.position.set(PUMP.x, PUMP.y + 0.008, PUMP.z + 0.004);
  addPart(context, wormGroup, worm(), 'oilPump', 'steel');
  label(context, 'oilPump', pump, [PUMP.x, PUMP.y, PUMP.z + 0.004]);

  const out = new Ease(0);
  const grip = new Ease(0);
  const pose = () => {
    shoes.forEach(({ group, angle }) => {
      const travel = CLUTCH.shoeTravel * out.value;
      group.position.set(travel * Math.cos(angle), travel * Math.sin(angle), 0);
    });
    const squeeze = 1 + (CLUTCH.bandGrip - 1) * grip.value;
    bandGroup.scale.set(squeeze, squeeze, 1);
  };
  return {
    root,
    setState: (state: AssemblyState) => {
      hub.rotation.z = -toRadians(state.crank.angle);
      const drumAngle = -toRadians(state.drive.drumDeg);
      drum.rotation.z = drumAngle;
      wormGroup.rotation.z = drumAngle * WORM_TURNS_PER_DRUM;
      face.visible = !state.view.cutaway;
      tight.visible = state.safety.brake;
      loose.visible = !state.safety.brake;
      out.aim(state.drive.shoesOut);
      grip.aim(state.safety.brake ? 1 : 0);
      pose();
    },
    update: (deltaSeconds: number) => {
      out.step(deltaSeconds);
      grip.step(deltaSeconds);
      pose();
      return out.running || grip.running;
    },
  };
}
