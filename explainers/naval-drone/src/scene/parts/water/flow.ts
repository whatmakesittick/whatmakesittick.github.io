import { Color, Vector3 } from 'three';
import { clamp, lerp } from '@core/math';
import { PointCloud, createPointMaterial } from '@core/scene/pointCloud';
import type { AssemblyState } from '../../../ids';
import { IMPELLER, JET } from '../../../model/layout';
import { knotsToMs } from '../../../model/scale';
import { JET_STREAM } from '../../constants';
import type { Vec3 } from '../../geometry/surface';
import { registered } from '../context';
import type { PartContext } from '../context';

interface Segment {
  from: Vector3;
  to: Vector3;
  length: number;
  speed: number;
  radius: [number, number];
  swirl: number;
}

const GOLDEN = 0.6180339887;
const SPREAD = 0.7548776662;
const ANGLE = 0.569840291;
const FLOW_COUNT = 240;
const FLOW_SIZE = 0.045;
const RADIUS = { intake: 0.1, duct: 0.07, nozzle: 0.035, jet: 0.05 };
const SPEEDS = { intake: 2.2, duct: 3.4, pump: 9, nozzle: 16, jet: 18 };
const APPROACH: Vec3[] = [
  [-0.9, -0.38, 0],
  [-1.55, -0.34, 0],
];
const JET_LENGTH = 1.6;
const SWIRL = 2.4;
const SWIRL_REACH = 0.02;
const SLOW = '#5fa8ff';
const FAST = '#ffffff';
const PLAYBACK = 0.18;
const TURN = [-0.08, -0.05] as const;
const INTAKE_EDGE = -1.75;
const MIN_THROTTLE = 0.25;
const ALPHA = 0.95;

function segmentSpeed(x: number, boatSpeed: number, jetSpeed: number): number {
  if (x > INTAKE_EDGE) return Math.max(boatSpeed, SPEEDS.intake);
  if (x > JET.duct.endX) return SPEEDS.duct;
  if (x > JET.stator.x[0]) return SPEEDS.pump;
  if (x > JET.nozzle.x[0]) return SPEEDS.nozzle;
  return Math.max(jetSpeed, SPEEDS.jet);
}

function segmentRadius(x: number): number {
  if (x > INTAKE_EDGE) return RADIUS.intake;
  if (x > JET.nozzle.x[1]) return RADIUS.duct;
  if (x > JET.steeringNozzle.x[0]) return RADIUS.nozzle;
  return RADIUS.jet;
}

export class FlowPart {
  readonly cloud: PointCloud;
  private readonly base: readonly Vec3[];
  private segments: Segment[] = [];
  private total = 1;
  private clock = 0;
  private visible = false;
  private readonly slow = new Color(SLOW);
  private readonly fast = new Color(FAST);
  private readonly mixed = new Color();

  constructor(context: PartContext, path: readonly Vec3[]) {
    this.base = [...APPROACH, ...path];
    const material = registered(
      context,
      'jetStream',
      createPointMaterial(context.textures.dot, FLOW_SIZE),
    );
    this.cloud = new PointCloud(FLOW_COUNT, material);
    context.tracker.track({ dispose: () => this.cloud.dispose() });
  }

  private path(state: AssemblyState): Vector3[] {
    const points = this.base.map((point) => new Vector3(...point));
    const exit = points[points.length - 1];
    const { nozzleAngle, bucket } = state.jet;
    if (bucket > 0.5) {
      const { reverse } = JET_STREAM;
      points.push(
        exit.clone().add(new Vector3(...TURN, 0)),
        exit.clone().add(new Vector3(reverse.length * Math.cos(reverse.angle), -reverse.dive, 0)),
      );
      return points;
    }
    const direction = new Vector3(-Math.cos(nozzleAngle), 0, Math.sin(nozzleAngle));
    const pivot = new Vector3(JET.steeringNozzle.pivotX, JET.axisY, 0);
    const rotatedExit = pivot
      .clone()
      .add(direction.clone().multiplyScalar(JET.steeringNozzle.pivotX - JET.steeringNozzle.x[0]));
    points[points.length - 1] = rotatedExit;
    points.push(rotatedExit.clone().add(direction.multiplyScalar(JET_LENGTH)));
    return points;
  }

  setState(state: AssemblyState): void {
    this.visible = state.view.flow && state.jet.flow > 0;
    this.cloud.points.visible = this.visible;
    if (!this.visible) return;
    const points = this.path(state);
    const boatSpeed = knotsToMs(state.boat.knots);
    this.segments = points.slice(1).map((to, index) => {
      const from = points[index];
      const middle = (from.x + to.x) / 2;
      return {
        from,
        to,
        length: from.distanceTo(to),
        speed:
          segmentSpeed(middle, boatSpeed, state.jet.jetSpeed) *
          clamp(state.jet.throttle, MIN_THROTTLE, 1),
        radius: [segmentRadius(from.x), segmentRadius(to.x)],
        swirl: middle < IMPELLER.x + SWIRL_REACH && middle > JET.stator.x[0] ? SWIRL : 0,
      };
    });
    this.total = this.segments.reduce((sum, segment) => sum + segment.length / segment.speed, 0);
    this.place();
  }

  private place(): void {
    const point = new Vector3();
    for (let index = 0; index < FLOW_COUNT; index += 1) {
      const phase = ((index * GOLDEN + (this.clock * PLAYBACK) / this.total) % 1) * this.total;
      let time = phase;
      let segment = this.segments[0];
      for (const candidate of this.segments) {
        segment = candidate;
        const span = candidate.length / candidate.speed;
        if (time <= span) break;
        time -= span;
      }
      const share = clamp((time * segment.speed) / Math.max(segment.length, 1e-6), 0, 1);
      point.lerpVectors(segment.from, segment.to, share);
      const radius =
        lerp(segment.radius[0], segment.radius[1], share) * Math.sqrt((index * SPREAD) % 1);
      const angle = ((index * ANGLE) % 1) * Math.PI * 2 + segment.swirl * share;
      this.cloud.setPoint(
        index,
        point.x,
        point.y + radius * Math.cos(angle),
        point.z + radius * Math.sin(angle),
      );
      const speed = clamp(segment.speed / SPEEDS.jet, 0, 1);
      this.mixed.copy(this.slow).lerp(this.fast, speed);
      this.cloud.setColor(index, this.mixed.r, this.mixed.g, this.mixed.b, ALPHA);
    }
    this.cloud.commit();
  }

  advance(deltaSeconds: number): void {
    if (!this.visible) return;
    this.clock += deltaSeconds;
    this.place();
  }
}
