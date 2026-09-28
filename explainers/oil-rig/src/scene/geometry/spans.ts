import type { BufferAttribute, BufferGeometry } from 'three';
import { clamp } from '@core/math';

export interface Span {
  vertices: readonly number[];
  low: number;
  high: number;
}

const XYZ = 3;
const UV = 2;

export class SpanEditor {
  private readonly geometry: BufferGeometry;
  private readonly spans: readonly Span[];
  private readonly uvFollowsY: boolean;
  private readonly first: number;
  private readonly last: number;

  constructor(geometry: BufferGeometry, spans: readonly Span[], uvFollowsY = false) {
    this.geometry = geometry;
    this.spans = spans;
    this.uvFollowsY = uvFollowsY;
    const all = spans.flatMap((span) => span.vertices);
    this.first = all.length > 0 ? Math.min(...all) : 0;
    this.last = all.length > 0 ? Math.max(...all) : -1;
  }

  moveTo(y: number): void {
    const position = this.geometry.getAttribute('position') as BufferAttribute;
    const uv = this.geometry.getAttribute('uv') as BufferAttribute | undefined;
    for (const span of this.spans) {
      const edge = clamp(y, span.low, span.high);
      for (const vertex of span.vertices) {
        position.setY(vertex, edge);
        if (uv && this.uvFollowsY) uv.setY(vertex, edge);
      }
    }
    this.flag(position, XYZ);
    if (uv && this.uvFollowsY) this.flag(uv, UV);
  }

  private flag(attribute: BufferAttribute, itemSize: number): void {
    if (this.last < this.first) return;
    attribute.clearUpdateRanges();
    attribute.addUpdateRange(this.first * itemSize, (this.last - this.first + 1) * itemSize);
    attribute.needsUpdate = true;
  }
}
