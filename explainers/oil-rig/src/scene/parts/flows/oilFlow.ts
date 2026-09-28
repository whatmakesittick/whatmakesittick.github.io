import { Group, Vector3 } from 'three';
import { lerp } from '@core/math';
import { depthToY, tubularRadius } from '../../../model/scale';
import { FLOW, RENDER_ORDER, WELL_TUBES } from '../../constants';
import { testLineRoute } from '../../geometry/testLine';
import { wellY } from '../../geometry/wellColumn';
import type { PartContext } from '../context';
import type { Tunnel } from '../well/completion';
import { TUBING_END_DEPTH } from '../well/completion';
import { Stream } from './stream';

const TONES = ['#8a5a2b', '#6b4422', '#a36b33'] as const;
const INFLOW_TONES = ['#8a5a2b', '#a06a34'] as const;
const TUBING_SPREAD = 0.55;
const TUBING_LIFT = 0.06;
const TUBING_DEPTH = 0.18;
const LINE_SPREAD = 0.35;
const LINE_LIFT = 0.45;
const INFLOW_ACROSS = 0.6;
const INFLOW_LIFT = 0.1;
const FADE_TAIL = 0.08;
const INFLOW_PATH = 8;

export class OilFlowPart {
  readonly object = new Group();
  private readonly main: Stream;
  private readonly inflow: Stream;
  private readonly tunnels: readonly Tunnel[];
  private readonly path: Vector3[] = [];
  private readonly lengths: number[] = [];
  private readonly scratch = new Vector3();
  private tubingEnd = 0;
  private seaOffset = 0;
  private total = 1;

  constructor(context: PartContext, tunnels: readonly Tunnel[]) {
    this.tunnels = tunnels;
    const make = (count: number, tones: readonly string[], sizeScale: number, seed: number) =>
      new Stream(context, {
        count,
        group: 'tubing',
        renderOrder: RENDER_ORDER.particles,
        sizeScale,
        tones,
        seed,
      });
    this.main = make(FLOW.oil.count, TONES, FLOW.oil.size, FLOW.seed + 5);
    this.inflow = make(FLOW.inflow.count, INFLOW_TONES, FLOW.inflow.size, FLOW.seed + 6);
    this.object.add(this.main.points, this.inflow.points);
    this.surfaceLine();
  }

  configure(seaOffset: number, shown: boolean): void {
    this.object.visible = shown;
    this.seaOffset = seaOffset;
    this.tubingEnd = wellY(TUBING_END_DEPTH, seaOffset);
    this.path[0].set(0, this.tubingEnd, 0);
    this.measure();
  }

  update(deltaSeconds: number, pointSize: number): void {
    if (!this.object.visible) return;
    this.main.setSize(pointSize);
    this.inflow.setSize(pointSize);
    this.flowMain(deltaSeconds);
    this.flowIn(deltaSeconds);
  }

  private surfaceLine(): void {
    const lift = new Vector3(0, LINE_LIFT, 0);
    this.path.push(new Vector3(), ...testLineRoute().map((point) => point.add(lift)));
  }

  private measure(): void {
    this.lengths.length = 0;
    let total = 0;
    for (let index = 1; index < this.path.length; index++) {
      total += this.path[index].distanceTo(this.path[index - 1]);
      this.lengths.push(total);
    }
    this.total = total;
  }

  private pointAt(distance: number, target: Vector3): Vector3 {
    let from = 0;
    for (let index = 0; index < this.lengths.length; index++) {
      const to = this.lengths[index];
      if (distance <= to) {
        const share = (distance - from) / (to - from);
        return target.lerpVectors(this.path[index], this.path[index + 1], share);
      }
      from = to;
    }
    return target.copy(this.path[this.path.length - 1]);
  }

  private flowMain(deltaSeconds: number): void {
    this.main.advance((FLOW.oil.speed * deltaSeconds) / this.total, 1);
    const tubingRadius = tubularRadius(WELL_TUBES.tubingInches);
    const tubingLength = this.lengths[0];
    this.main.particles.forEach((particle, index) => {
      const distance = particle.progress * this.total;
      const point = this.pointAt(distance, this.scratch);
      const inTubing = distance <= tubingLength;
      const spread = inTubing ? tubingRadius * TUBING_SPREAD : LINE_SPREAD;
      const x = point.x + (particle.lane - 1 / 2) * 2 * spread;
      const z = inTubing
        ? TUBING_LIFT + particle.depth * TUBING_DEPTH
        : point.z + (particle.depth - 1 / 2) * spread;
      const alpha = Math.min(1, (1 - particle.progress) / FADE_TAIL);
      this.main.put(index, x, point.y, z, alpha);
    });
    this.main.commit();
  }

  private flowIn(deltaSeconds: number): void {
    const endY = depthToY(TUBING_END_DEPTH);
    this.inflow.advance((FLOW.inflow.speed * deltaSeconds) / INFLOW_PATH, 1);
    this.inflow.particles.forEach((particle, index) => {
      const tunnel = this.tunnels[index % this.tunnels.length];
      const across = Math.min(particle.progress / INFLOW_ACROSS, 1);
      const upward = Math.max(0, (particle.progress - INFLOW_ACROSS) / (1 - INFLOW_ACROSS));
      const x = tunnel.side * lerp(tunnel.outer, tunnel.inner * (particle.lane - 1 / 2), across);
      const y = lerp(tunnel.y, endY, upward) + this.seaOffset;
      this.inflow.put(index, x, y, INFLOW_LIFT, 1 - upward);
    });
    this.inflow.commit();
  }
}
