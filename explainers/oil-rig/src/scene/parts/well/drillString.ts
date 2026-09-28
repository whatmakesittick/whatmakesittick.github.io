import {
  BufferAttribute,
  Color,
  CylinderGeometry,
  Group,
  Matrix4,
  Quaternion,
  Vector3,
} from 'three';
import type { BufferGeometry, InstancedMesh, Mesh, Object3D } from 'three';
import { FULL_TURN } from '@core/math';
import { anchorAt } from '@core/scene/parts';
import type { BitId } from '../../../ids';
import { tubularRadius } from '../../../model/scale';
import { STRING, SEGMENTS, TOP_DRIVE } from '../../constants';
import { PAINT } from '../../finishes';
import { barGeometry } from '../../geometry/bars';
import { mergePainted } from '../../geometry/merge';
import { holeAt, wellY } from '../../geometry/wellColumn';
import { instancedMesh, partMesh } from '../context';
import type { PartContext } from '../context';
import { BIT_HEIGHT, pdcBitGeometry, rollerConeBitGeometry } from './bits';

export interface StringPlacement {
  quillY: number;
  bitDepth: number;
  seaOffset: number;
}

const RGB = 3;
const STRIPE_TONE = '#d9dee2';
const BODY_TONE = '#8f989f';
const STABILIZER_BLADES = 3;
const STABILIZER_TWIST = 0.6;
const STABILIZER_WIDTH = 0.28;
const MAX_JOINTS = 220;
const PIPE_LABEL_ABOVE = 12;
const COLLAR_LABEL_SHARE = 0.5;
const TOP_OF_STAND = TOP_DRIVE.quillLow + STRING.standLength;

const PIPE_RADIUS = tubularRadius(STRING.pipeInches);
const JOINT_RADIUS = tubularRadius(STRING.toolJointInches);

function stripedPipe(): BufferGeometry {
  const pipe = new CylinderGeometry(
    PIPE_RADIUS,
    PIPE_RADIUS,
    1,
    SEGMENTS.pipe,
    1,
    true,
  ).toNonIndexed();
  pipe.translate(0, 1 / 2, 0);
  const position = pipe.getAttribute('position');
  const colors = new Float32Array(position.count * RGB);
  const body = new Color(BODY_TONE);
  const stripe = new Color(STRIPE_TONE);
  const facet = FULL_TURN / SEGMENTS.pipe;
  for (let index = 0; index < position.count; index++) {
    const triangle = Math.floor(index / RGB) * RGB;
    const angle = Math.atan2(position.getX(triangle), position.getZ(triangle));
    (angle >= 0 && angle < facet ? stripe : body).toArray(colors, index * RGB);
  }
  pipe.setAttribute('color', new BufferAttribute(colors, RGB));
  return pipe;
}

function unitCollar(): BufferGeometry {
  const collar = new CylinderGeometry(1, 1, 1, SEGMENTS.pipe);
  collar.translate(0, 1 / 2, 0);
  return collar;
}

function stabilizer(): BufferGeometry {
  const blades = Array.from({ length: STABILIZER_BLADES }, (_, index) => {
    const angle = (index / STABILIZER_BLADES) * FULL_TURN;
    const twisted = angle + STABILIZER_TWIST;
    return barGeometry(
      [Math.cos(angle), -1 / 2, Math.sin(angle)],
      [Math.cos(twisted), 1 / 2, Math.sin(twisted)],
      STABILIZER_WIDTH,
    );
  });
  const sleeve = new CylinderGeometry(1 - STABILIZER_WIDTH, 1 - STABILIZER_WIDTH, 1, SEGMENTS.pipe);
  return mergePainted([
    [sleeve, PAINT.darkSteel],
    ...blades.map((blade) => [blade, PAINT.steel] as const),
  ]);
}

function collarInches(holeInches: number): number {
  return holeInches < STRING.slimHoleInches ? STRING.slimCollarInches : STRING.collarInches;
}

export class DrillStringPart {
  readonly object = new Group();
  readonly anchors: { drillPipe: Object3D; drillCollars: Object3D; bit: Object3D };
  private readonly spinning = new Group();
  private readonly pipe: Mesh;
  private readonly collars: Mesh;
  private readonly joints: InstancedMesh;
  private readonly stabilizers: InstancedMesh;
  private readonly bit = new Group();
  private readonly bits: Record<BitId, Mesh>;
  private readonly matrix = new Matrix4();
  private readonly position = new Vector3();
  private readonly scale = new Vector3();
  private readonly turn = new Quaternion();

