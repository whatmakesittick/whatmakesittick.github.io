import { CapsuleGeometry, Group, SphereGeometry } from 'three';
import type { Mesh, MeshStandardMaterial } from 'three';
import { PROBE, SEGMENTS } from '../constants';
import { FALL_ANGLE, probePosition } from '../layout';
import { beaconPulseShare } from './beaconPulses';
import { partMesh } from './context';
import type { PartContext } from './context';

const AXIS_TO_FALL_LINE = FALL_ANGLE - Math.PI / 2;

export class ProbePart {
  readonly object = new Group();
  private readonly dome: Mesh;

  constructor(context: PartContext) {
    const hull = partMesh(
      context,
      new CapsuleGeometry(PROBE.radius, PROBE.length, SEGMENTS.capsule, SEGMENTS.radial),
      'probe',
      context.finishes.probeHull,
    );
    this.dome = partMesh(
      context,
      new SphereGeometry(PROBE.domeRadius, SEGMENTS.sphere, SEGMENTS.sphere),
      'beacon',
      context.finishes.beaconDome,
    );
    this.dome.position.y = PROBE.length / 2 + PROBE.radius - PROBE.domeRadius * PROBE.domeSink;
    this.object.rotation.z = AXIS_TO_FALL_LINE;
    this.object.add(hull, this.dome);
  }

  set(radius: number, tau: number): void {
    probePosition(radius, this.object.position);
    const share = beaconPulseShare(tau);
    const material = this.dome.material as MeshStandardMaterial;
    material.emissiveIntensity =
      PROBE.pulseFloor + PROBE.pulsePeak * Math.exp(-share * PROBE.pulseDecay);
  }

  get glow(): number {
    return (this.dome.material as MeshStandardMaterial).emissiveIntensity;
  }
}
