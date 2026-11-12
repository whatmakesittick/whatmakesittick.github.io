import {
  CylinderGeometry,
  Matrix4,
  Quaternion,
  SphereGeometry,
  TorusGeometry,
  Vector3,
} from 'three';
import type { Object3D } from 'three';
import { FULL_TURN } from '@core/math';
import type { PartContext } from '../context';
import { finishMesh, namedGroup } from '../context';
import { VIRUS, VIRUS_CENTRE, VIRUS_SEGMENTS } from './dims';
import { INSET_FINISHES } from './finishes';
import { finishInstances } from './instances';

const Z_AXIS = new Vector3(0, 0, 1);
const UNIT = new Vector3(1, 1, 1);

function spikeMatrices(centre: number): Matrix4[] {
  return Array.from({ length: VIRUS.spikes }, (_, index) => {
    const angle = (index / VIRUS.spikes) * FULL_TURN;
    const direction = new Vector3(Math.cos(angle), Math.sin(angle), 0);
    const turn = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), direction);
    return new Matrix4().compose(direction.multiplyScalar(centre), turn, UNIT);
  });
}

export class VirusPart {
  readonly object: Object3D = namedGroup('virus');
  private angle = 0;

  constructor(context: PartContext) {
    const ring = finishMesh(
      context,
      new TorusGeometry(
        VIRUS.ringRadius,
        VIRUS.tubeRadius,
        VIRUS_SEGMENTS.tube,
        VIRUS_SEGMENTS.ring,
      ),
      'virus',
      INSET_FINISHES.virusRing,
    );
    const stems = new CylinderGeometry(
      VIRUS.spikeRadius,
      VIRUS.spikeRadius,
      VIRUS.spikeLength,
      VIRUS_SEGMENTS.spike,
    );
    const heads = new SphereGeometry(VIRUS.headRadius, ...VIRUS_SEGMENTS.head);
    this.object.add(
      ring,
      finishInstances(
        context,
        stems,
        'virus',
        INSET_FINISHES.virusSpike,
        spikeMatrices(VIRUS.spikeCentre),
      ),
      finishInstances(
        context,
        heads,
        'virus',
        INSET_FINISHES.virusSpike,
        spikeMatrices(VIRUS.headCentre),
      ),
    );
    this.object.position.set(...VIRUS_CENTRE);
  }

  spin(deltaSeconds: number): void {
    this.angle = (this.angle + deltaSeconds * VIRUS.spinRadiansPerSecond) % FULL_TURN;
    this.object.setRotationFromAxisAngle(Z_AXIS, this.angle);
  }
}
