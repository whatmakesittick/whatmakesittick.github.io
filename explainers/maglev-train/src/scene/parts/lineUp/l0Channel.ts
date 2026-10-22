import { BoxGeometry, ExtrudeGeometry, Matrix4 } from 'three';
import type { Object3D } from 'three';
import { roundedRectHole, roundedRectShape } from '@core/scene/geometry/extrude';
import { SIDE_SIGNS } from '../../../model';
import type { PartContext } from '../context';
import { L0, SLICE } from './constants';
import { cutMesh, instances, sliceGeometry } from './cut';
import { LINE_UP_FINISHES } from './finishes';
import { centresAlong, mirrorOutline, wallOutline } from './layout';

const PART = 'scmaglev';
const COIL_CURVE_SEGMENTS = 3;

function addWalls(context: PartContext, parent: Object3D): void {
  const { face, thickness, height, chamfer } = L0.wall;
  const right = wallOutline(face, thickness, L0.floor, height, chamfer);
  const geometry = sliceGeometry([right, mirrorOutline(right)]);
  parent.add(
    cutMesh(context, geometry, PART, LINE_UP_FINISHES.channel, LINE_UP_FINISHES.channelCap),
  );
}

function loopGeometry(): ExtrudeGeometry {
  const { length, loopHeight, loopRadius, loopBand, levitation } = L0.coils;
  const outer = {
    minA: -length / 2,
    maxA: length / 2,
    minB: -loopHeight / 2,
    maxB: loopHeight / 2,
  };
  const inner = {
    minA: outer.minA + loopBand,
    maxA: outer.maxA - loopBand,
    minB: outer.minB + loopBand,
    maxB: outer.maxB - loopBand,
  };
  const shape = roundedRectShape(outer, loopRadius);
  shape.holes.push(roundedRectHole(inner, Math.max(loopRadius - loopBand, 0)));
  return new ExtrudeGeometry(shape, {
    depth: levitation,
    bevelEnabled: false,
    curveSegments: COIL_CURVE_SEGMENTS,
  });
}

function loopMatrices(): Matrix4[] {
  const { pitch, face, levitation, nullHeight, loopHeight, loopGap } = L0.coils;
  const reach = loopHeight / 2 + loopGap / 2;
  const heights = [nullHeight - reach, nullHeight + reach];
  return centresAlong(SLICE.start, SLICE.end, pitch).flatMap((x) =>
    heights.flatMap((height) =>
      SIDE_SIGNS.map((side) =>
        new Matrix4().makeTranslation(x, L0.floor + height, side > 0 ? face : -face - levitation),
      ),
    ),
  );
}

function propulsionMatrices(): Matrix4[] {
  const { pitch, face, levitation, propulsion, propulsionFrom, propulsionTo } = L0.coils;
  const a = face + levitation + propulsion / 2;
  const y = L0.floor + (propulsionFrom + propulsionTo) / 2;
  return centresAlong(SLICE.start, SLICE.end, pitch).flatMap((x) =>
    SIDE_SIGNS.map((side) => new Matrix4().makeTranslation(x, y, side * a)),
  );
}

function addCoils(context: PartContext, parent: Object3D): void {
  const { length, propulsion, propulsionFrom, propulsionTo } = L0.coils;
  const box = new BoxGeometry(length, propulsionTo - propulsionFrom, propulsion);
  parent.add(
    instances(context, loopGeometry(), PART, LINE_UP_FINISHES.levitationCoil, loopMatrices()),
  );
  parent.add(instances(context, box, PART, LINE_UP_FINISHES.propulsionCoil, propulsionMatrices()));
}

export function buildL0Channel(context: PartContext, parent: Object3D): void {
  addWalls(context, parent);
  addCoils(context, parent);
}
