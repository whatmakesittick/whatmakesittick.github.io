import type { Point2 } from '../inset/strokes';

export type Segment = readonly [Point2, Point2];
export type Triangle = readonly [Point2, Point2, Point2];

export interface BracketSpec {
  readonly line: number;
  readonly top: number;
  readonly bottom: number;
  readonly extension: readonly [from: number, to: number];
}

export interface BracketStyle {
  readonly arrowLength: number;
  readonly arrowHalf: number;
  readonly stem: number;
}

export interface Bracket {
  readonly segments: readonly Segment[];
  readonly arrows: readonly Triangle[];
}

function arrow(line: number, tip: number, direction: number, style: BracketStyle): Triangle {
  const base = tip - direction * style.arrowLength;
  const right: Point2 = [line + style.arrowHalf, base];
  const left: Point2 = [line - style.arrowHalf, base];
  return direction < 0 ? [[line, tip], right, left] : [[line, tip], left, right];
}

export function bracket(spec: BracketSpec, style: BracketStyle): Bracket {
  const { line, top, bottom, extension } = spec;
  const [from, to] = extension;
  const upperBase = top + style.arrowLength;
  const lowerBase = bottom - style.arrowLength;
  return {
    segments: [
      [
        [from, top],
        [to, top],
      ],
      [
        [from, bottom],
        [to, bottom],
      ],
      [
        [line, upperBase],
        [line, upperBase + style.stem],
      ],
      [
        [line, lowerBase],
        [line, lowerBase - style.stem],
      ],
    ],
    arrows: [arrow(line, top, -1, style), arrow(line, bottom, 1, style)],
  };
}

export function grown(triangle: Triangle, by: number): Triangle {
  const centre: Point2 = [
    (triangle[0][0] + triangle[1][0] + triangle[2][0]) / 3,
    (triangle[0][1] + triangle[1][1] + triangle[2][1]) / 3,
  ];
  const push = ([x, y]: Point2): Point2 => {
    const length = Math.hypot(x - centre[0], y - centre[1]) || 1;
    return [x + ((x - centre[0]) / length) * by, y + ((y - centre[1]) / length) * by];
  };
  return [push(triangle[0]), push(triangle[1]), push(triangle[2])];
}

export function towardViewer(z: number): number {
  return -z;
}
