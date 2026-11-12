import { Matrix4, Quaternion, SphereGeometry, Vector3 } from 'three';
import type { InstancedMesh, Object3D, Mesh } from 'three';
import { lerp, smoothstep } from '@core/math';
import type { AssemblyState } from '../../../ids';
import { DROPLET_PATH } from '../../../model/path';
import { waypoint } from '../../../model/layout';
import { mesh, namedGroup } from '../context';
import { instanced } from '../kit';
import type { Frame, PartContext } from '../context';
import {
  BEAD_CLEAR_M,
  BEAD_FADE_M,
  CATCHER_Y,
  BEAD_RADIUS_M,
  BEAD_SEGMENTS,
  DISC_SPREAD,
  DISC_THIN,
  FLARE_END_UNITS,
  MAIN_PULSE_UNITS,
  NOZZLE_Y,
  PLASMA_Y,
  PRE_PULSE_UNITS,
  STREAM_BEADS,
  STREAM_SPACING_M,
  STREAM_SPEED_MS,
} from './dims';

const RANGE_M = STREAM_BEADS * STREAM_SPACING_M;
const IDENTITY = new Quaternion();
const NOZZLE_X = DROPLET_PATH[0][0];
const CONSUMED_END_UNITS = MAIN_PULSE_UNITS + 15;

export class DropletsPart {
  readonly object: Object3D = namedGroup('droplets');
  private readonly stream: InstancedMesh;
  private readonly target: Mesh;
  private readonly matrix = new Matrix4();
  private readonly position = new Vector3();
  private readonly scale = new Vector3();
  private drift = 0;

  constructor(context: PartContext) {
    const bead = new SphereGeometry(BEAD_RADIUS_M, ...BEAD_SEGMENTS);
    this.stream = instanced(
      context,
      bead,
      'droplets',
      'tin',
      Array.from({ length: STREAM_BEADS }, () => new Matrix4()),
    );
    this.stream.frustumCulled = false;
    this.target = mesh(context, bead, 'droplets', 'tin');
    this.target.position.set(NOZZLE_X, PLASMA_Y, waypoint('plasma')[2]);
    this.object.add(this.stream, this.target);
  }

  setState(state: AssemblyState): void {
    this.apply(state);
  }

  animate(frame: Frame, state: AssemblyState): boolean {
    if (state.playing) this.drift = (this.drift + frame.delta * STREAM_SPEED_MS) % RANGE_M;
    this.apply(state);
    return state.playing;
  }

  private apply(state: AssemblyState): void {
    const { units, phase, share } = state.flash;
    const occupied = units >= PRE_PULSE_UNITS && units < FLARE_END_UNITS;
    for (let index = 0; index < STREAM_BEADS; index += 1) {
      const y = NOZZLE_Y - ((index * STREAM_SPACING_M + this.drift) % RANGE_M);
      const edge = Math.min(
        smoothstep(NOZZLE_Y - y, 0, BEAD_FADE_M),
        smoothstep(y, CATCHER_Y, CATCHER_Y + BEAD_FADE_M),
      );
      const clear = occupied && Math.abs(y - PLASMA_Y) < BEAD_CLEAR_M;
      const size = clear ? 0 : edge;
      this.matrix.compose(this.position.set(NOZZLE_X, y, 0), IDENTITY, this.scale.setScalar(size));
      this.stream.setMatrixAt(index, this.matrix);
    }
    this.stream.instanceMatrix.needsUpdate = true;
    const flatten = phase === 'prepulse' ? share : phase === 'plasma' ? 1 : 0;
    const present = occupied ? 1 - smoothstep(units, MAIN_PULSE_UNITS, CONSUMED_END_UNITS) : 0;
    const spread = lerp(1, DISC_SPREAD, flatten) * present;
    this.target.scale.set(spread, lerp(1, DISC_THIN, flatten) * present, spread);
    this.target.visible = present > 0;
  }
}
