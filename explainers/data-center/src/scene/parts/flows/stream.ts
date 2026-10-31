import { Vector3 } from 'three';
import type { EmphasisGroup, PartContext } from '../context';
import { FLOW_RATE } from './constants';
import { Cloud } from './points';
import type { Track } from './track';

export interface StreamLook {
  readonly reach: number;
  readonly density: number;
  readonly alpha: number;
  readonly color: string;
}

const HEAD_FADE = 0.6;
const TAIL_FADE = 0.4;
const position = new Vector3();

function ramp(value: number, span: number): number {
  return Math.min(Math.max(value / span, 0), 1);
}

export class Stream {
  readonly points: Cloud;
  private readonly track: Track;
  private readonly spacing: number;

  constructor(context: PartContext, group: EmphasisGroup, track: Track, size: number) {
    const count = Math.max(1, Math.ceil(track.flow));
    this.track = track;
    this.spacing = track.flow / count;
    this.points = new Cloud(context, group, count, { texture: context.textures.dot, size });
  }

  get object(): Cloud['object'] {
    return this.points.object;
  }

  get length(): number {
    return this.track.length;
  }

  flowAt(metres: number): number {
    return this.track.flowAtMetres(metres);
  }

  place(time: number, { reach, density, alpha, color }: StreamLook): void {
    const { flow } = this.track;
    for (let index = 0; index < this.points.count; index += 1) {
      const at = (index * this.spacing + time * FLOW_RATE) % flow;
      const shown = alpha > 0 && at <= reach && index % density === 0;
      if (!shown) {
        this.points.hide(index);
        continue;
      }
      this.track.pointAt(at, position);
      const fade = ramp(at, TAIL_FADE) * ramp(reach - at + HEAD_FADE * 0.25, HEAD_FADE);
      this.points.set(index, position.x, position.y, position.z, color, alpha * fade);
    }
    this.points.commit();
  }
}
