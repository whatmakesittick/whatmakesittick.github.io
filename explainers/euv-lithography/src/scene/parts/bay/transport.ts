import { InstancedMesh, Matrix4 } from 'three';
import { STRUCTURE_GROUP } from '@core/scene/materials';
import type { AssemblyState } from '../../../ids';
import { BAY_TONES } from '../../../theme';
import { registeredMaterial } from '../context';
import type { Frame, PartContext } from '../context';
import type { Batch } from '../fab/batch';
import { span } from '../fab/shapes';
import { CARRIER, CEILING_Y, RAIL } from './dims';
import { bakedMaterial } from './finishes';
import { bakedBoxes } from './surfaces';
import type { BakedBox } from './surfaces';

const BODY = '#3b3835';
const BEACON = '#c98a3a';
const PARTS: readonly BakedBox[] = [
  [[-0.32, -0.02, -0.16], [0.32, 0.16, 0.16], BODY, 1],
  [[-0.08, -0.12, -0.05], [0.08, -0.02, 0.05], BODY, 0.8],
  [[-0.36, -0.58, -0.32], [0.36, -0.12, 0.32], BODY, 1.25],
  [[-0.06, -0.3, 0.32], [0.06, -0.24, 0.335], BEACON, 1],
  [[-0.24, -0.98, -0.21], [0.24, -0.62, 0.21], BAY_TONES.pod, 1],
  [[-0.1, -0.62, -0.06], [0.1, -0.58, 0.06], BODY, 1],
];

export function carrierX(index: number, travel: number): number {
  const length = CARRIER.to - CARRIER.from;
  const offset = ((index + CARRIER.phase) * length) / CARRIER.count + travel;
  return CARRIER.from + (((offset % length) + length) % length);
}

export function addRail(batch: Batch): void {
  const half = RAIL.width / 2;
  const top = RAIL.y + RAIL.height;
  batch.add(
    STRUCTURE_GROUP,
    'frame',
    span([-RAIL.reach, RAIL.y, RAIL.z - half], [RAIL.reach, top, RAIL.z + half]),
  );
  const rod = RAIL.hanger / 2;
  for (let x = -RAIL.reach; x <= RAIL.reach; x += RAIL.hangerPitch) {
    batch.add(
      STRUCTURE_GROUP,
      'frame',
      span([x - rod, top, RAIL.z - rod], [x + rod, CEILING_Y, RAIL.z + rod]),
    );
  }
}

export class Transport {
  readonly object: InstancedMesh;
  private readonly matrix = new Matrix4();
  private travel = 0;

  constructor(context: PartContext) {
    const material = registeredMaterial(context, STRUCTURE_GROUP, bakedMaterial());
    this.object = context.tracker.track(
      new InstancedMesh(
        context.tracker.track(bakedBoxes(PARTS, 'Carrier parts')),
        material,
        CARRIER.count,
      ),
    );
    this.object.name = 'carriers';
    this.object.frustumCulled = false;
    this.place();
  }

  animate(frame: Frame, state: AssemblyState): boolean {
    if (!state.playing) return false;
    this.travel += frame.delta * CARRIER.speed;
    this.place();
    return true;
  }

  private place(): void {
    for (let index = 0; index < CARRIER.count; index += 1) {
      this.matrix.makeTranslation(carrierX(index, this.travel), RAIL.y, RAIL.z);
      this.object.setMatrixAt(index, this.matrix);
    }
    this.object.instanceMatrix.needsUpdate = true;
  }
}
