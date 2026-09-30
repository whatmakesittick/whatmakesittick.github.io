import { AdditiveBlending, Color, Vector3 } from 'three';
import { UNDIMMED_GROUP } from '@core/scene/materials';
import { PointCloud, createPointMaterial } from '@core/scene/pointCloud';
import { THEME } from '../../theme';
import { BEACON } from '../constants';
import { probePosition } from '../layout';
import { radiusAtTau } from '../../model';
import { arrivalFade, pulseTint, pulsesInFlight } from './beaconPulses';
import { registered } from './context';
import type { PartContext } from './context';

const PULSE_RENDER_ORDER = 4;
const HIDDEN = 0;

export class BeaconFlashesPart {
  readonly cloud: PointCloud;
  private readonly white = new Color(THEME.beacon);
  private readonly red = new Color(THEME.beaconRed);
  private readonly tint = new Color();
  private readonly emission = new Vector3();
  private readonly direction = new Vector3();
  private readonly point = new Vector3();
  private count = 0;

  constructor(context: PartContext) {
    const material = registered(
      context,
      UNDIMMED_GROUP,
      createPointMaterial(context.textures.glow, BEACON.pointSize, AdditiveBlending),
    );
    this.cloud = context.tracker.track(
      new PointCloud(BEACON.maxPulses, material, PULSE_RENDER_ORDER),
    );
  }

  get object() {
    return this.cloud.points;
  }

  get inFlight(): number {
    return this.count;
  }

  set(tau: number, shipAt: Vector3): void {
    let index = 0;
    for (const pulse of pulsesInFlight(tau)) {
      probePosition(radiusAtTau(pulse.emittedAt), this.emission);
      this.direction.subVectors(shipAt, this.emission);
      const pathLength = this.direction.length();
      if (pulse.travelled >= pathLength) continue;
      this.point.copy(this.emission).addScaledVector(this.direction, pulse.travelled / pathLength);
      const { share, alpha } = pulseTint(pulse.ratio);
      this.tint.lerpColors(this.white, this.red, share);
      this.cloud.setPoint(index, this.point.x, this.point.y, this.point.z);
      this.cloud.setColor(
        index,
        this.tint.r,
        this.tint.g,
        this.tint.b,
        alpha * arrivalFade(pulse.travelled, pathLength),
      );
      index += 1;
    }
    this.count = index;
    for (; index < BEACON.maxPulses; index += 1) {
      this.cloud.setPoint(index, 0, 0, 0);
      this.cloud.setColor(index, HIDDEN, HIDDEN, HIDDEN, HIDDEN);
    }
    this.cloud.commit();
  }
}
