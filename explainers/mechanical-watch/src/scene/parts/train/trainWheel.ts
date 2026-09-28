import { Group } from 'three';
import type { BufferGeometry, Object3D } from 'three';
import { toRadians } from '@core/math';
import { anchorAt } from '@core/scene/parts';
import type { WheelId } from '../../../ids';
import { WHEEL_CENTRES } from '../../../model/layout';
import { wheelSpec } from '../../../model/train';
import {
  ANCHOR_LIFT_MM,
  ESCAPE_TOOTH,
  PINION_LEAF,
  SEGMENTS,
  TRAIN_WHEELS,
  WHEEL_LABELS,
  WHEEL_TOOTH,
} from '../../constants';
import type { TrainWheelForm } from '../../constants';
import { extrudeOutline } from '../../geometry/extrude';
import { formProfile, gearModule } from '../../geometry/gear';
import { merge } from '../../geometry/merge';
import { polarDeg } from '../../geometry/outline';
import { arbor, disc } from '../../geometry/solids';
import { clubToothProfile, crossingHoles } from '../../geometry/wheel';
import { partMesh } from '../context';
import type { PartContext } from '../context';
import type { WheelPhase } from './phases';

export type TrainWheelId = Exclude<WheelId, 'barrel'>;

const HUB_SHARE = 0.62;

function rimInner(id: TrainWheelId, form: TrainWheelForm): number {
  if (id === 'escapeWheel') return ESCAPE_TOOTH.rootRadius - form.rimWidth;
  const spec = wheelSpec(id);
  return (
    spec.radiusMm - WHEEL_TOOTH.dedendum * gearModule(spec.teeth, spec.radiusMm) - form.rimWidth
  );
}

function wheelOutline(id: TrainWheelId, phase: number) {
  const spec = wheelSpec(id);
  if (id === 'escapeWheel') return clubToothProfile(spec.teeth, ESCAPE_TOOTH, phase);
  return formProfile(spec.teeth, spec.radiusMm, WHEEL_TOOTH, phase);
}

export function wheelGeometry(id: TrainWheelId, phase: number): BufferGeometry {
  const form = TRAIN_WHEELS[id];
  const holes = crossingHoles({ ...form.spokes, rimInner: rimInner(id, form) }, SEGMENTS.outline);
  const plate = extrudeOutline(wheelOutline(id, phase), form.wheel[0], form.wheel[1], holes);
  const hub = disc(
    { x: 0, y: 0, r: form.spokes.hubRadius * HUB_SHARE },
    form.hubSpan,
    SEGMENTS.hub,
  );
  return merge([plate, hub]);
}

export function pinionGeometry(id: TrainWheelId, phase: number): BufferGeometry {
  const spec = wheelSpec(id);
  const form = TRAIN_WHEELS[id];
  const leaves = formProfile(spec.pinionLeaves, spec.pinionRadiusMm, PINION_LEAF, phase);
  const pinion = extrudeOutline(leaves, form.pinion[0], form.pinion[1]);
  return merge([pinion, arbor(form.arbor, SEGMENTS.arbor)]);
}

export class TrainWheelPart {
  readonly object = new Group();
  readonly anchor: Object3D;
  readonly label: Object3D;

  constructor(context: PartContext, frame: Object3D, id: TrainWheelId, phase: WheelPhase) {
    const centre = WHEEL_CENTRES[id];
    const form = TRAIN_WHEELS[id];
    this.object.position.set(centre.x, centre.y, 0);
    const wheel = wheelGeometry(id, phase.wheel);
    const pinion = pinionGeometry(id, phase.pinion);
    if (id === 'escapeWheel') {
      this.object.add(partMesh(context, merge([wheel, pinion]), id, 'brightSteel'));
    } else {
      this.object.add(
        partMesh(context, wheel, id, 'brass'),
        partMesh(context, pinion, id, 'steel'),
      );
    }
    frame.add(this.object);
    const top = form.wheel[1] + ANCHOR_LIFT_MM;
    const label = polarDeg(centre, WHEEL_LABELS[id].radius, WHEEL_LABELS[id].deg);
    this.anchor = anchorAt(frame, centre.x, centre.y, top);
    this.label = anchorAt(frame, label.x, label.y, top);
  }

  setAngle(degrees: number): void {
    this.object.rotation.z = toRadians(degrees);
  }
}
