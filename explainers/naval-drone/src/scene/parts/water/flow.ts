import { Color, Vector3 } from 'three';
import { clamp, lerp } from '@core/math';
import { PointCloud, createPointMaterial } from '@core/scene/pointCloud';
import type { AssemblyState } from '../../../ids';
import { IMPELLER, JET } from '../../../model/layout';
import { knotsToMs } from '../../../model/scale';
import { FLOW, JET_STREAM } from '../../constants';
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

function segmentSpeed(x: number, boatSpeed: number, jetSpeed: number): number {
  const { speeds } = FLOW;
  if (x > FLOW.intakeEdge) return Math.max(boatSpeed, speeds.intake);
  if (x > JET.duct.endX) return speeds.duct;
  if (x > JET.stator.x[0]) return speeds.pump;
  if (x > JET.nozzle.x[0]) return speeds.nozzle;
  return Math.max(jetSpeed, speeds.jet);
}

function segmentRadius(x: number): number {
  const { radius } = FLOW;
  if (x > FLOW.intakeEdge) return radius.intake;
  if (x > JET.nozzle.x[1]) return radius.duct;
  if (x > JET.steeringNozzle.x[0]) return radius.nozzle;
  return radius.jet;
}

export class FlowPart {
  readonly cloud: PointCloud;
  private readonly base: readonly Vec3[];
  private segments: Segment[] = [];
  private total = 1;
  private clock = 0;
  private visible = false;
  private readonly slow = new Color(FLOW.slow);
  private readonly fast = new Color(FLOW.fast);
  private readonly mixed = new Color();

  constructor(context: PartContext, path: readonly Vec3[]) {
    this.base = [...FLOW.approach, ...path];
    const material = registered(
      context,
      'jetStream',
      createPointMaterial(context.textures.dot, FLOW.size),
    );
    this.cloud = new PointCloud(FLOW.count, material);
    context.tracker.track({ dispose: () => this.cloud.dispose() });
  }

  private path(state: AssemblyState): Vector3[] {
    const points = this.base.map((point) => new Vector3(...point));
    const exit = points[points.length - 1];
    const { nozzleAngle, bucket } = state.jet;
    if (bucket > 0.5) {
      const { reverse } = JET_STREAM;
      points.push(
        exit.clone().add(new Vector3(...FLOW.turn, 0)),
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
    points.push(rotatedExit.clone().add(direction.multiplyScalar(FLOW.jetLength)));
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
          clamp(state.jet.throttle, FLOW.minThrottle, 1),
        radius: [segmentRadius(from.x), segmentRadius(to.x)],
        swirl: middle < IMPELLER.x + FLOW.swirlReach && middle > JET.stator.x[0] ? FLOW.swirl : 0,
      };
    });
    this.total = this.segments.reduce((sum, segment) => sum + segment.length / segment.speed, 0);
    this.place();
  }

  private place(): void {
    const { count } = FLOW;
    const point = new Vector3();
    for (let index = 0; index < count; index += 1) {
      const phase = ((index * GOLDEN + (this.clock * FLOW.playback) / this.total) % 1) * this.total;
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
      const speed = clamp(segment.speed / FLOW.speeds.jet, 0, 1);
      this.mixed.copy(this.slow).lerp(this.fast, speed);
      this.cloud.setColor(index, this.mixed.r, this.mixed.g, this.mixed.b, FLOW.alpha);
    }
    this.cloud.commit();
  }

  advance(deltaSeconds: number): void {
    if (!this.visible) return;
    this.clock += deltaSeconds;
    this.place();
  }
}
