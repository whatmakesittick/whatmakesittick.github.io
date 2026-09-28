import { Group } from 'three';
import { lerp } from '@core/math';
import type { MudState } from '../../../ids';
import { SEABED_Y, tubularRadius, yToDepth } from '../../../model/scale';
import { SEABED_DEPTH_M } from '../../../model/wellPlan';
import { CRACKS, FLOW, RENDER_ORDER, RISER, STRING } from '../../constants';
import {
  annulusWall,
  collarRadius,
  holeAt,
  lastSetCasing,
  tubeWall,
  wellY,
} from '../../geometry/wellColumn';
import type { HoleInterval } from '../../geometry/wellColumn';
import type { PartContext } from '../context';
import { BIT_HEIGHT } from '../well/bits';
import { WELLHEAD_TOP } from '../well/bop';
import { CracksPart } from './cracks';
import { Stream } from './stream';

export interface MudFrame {
  quillY: number;
  bitDepth: number;
  seaOffset: number;
  landed: boolean;
  wellhead: boolean;
  state: MudState;
  shown: boolean;
}

interface Column {
  bitY: number;
  bitTop: number;
  collarTop: number;
  collarRadius: number;
  holeRadius: number;
  exitY: number;
  seabedY: number;
  seaY: number;
  lastSet: HoleInterval | undefined;
}

const PIPE_RADIUS = tubularRadius(STRING.pipeInches);
const RISER_BORE = tubularRadius(RISER.inches) - tubeWall(RISER.inches);
const STREAM_LIFT = 0.08;
const LANE = { from: 0.18, span: 0.64 } as const;
const DEPTH_SHARE = 0.4;
const DOWN_SPREAD = 0.45;
const BUBBLE_RATE = 4.2;
const PLUME_FADE = 0.85;
const LOSS_LIFT = 0.05;
const HEAVY_FADE = 6;
const CRACK_HEIGHT_SHARE = 0.5;
const SEA_DRIFT = 4;
const SEA_SPREAD = 2;
const PLUME_MIN_REACH = 0.4;

const TONES = {
  fresh: ['#e3c9a0', '#d7b98b'],
  returns: ['#9d7b52', '#8a6a45', '#9d7b52', '#bdb6aa'],
  gas: ['#fff4cc', '#ffe8a6'],
  loss: ['#6a4f33'],
} as const;

export class MudFlowPart {
  readonly object = new Group();
  private readonly down: Stream;
  private readonly up: Stream;
  private readonly bubbles: Stream;
  private readonly loss: Stream;
  private readonly cracks: CracksPart;
  private readonly streams: readonly Stream[];
  private frame: MudFrame | null = null;
  private column: Column | null = null;

  constructor(context: PartContext) {
    const stream = (
      count: number,
      group: 'drillPipe' | 'annulus',
      tones: readonly string[],
      sizeScale: number,
      seed: number,
    ) =>
      new Stream(context, {
        count,
        group,
        renderOrder: RENDER_ORDER.particles,
        sizeScale,
        tones,
        seed,
      });
    this.down = stream(FLOW.down.count, 'drillPipe', TONES.fresh, 1, FLOW.seed);
    this.up = stream(FLOW.up.count, 'annulus', TONES.returns, 1, FLOW.seed + 1);
    this.bubbles = stream(
      FLOW.bubbles.count,
      'annulus',
      TONES.gas,
      FLOW.bubbles.size,
      FLOW.seed + 2,
    );
    this.loss = stream(FLOW.loss.count, 'annulus', TONES.loss, 1, FLOW.seed + 3);
    this.cracks = new CracksPart(context);
    this.streams = [this.down, this.up, this.bubbles, this.loss];
    this.object.add(
      this.down.points,
      this.up.points,
      this.bubbles.points,
      this.loss.points,
      this.cracks.object,
    );
  }

  configure(frame: MudFrame): void {
    this.frame = frame;
    const drilling = frame.bitDepth > SEABED_DEPTH_M;
    this.object.visible = frame.shown && drilling;
    const hole = holeAt(frame.bitDepth);
    const bitY = wellY(frame.bitDepth, frame.seaOffset);
    const seabedY = SEABED_Y + frame.seaOffset;
    const exit = frame.wellhead ? WELLHEAD_TOP + frame.seaOffset : seabedY;
    this.column = {
      bitY,
      bitTop: bitY + BIT_HEIGHT * hole.radius,
      collarTop: Math.min(
        wellY(frame.bitDepth - STRING.collarLength, frame.seaOffset),
        frame.quillY,
      ),
      collarRadius: collarRadius(hole.section.holeInches),
      holeRadius: hole.radius,
      exitY: frame.landed ? RISER.diverter.bottom : exit,
      seabedY,
      seaY: frame.seaOffset,
      lastSet: lastSetCasing(frame.bitDepth),
    };
    const heavy = frame.state === 'heavy';
    this.bubbles.setVisible(frame.state === 'light');
    this.loss.setVisible(heavy);
    this.cracks.setVisible(heavy);
    this.cracks.place(bitY + BIT_HEIGHT * hole.radius * CRACK_HEIGHT_SHARE, hole.radius);
  }

  update(deltaSeconds: number, time: number, pointSize: number): void {
    const { frame, column } = this;
    if (!frame || !column || !this.object.visible) return;
    for (const stream of this.streams) stream.setSize(pointSize);
    this.flowDown(deltaSeconds, frame, column);
    this.flowUp(deltaSeconds, frame, column);
    if (frame.state === 'light') this.rise(deltaSeconds, time, frame, column);
    if (frame.state === 'heavy') this.leak(deltaSeconds, column);
  }

