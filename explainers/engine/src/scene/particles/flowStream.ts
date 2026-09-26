import { Vector3 } from 'three';
import type { Color, PointsMaterial } from 'three';
import { FLOW, PORT } from '../constants';
import type { ValveDimensions } from '../dimensions';
import { portCenterline, samplePath } from '../parts/portPath';
import type { PathSample } from '../geometry/sweep';
import { PointCloud } from './pointCloud';

export type FlowDirection = 'in' | 'out';

interface Particle {
  progress: number;
  across: number;
  depth: number;
  targetX: number;
  targetY: number;
  targetZ: number;
}

export interface FlowFrame {
  deltaDegrees: number;
  lift: number;
  maxLift: number;
  chamberDepth: number;
}

const TOTAL = 1 + FLOW.cylinderSpan;
const scratch = new Vector3();

function randomSigned(): number {
  return Math.random() * 2 - 1;
}

function smoothstep(edge0: number, edge1: number, value: number): number {
  const t = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function wrap(value: number): number {
  return ((value % TOTAL) + TOTAL) % TOTAL;
}

export class FlowStream {
  readonly cloud: PointCloud;
  private readonly samples: PathSample[];
  private readonly particles: Particle[];
  private readonly valve: ValveDimensions;
  private readonly direction: FlowDirection;
  private readonly color: Color;
  private readonly boreRadius: number;

  constructor(
    valve: ValveDimensions,
    direction: FlowDirection,
    count: number,
    color: Color,
    boreRadius: number,
    material: PointsMaterial,
  ) {
    this.valve = valve;
    this.direction = direction;
    this.color = color;
    this.boreRadius = boreRadius;
    this.samples = samplePath(portCenterline(valve), PORT.pathSamples);
    this.cloud = new PointCloud(count, material);
    this.particles = Array.from({ length: count }, (_, index) => ({
      progress: (index / count) * TOTAL,
      across: randomSigned(),
      depth: -Math.random() + FLOW.frontReach * Math.random(),
      targetX: randomSigned(),
      targetY: Math.random(),
      targetZ: randomSigned(),
    }));
  }

  update(frame: FlowFrame): void {
    const openness = frame.maxLift > 0 ? frame.lift / frame.maxLift : 0;
    const level = Math.min(1, openness / FLOW.openLiftFraction);
    const step =
      Math.sign(frame.deltaDegrees) *
      Math.min(Math.abs(frame.deltaDegrees), FLOW.maxDegreesPerFrame);
    const advance = step * openness * FLOW.degreesRate;
    this.particles.forEach((particle, index) => {
      particle.progress = wrap(particle.progress + advance);
      this.place(particle, frame.chamberDepth);
      this.cloud.setPoint(index, scratch.x, scratch.y, scratch.z);
      const alpha = level * this.fade(particle.progress);
      this.cloud.setColor(index, this.color.r, this.color.g, this.color.b, alpha);
    });
    this.cloud.commit();
  }

  private fade(progress: number): number {
    const fraction = progress / TOTAL;
    return smoothstep(0, FLOW.fadeIn, fraction) * (1 - smoothstep(1 - FLOW.fadeOut, 1, fraction));
  }

  private place(particle: Particle, chamberDepth: number): void {
    const portFirst = this.direction === 'in';
    const portStart = portFirst ? 0 : FLOW.cylinderSpan;
    const inPort = particle.progress >= portStart && particle.progress < portStart + 1;
    if (inPort) {
      const along = particle.progress - portStart;
      this.placeInPort(particle, portFirst ? 1 - along : along);
      return;
    }
    const cylinderStart = portFirst ? 1 : 0;
    const along = (particle.progress - cylinderStart) / FLOW.cylinderSpan;
    this.placeInCylinder(particle, portFirst ? along : 1 - along, chamberDepth);
  }

  private placeInPort(particle: Particle, fromSeat: number): void {
    const position = fromSeat * (this.samples.length - 1);
    const index = Math.min(this.samples.length - 2, Math.floor(position));
    const blend = position - index;
    const a = this.samples[index];
    const b = this.samples[index + 1];
    const x = a.point.x + (b.point.x - a.point.x) * blend;
    const y = a.point.y + (b.point.y - a.point.y) * blend;
    const radius = this.valve.portRadius * FLOW.crossSectionFill;
    const normalX = -a.tangent.y;
    const normalY = a.tangent.x;
    scratch.set(
      x + normalX * particle.across * radius,
      y + normalY * particle.across * radius,
      particle.depth * radius,
    );
  }

  private placeInCylinder(particle: Particle, intoCylinder: number, chamberDepth: number): void {
    const eased = 1 - (1 - intoCylinder) * (1 - intoCylinder);
    const spread = this.boreRadius * FLOW.chamberSpread;
    const seatX = this.valve.sign * this.valve.offset;
    const targetX = seatX * (1 - FLOW.chamberSpread) + particle.targetX * spread;
    const usableDepth = Math.max(0, chamberDepth - FLOW.crownMargin);
    const depthFraction = FLOW.chamberTopFraction + FLOW.chamberDepthFraction * particle.targetY;
    const targetY = -usableDepth * depthFraction;
    const targetZ = particle.targetZ * spread;
    scratch.set(
      seatX + (targetX - seatX) * eased,
      targetY * eased,
      particle.depth * this.valve.portRadius * FLOW.crossSectionFill * (1 - eased) +
        targetZ * eased,
    );
  }
}
