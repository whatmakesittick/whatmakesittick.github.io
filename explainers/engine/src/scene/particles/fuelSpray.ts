import { Color, Vector3 } from 'three';
import type { PointsMaterial } from 'three';
import { toRadians } from '../../model';
import { SPRAY } from '../constants';
import { PointCloud } from './pointCloud';

interface Droplet {
  jet: Vector3;
  progress: number;
  jitter: Vector3;
}

export interface SprayFrame {
  deltaDegrees: number;
  active: boolean;
  chamberDepth: number;
}

const FUEL_COLOR = new Color('#ffe08a');

function randomCentered(): number {
  return Math.random() - 0.5;
}

function jetDirection(index: number): Vector3 {
  const around = (Math.PI * 2 * index) / SPRAY.jets;
  const down = toRadians(SPRAY.downwardDegrees);
  return new Vector3(
    Math.cos(around) * Math.cos(down),
    -Math.sin(down),
    Math.sin(around) * Math.cos(down),
  );
}

export class FuelSpray {
  readonly cloud: PointCloud;
  private readonly droplets: Droplet[];
  private readonly nozzle: Vector3;
  private readonly reach: number;
  private level = 0;

  constructor(nozzle: Vector3, bore: number, material: PointsMaterial) {
    this.nozzle = nozzle.clone();
    this.reach = bore * SPRAY.reachPerBore;
    const count = SPRAY.jets * SPRAY.particlesPerJet;
    this.cloud = new PointCloud(count, material);
    this.droplets = Array.from({ length: count }, (_, index) => ({
      jet: jetDirection(index % SPRAY.jets),
      progress: Math.random(),
      jitter: new Vector3(randomCentered(), randomCentered(), randomCentered()),
    }));
  }

  update(frame: SprayFrame): void {
    const degrees = Math.abs(frame.deltaDegrees);
    this.level = frame.active ? 1 : Math.max(0, this.level - degrees * SPRAY.decayPerDegree);
    const floor = this.nozzle.y - Math.max(0, frame.chamberDepth - SPRAY.crownMargin);
    this.droplets.forEach((droplet, index) => {
      if (frame.active) droplet.progress = (droplet.progress + degrees * SPRAY.degreesRate) % 1;
      const distance = droplet.progress * this.reach;
      const spread = distance * SPRAY.spread;
      const x = this.nozzle.x + droplet.jet.x * distance + droplet.jitter.x * spread;
      const y = this.nozzle.y + droplet.jet.y * distance + droplet.jitter.y * spread;
      const z = this.nozzle.z + droplet.jet.z * distance + droplet.jitter.z * spread;
      this.cloud.setPoint(index, x, Math.max(floor, y), z);
      const alpha = this.level * Math.sqrt(1 - droplet.progress);
      this.cloud.setColor(index, FUEL_COLOR.r, FUEL_COLOR.g, FUEL_COLOR.b, alpha);
    });
    this.cloud.commit();
  }
}
