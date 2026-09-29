import { AdditiveBlending, Color, Group, NormalBlending } from 'three';
import { PointCloud, createPointMaterial } from '@core/scene/pointCloud';
import { STREAM_IDS } from '../../../ids';
import type { PropellantId, StreamId } from '../../../ids';
import { STREAM_PATHS } from '../../../model';
import type { Point } from '../../../model';
import { THEME } from '../../../theme';
import { FLOW } from '../../constants';
import { seededRandom } from '../../geometry/random';
import { pointAlong, samplePath, shareCounts } from '../../geometry/streamPath';
import type { SampledPath } from '../../geometry/streamPath';
import { registered } from '../context';
import type { PartContext } from '../context';

const XYZ = 3;
const LABEL_SHARE = 1 / 3;

const LIQUIDS: Readonly<Record<StreamId, PropellantId | null>> = {
  liquidOxygen: 'oxygen',
  liquidMethane: 'methane',
  oxygenRichGas: null,
  methaneRichGas: null,
};

export function isLiquid(id: StreamId): boolean {
  return LIQUIDS[id] !== null;
}

export function streamAlpha(id: StreamId, propellant: PropellantId | null, gas: number): number {
  const liquid = LIQUIDS[id];
  if (liquid === null) return Math.min(1, gas * 2);
  return propellant === null || liquid === propellant ? 1 : FLOW.dimmedShare;
}

export function labelPoint(id: StreamId): Point {
  const [path] = STREAM_PATHS[id];
  const sampled = samplePath(path, FLOW.samplesPerPath);
  const [x, y, z] = pointAlong(sampled, LABEL_SHARE, [0, 0, 0]);
  return [x, y, Math.max(z, 0) + FLOW.lift];
}

class FlowStream {
  readonly cloud: PointCloud;
  private readonly id: StreamId;
  private readonly paths: SampledPath[];
  private readonly pathOf: Uint8Array;
  private readonly share: Float32Array;
  private readonly offset: Float32Array;
  private readonly colour: Color;
  private readonly sample = [0, 0, 0];
  private alpha = -1;

  constructor(context: PartContext, id: StreamId, seed: number) {
    this.id = id;
    const liquid = isLiquid(id);
    const count = FLOW.counts[id];
    const material = registered(
      context,
      id,
      createPointMaterial(
        context.textures.dot,
        liquid ? FLOW.liquidSize : FLOW.gasSize,
        liquid ? NormalBlending : AdditiveBlending,
      ),
    );
    material.opacity = 0.99;
    this.cloud = context.tracker.track(new PointCloud(count, material, 4));
    this.colour = new Color(THEME[id]);
    this.paths = STREAM_PATHS[id].map((path) => samplePath(path, FLOW.samplesPerPath));
    this.pathOf = new Uint8Array(count);
    this.share = new Float32Array(count);
    this.offset = new Float32Array(count * XYZ);
    const random = seededRandom(seed);
    const spread = liquid ? FLOW.liquidSpread : FLOW.gasSpread;
    const counts = shareCounts(
      this.paths.map((path) => path.length),
      count,
    );
    let index = 0;
    counts.forEach((pathCount, path) => {
      for (let step = 0; step < pathCount; step += 1, index += 1) {
        this.pathOf[index] = path;
        this.share[index] = (step + random() * 0.8) / pathCount;
        for (let axis = 0; axis < XYZ; axis += 1) {
          this.offset[index * XYZ + axis] = (random() * 2 - 1) * spread;
        }
      }
    });
    this.place();
  }

  advance(distance: number): void {
    for (let index = 0; index < this.share.length; index += 1) {
      const next = this.share[index] + distance / this.paths[this.pathOf[index]].length;
      this.share[index] = next - Math.floor(next);
    }
    this.place();
  }

  setAlpha(alpha: number): void {
    if (alpha === this.alpha) return;
    this.alpha = alpha;
    for (let index = 0; index < this.share.length; index += 1) {
      this.cloud.setColor(index, this.colour.r, this.colour.g, this.colour.b, alpha);
    }
    this.cloud.commit();
  }

  speed(): number {
    return isLiquid(this.id) ? FLOW.liquidSpeed : FLOW.gasSpeed;
  }

  private place(): void {
    for (let index = 0; index < this.share.length; index += 1) {
      const [x, y, z] = pointAlong(this.paths[this.pathOf[index]], this.share[index], this.sample);
      const offset = index * XYZ;
      this.cloud.setPoint(
        index,
        x + this.offset[offset],
        y + this.offset[offset + 1],
        z + this.offset[offset + 2] * 0.3 + FLOW.lift,
      );
    }
    this.cloud.commit();
  }
}

export class FlowStreamsPart {
  readonly object = new Group();
  private readonly streams: FlowStream[];

  constructor(context: PartContext) {
    this.streams = STREAM_IDS.map((id, index) => new FlowStream(context, id, FLOW.seed + index));
    this.streams.forEach((stream) => this.object.add(stream.cloud.points));
  }

  setShown(shown: boolean): void {
    this.object.visible = shown;
  }

  get shown(): boolean {
    return this.object.visible;
  }

  advance(seconds: number, flow: number): void {
    if (seconds === 0 || flow === 0) return;
    this.streams.forEach((stream) => stream.advance(stream.speed() * flow * seconds));
  }

  setEmphasis(propellant: PropellantId | null, gas: number): void {
    STREAM_IDS.forEach((id, index) =>
      this.streams[index].setAlpha(streamAlpha(id, propellant, gas)),
    );
  }
}