  constructor(context: PartContext) {
    this.pipe = partMesh(context, stripedPipe(), 'drillPipe', 'pipe');
    this.collars = partMesh(context, unitCollar(), 'drillCollars', 'collar');
    this.joints = instancedMesh(
      context,
      new CylinderGeometry(JOINT_RADIUS, JOINT_RADIUS, STRING.toolJointHeight, SEGMENTS.pipe),
      'drillPipe',
      'collar',
      MAX_JOINTS,
    );
    this.joints.frustumCulled = false;
    this.joints.count = 0;
    this.stabilizers = instancedMesh(
      context,
      stabilizer(),
      'drillCollars',
      'paintedMetal',
      STRING.stabilizerDepths.length,
    );
    this.stabilizers.frustumCulled = false;
    this.bits = {
      pdc: partMesh(context, pdcBitGeometry(), 'bit', 'bit'),
      rollerCone: partMesh(context, rollerConeBitGeometry(), 'bit', 'bit'),
    };
    this.bit.add(this.bits.pdc, this.bits.rollerCone);
    [this.pipe, this.collars].forEach((mesh) => (mesh.frustumCulled = false));
    this.spinning.add(this.pipe, this.collars, this.stabilizers);
    this.object.add(this.spinning, this.joints, this.bit);
    this.anchors = {
      drillPipe: new Group(),
      drillCollars: new Group(),
      bit: anchorAt(this.bit, 0, BIT_HEIGHT / 2, 1),
    };
    this.object.add(this.anchors.drillPipe, this.anchors.drillCollars);
  }

  setBit(id: BitId): void {
    this.bits.pdc.visible = id === 'pdc';
    this.bits.rollerCone.visible = id === 'rollerCone';
  }

  setVisible(visible: boolean): void {
    this.object.visible = visible;
  }

  place({ quillY, bitDepth, seaOffset }: StringPlacement): void {
    const hole = holeAt(bitDepth);
    const bitY = wellY(bitDepth, seaOffset);
    const bitTop = bitY + BIT_HEIGHT * hole.radius;
    const collarTop = Math.min(wellY(bitDepth - STRING.collarLength, seaOffset), quillY);
    const collarRadius = tubularRadius(collarInches(hole.section.holeInches));
    this.bit.position.y = bitY;
    this.bit.scale.setScalar(hole.radius);
    this.stretch(this.collars, bitTop, Math.max(collarTop, bitTop), collarRadius);
    this.stretch(this.pipe, Math.max(collarTop, bitTop), quillY, 1);
    this.placeStabilizers(bitDepth, seaOffset, hole.radius, bitTop, collarTop);
    this.placeJoints(bitDepth, seaOffset, quillY, collarTop);
    this.anchors.drillPipe.position.set(
      PIPE_RADIUS,
      Math.min(collarTop + PIPE_LABEL_ABOVE, quillY),
      PIPE_RADIUS,
    );
    this.anchors.drillCollars.position.set(
      collarRadius,
      bitTop + (collarTop - bitTop) * COLLAR_LABEL_SHARE,
      collarRadius,
    );
  }

  update(deltaSeconds: number): void {
    const step = FULL_TURN * STRING.turnsPerSecond * deltaSeconds;
    this.spinning.rotation.y += step;
    this.bit.rotation.y += step;
  }

  private stretch(mesh: Mesh, bottom: number, top: number, radius: number): void {
    const length = top - bottom;
    mesh.visible = length > 0;
    mesh.position.y = bottom;
    mesh.scale.set(radius, Math.max(length, Number.EPSILON), radius);
  }

  private placeStabilizers(
    bitDepth: number,
    offset: number,
    radius: number,
    low: number,
    high: number,
  ): void {
    const size = radius * STRING.stabilizerShare;
    STRING.stabilizerDepths.forEach((above, index) => {
      const y = wellY(bitDepth - above, offset);
      const inside = y > low && y < high;
      this.position.set(0, y, 0);
      this.scale.set(inside ? size : 0, inside ? STRING.stabilizerHeight : 0, inside ? size : 0);
      this.stabilizers.setMatrixAt(
        index,
        this.matrix.compose(this.position, this.turn, this.scale),
      );
    });
    this.stabilizers.instanceMatrix.needsUpdate = true;
  }

  private placeJoints(bitDepth: number, offset: number, quillY: number, collarTop: number): void {
    const phase = ((bitDepth % STRING.standLength) + STRING.standLength) % STRING.standLength;
    const first = -TOP_OF_STAND + phase;
    let count = 0;
    for (let depth = first; count < MAX_JOINTS; depth += STRING.standLength) {
      const y = wellY(depth, offset);
      if (y <= collarTop) break;
      if (y >= quillY - STRING.toolJointHeight) continue;
      this.position.set(0, y, 0);
      this.scale.set(1, 1, 1);
      this.joints.setMatrixAt(count++, this.matrix.compose(this.position, this.turn, this.scale));
    }
    this.joints.count = count;
    this.joints.instanceMatrix.needsUpdate = true;
  }
}
