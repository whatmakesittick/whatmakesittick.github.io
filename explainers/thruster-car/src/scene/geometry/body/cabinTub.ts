import { Shape, Vector2 } from 'three';
import type { BufferGeometry } from 'three';
import {
  extrudePlan,
  extrudeProfileAlongX,
  planShape,
  roundedRectShape,
} from '@core/scene/geometry/extrude';
import { ARCH } from './arches';
import { shellHalfWidth } from './cabinFit';
import { MeshBuilder, scale, sub } from './mesh';
import type { Vec3 } from './mesh';
import { BODY_X } from './profile';
import { BodySurface, spot } from './surface';

export const TUB = {
  rear: -0.8,
  bottom: 0.012,
  top: 0.05,
  sideGap: 0.035,
  wellGap: 0.035,
  wellFront: 0.02,
  footwell: 1.18,
} as const;

export const SILL = { top: 0.22, width: 0.08, radius: 0.02 } as const;

const BULKHEAD = { depth: 0.03, top: 0.8, inset: 0.03, steps: 14 } as const;
const FIREWALL = { depth: 0.03, top: 0.64, radius: 0.03 } as const;
const LINER = { offset: 0.03, from: 0.1, edge: 0.02, columns: 16, rows: 10 } as const;

function tubHalfWidth(): number {
  const samples = [TUB.rear, 0, BODY_X.doorFront];
  return Math.min(...samples.map((x) => shellHalfWidth(x, TUB.top))) - TUB.sideGap;
}

function wellStart(): number {
  return Math.min(...ARCH.centresX.filter((x) => x > 0)) - ARCH.radius - TUB.wellFront;
}

function floorPlate(): BufferGeometry {
  const half = tubHalfWidth();
  const well = wellStart();
  const narrow = ARCH.innerZ - TUB.wellGap;
  const outline = [
    { x: TUB.rear, z: -half },
    { x: well, z: -half },
    { x: well, z: -narrow },
    { x: TUB.footwell, z: -narrow },
    { x: TUB.footwell, z: narrow },
    { x: well, z: narrow },
    { x: well, z: half },
    { x: TUB.rear, z: half },
  ];
  return extrudePlan(planShape(outline), TUB.bottom, TUB.top);
}

function sills(): BufferGeometry[] {
  const half = tubHalfWidth();
  return [-1, 1].map((sign) => {
    const inner = sign * (half - SILL.width);
    const rect = {
      minA: Math.min(inner, sign * half),
      maxA: Math.max(inner, sign * half),
      minB: TUB.top,
      maxB: SILL.top,
    };
    return extrudeProfileAlongX(roundedRectShape(rect, SILL.radius), TUB.rear, wellStart());
  });
}

function bulkheadOutline(): Shape {
  const x = TUB.rear;
  const heights = Array.from(
    { length: BULKHEAD.steps + 1 },
    (_, step) => TUB.top + ((BULKHEAD.top - TUB.top) * step) / BULKHEAD.steps,
  );
  const right = heights.map((y) => new Vector2(shellHalfWidth(x, y) - BULKHEAD.inset, y));
  const left = [...right].reverse().map(({ x: across, y }) => new Vector2(-across, y));
  return new Shape([...right, ...left]);
}

function bulkhead(): BufferGeometry {
  return extrudeProfileAlongX(bulkheadOutline(), TUB.rear - BULKHEAD.depth, TUB.rear);
}

function firewall(): BufferGeometry {
  const narrow = ARCH.innerZ - TUB.wellGap;
  const rect = { minA: -narrow, maxA: narrow, minB: TUB.top, maxB: FIREWALL.top };
  return extrudeProfileAlongX(
    roundedRectShape(rect, FIREWALL.radius),
    TUB.footwell,
    TUB.footwell + FIREWALL.depth,
  );
}

function doorLiner(surface = new BodySurface()): BufferGeometry {
  const builder = new MeshBuilder();
  const { columns, rows, offset, edge } = LINER;
  const [fromX, toX] = [BODY_X.doorRear + edge, BODY_X.doorFront - edge];
  const [fromS, toS] = [spot('side', LINER.from), spot('belt', 0)];
  const grid = Array.from({ length: columns + 1 }, (_, i) =>
    Array.from({ length: rows + 1 }, (_, j) => {
      const x = fromX + ((toX - fromX) * i) / columns;
      const s = fromS + ((toS - fromS) * j) / rows;
      const normal = surface.normal(x, s, -1);
      const inward: Vec3 = scale(normal, -1);
      return builder.vertex(sub(surface.point(x, s, -1), scale(normal, offset)), inward);
    }),
  );
  for (let i = 0; i < columns; i += 1) {
    for (let j = 0; j < rows; j += 1) {
      builder.quad(grid[i][j], grid[i + 1][j], grid[i + 1][j + 1], grid[i][j + 1]);
    }
  }
  return builder.build();
}

export interface TubGeometry {
  floor: BufferGeometry[];
  walls: BufferGeometry[];
}

export function buildTub(): TubGeometry {
  return { floor: [floorPlate(), ...sills(), firewall()], walls: [bulkhead(), doorLiner()] };
}