  private innerRadius(y: number, column: Column): number {
    return y < column.collarTop ? column.collarRadius : PIPE_RADIUS;
  }

  private outerRadius(y: number, frame: MudFrame, column: Column): number {
    if (y >= column.seabedY) return RISER_BORE;
    return annulusWall(yToDepth(y - frame.seaOffset), column.lastSet);
  }

  private flowDown(deltaSeconds: number, frame: MudFrame, column: Column): void {
    const length = Math.max(frame.quillY - column.bitTop, 1);
    this.down.advance((FLOW.down.speed * deltaSeconds) / length, 1);
    const downParticles = this.down.particles;
    for (let index = 0; index < downParticles.length; index++) {
      const particle = downParticles[index];
      const y = lerp(frame.quillY, column.bitTop, particle.progress);
      const radius = this.innerRadius(y, column);
      const x = (particle.lane - 1 / 2) * radius * DOWN_SPREAD;
      this.down.put(index, x, y, radius + STREAM_LIFT, 1);
    }
    this.down.commit();
  }

  private annulusPoint(
    stream: Stream,
    index: number,
    y: number,
    frame: MudFrame,
    column: Column,
    alpha: number,
    shiftX = 0,
  ) {
    const particle = stream.particles[index];
    const inner = this.innerRadius(y, column);
    const outer = Math.max(this.outerRadius(y, frame, column), inner);
    const x =
      shiftX + particle.side * (inner + (LANE.from + LANE.span * particle.lane) * (outer - inner));
    const z = STREAM_LIFT + particle.depth * DEPTH_SHARE * (outer - inner);
    stream.put(index, x, y, z, alpha);
  }

  private flowUp(deltaSeconds: number, frame: MudFrame, column: Column): void {
    const boost = frame.state === 'light' ? FLOW.up.lightBoost : 1;
    const length = Math.max(column.exitY - column.bitY, 1);
    const span = frame.landed ? 1 : 1 + FLOW.plume.share;
    this.up.advance((FLOW.up.speed * boost * deltaSeconds) / length, span);
    const heavy = frame.state === 'heavy';
    const upParticles = this.up.particles;
    for (let index = 0; index < upParticles.length; index++) {
      const particle = upParticles[index];
      if (particle.progress > 1) {
        this.plume(index, (particle.progress - 1) / FLOW.plume.share, column);
        continue;
      }
      const y = lerp(column.bitY, column.exitY, particle.progress);
      const lost = heavy && particle.lane > FLOW.up.heavyShare;
      const alpha = lost ? Math.max(0, 1 - (y - column.bitY) / HEAVY_FADE) : 1;
      this.annulusPoint(this.up, index, y, frame, column, alpha);
    }
    this.up.commit();
  }

  private plume(index: number, share: number, column: Column): void {
    const particle = this.up.particles[index];
    const reach = column.holeRadius + share * FLOW.plume.radius * (PLUME_MIN_REACH + particle.lane);
    const y = column.exitY + Math.sin(share * Math.PI) * FLOW.plume.rise * particle.depth;
    const z = Math.abs(Math.sin(particle.angle)) * reach * -1;
    this.up.put(index, Math.cos(particle.angle) * reach, y, z, (1 - share) * PLUME_FADE);
  }

  private rise(deltaSeconds: number, time: number, frame: MudFrame, column: Column): void {
    const top = frame.landed ? column.exitY : column.seaY;
    const length = Math.max(top - column.bitY, 1);
    this.bubbles.advance((FLOW.bubbles.speed * deltaSeconds) / length, 1);
    const bubblesParticles = this.bubbles.particles;
    for (let index = 0; index < bubblesParticles.length; index++) {
      const particle = bubblesParticles[index];
      const y = lerp(column.bitY, top, particle.progress);
      const wobble = Math.sin(time * BUBBLE_RATE + particle.angle) * FLOW.bubbles.wobble;
      if (y > column.exitY) {
        const alpha = 1 - particle.progress;
        this.bubbles.put(index, wobble * SEA_DRIFT, y, particle.depth * SEA_SPREAD, alpha);
        continue;
      }
      this.annulusPoint(this.bubbles, index, y, frame, column, 1, wobble);
    }
    this.bubbles.commit();
  }

  private leak(deltaSeconds: number, column: Column): void {
    const paths = this.cracks.paths;
    this.loss.advance((FLOW.loss.speed * deltaSeconds) / CRACKS.length[1], 1);
    const lossParticles = this.loss.particles;
    for (let index = 0; index < lossParticles.length; index++) {
      const particle = lossParticles[index];
      const path = paths[index % paths.length];
      const points = path.points;
      const along = particle.progress * (points.length - 1);
      const step = Math.min(Math.floor(along), points.length - 2);
      const share = along - step;
      const x = lerp(points[step].x, points[step + 1].x, share);
      const y = lerp(points[step].y, points[step + 1].y, share);
      const alpha = 1 - particle.progress;
      const baseY = this.cracks.object.position.y;
      this.loss.put(
        index,
        path.side * column.holeRadius + x,
        baseY + y,
        CRACKS.lift + LOSS_LIFT,
        alpha,
      );
    }
    this.loss.commit();
  }
}
