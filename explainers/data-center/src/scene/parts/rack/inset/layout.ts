import { INSET, INSET_SCALE } from '../../../../model';

export type Point2 = readonly [x: number, y: number];
export type Box2 = readonly [minX: number, minY: number, maxX: number, maxY: number];

interface Band {
  readonly bottom: number;
  readonly top: number;
}

const MARGIN = 0.08;
const STACK_BOTTOM = -0.44;
const PACKAGE_THICKNESS = {
  board: 0.042,
  balls: 0.024,
  substrate: 0.04,
  interposer: 0.016,
  die: 0.05,
  lowerPaste: 0.01,
  lid: 0.05,
  upperPaste: 0.01,
} as const;
const PLATE_THICKNESS = { plate: 0.15 } as const;
const SINK_THICKNESS = { base: 0.05, fins: 0.56 } as const;
const HALF = { substrate: 0.62, interposer: 0.41, lid: 0.48, plate: 0.52, sink: 0.7 } as const;
const DIE = { width: 0.25, gap: 0.02 } as const;
const MEMORY = { width: 0.1, gap: 0.025, layers: 4 } as const;
const LID_LEG = 0.035;
const BALL_PITCH = 0.05;
const CHANNEL = { half: 0.42, count: 21, width: 0.016, floor: 0.022, height: 0.07, plenum: 0.024 };
const HOSE = { port: 0.3, width: 0.06, rise: 0.1, bend: 0.18, reach: 0.9, bendSteps: 12 } as const;
const FIN = { count: 17, width: 0.024 } as const;
const AIR_ROWS = [0.22, 0.5, 0.78] as const;
const AIR = { from: -0.9, split: 0, to: 0.84, head: 0.07, width: 0.022 } as const;
const FIN_TIP_DROP = 0.1;

export const CONTENT_HALF = INSET.width / 2 - MARGIN;
export const SHOWN_HALF = CONTENT_HALF / INSET_SCALE;
export const FRAME = { inset: 0.025, width: 0.008 } as const;
export const STROKE = { line: 0.004, flowHead: 0.04 } as const;
export const MARKER = { core: 0.03, halo: 0.075 } as const;

function stack<K extends string>(bottom: number, heights: Readonly<Record<K, number>>) {
  let top = bottom;
  const bands = Object.entries<number>(heights).map(([key, height]) => {
    const band: Band = { bottom: top, top: top + height };
    top = band.top;
    return [key, band] as const;
  });
  return Object.fromEntries(bands) as Record<K, Band>;
}

export function row(fromX: number, toX: number, y: number, width: number): Box2 {
  return [fromX, y - width / 2, toX, y + width / 2];
}

function column(x: number, width: number, { bottom, top }: Band): Box2 {
  return [x - width / 2, bottom, x + width / 2, top];
}

function across(half: number, { bottom, top }: Band): Box2 {
  return [-half, bottom, half, top];
}

function pair(inner: number, outer: number, { bottom, top }: Band): Box2[] {
  return [
    [-outer, bottom, -inner, top],
    [inner, bottom, outer, top],
  ];
}

function middle({ bottom, top }: Band): number {
  return (bottom + top) / 2;
}

function spread(half: number, count: number): number[] {
  return Array.from({ length: count }, (_, index) => -half + (2 * half * index) / (count - 1));
}

const { board, balls, substrate, interposer, die, lowerPaste, lid, upperPaste } = stack(
  STACK_BOTTOM,
  PACKAGE_THICKNESS,
);
const { plate } = stack(upperPaste.top, PLATE_THICKNESS);
const { base, fins } = stack(upperPaste.top, SINK_THICKNESS);
const dieInner = DIE.gap / 2;
const dieOuter = dieInner + DIE.width;
const memoryInner = dieOuter + MEMORY.gap;
const memoryOuter = memoryInner + MEMORY.width;
const lidInner = HALF.lid - LID_LEG;
const ballCount = Math.floor((2 * HALF.substrate) / BALL_PITCH);
const memory = pair(memoryInner, memoryOuter, die);
const memoryStripes = memory.flatMap(([minX, minY, maxX, maxY]) =>
  Array.from({ length: MEMORY.layers - 1 }, (_, index) => {
    const y = minY + ((index + 1) * (maxY - minY)) / MEMORY.layers;
    return row(minX, maxX, y, STROKE.line);
  }),
);

export const PACKAGE = {
  board: across(CONTENT_HALF, board),
  balls: spread(HALF.substrate - BALL_PITCH / 2, ballCount).map((x): Point2 => [x, middle(balls)]),
  ballRadius: PACKAGE_THICKNESS.balls / 2,
  substrate: across(HALF.substrate, substrate),
  interposer: across(HALF.interposer, interposer),
  dies: pair(dieInner, dieOuter, die),
  memory,
  memoryStripes,
  paste: [across(memoryOuter, lowerPaste), across(HALF.lid, upperPaste)],
  lid: [
    across(HALF.lid, lid),
    ...pair(lidInner, HALF.lid, { bottom: substrate.top, top: lid.bottom }),
  ],
  lidOutlines: [
    across(HALF.lid, { bottom: substrate.top, top: lid.top }),
    across(lidInner, { bottom: substrate.top, top: lid.bottom }),
  ],
} as const;

const channelFloor = plate.bottom + CHANNEL.floor;
const channels = { bottom: channelFloor, top: channelFloor + CHANNEL.height };
const plenum = { bottom: channels.top, top: channels.top + CHANNEL.plenum };

function hosePath(side: number): Point2[] {
  const x = side * HOSE.port;
  const turnY = plate.top + HOSE.rise;
  const centre: Point2 = [x + side * HOSE.bend, turnY];
  const startAngle = side > 0 ? Math.PI : 0;
  const arc = Array.from({ length: HOSE.bendSteps + 1 }, (_, step): Point2 => {
    const angle = startAngle + ((Math.PI / 2 - startAngle) * step) / HOSE.bendSteps;
    return [centre[0] + HOSE.bend * Math.cos(angle), centre[1] + HOSE.bend * Math.sin(angle)];
  });
  return [[x, plate.top], ...arc, [side * HOSE.reach, turnY + HOSE.bend]];
}

const hoseY = plate.top + HOSE.rise + HOSE.bend;
const flowX = (HOSE.port + HOSE.bend + HOSE.reach) / 2;

export const COLD_PLATE = {
  body: across(HALF.plate, plate),
  water: [
    ...spread(CHANNEL.half, CHANNEL.count).map((x) => column(x, CHANNEL.width, channels)),
    across(CHANNEL.half, plenum),
  ],
  port: (side: number) =>
    column(side * HOSE.port, HOSE.width, { bottom: plenum.top, top: plate.top }),
  hose: hosePath,
  hoseWidth: HOSE.width,
  flowTips: [-flowX, flowX].map((x): Point2 => [x, hoseY]),
} as const;

const finCentres = spread(HALF.sink - FIN.width / 2, FIN.count);
const airRows = AIR_ROWS.map((share) => fins.bottom + share * (fins.top - fins.bottom));

export const HEAT_SINK = {
  base: across(HALF.sink, base),
  fins: finCentres.map((x) => column(x, FIN.width, fins)),
  coolShafts: airRows.map((y) => row(AIR.from, AIR.split, y, AIR.width)),
  warmShafts: airRows.map((y) => row(AIR.split, AIR.to, y, AIR.width)),
  airTips: airRows.map((y): Point2 => [AIR.to + AIR.head, y]),
  airHead: AIR.head,
} as const;

const dieX = -(dieInner + DIE.width / 2);
const finX = finCentres.reduce((best, x) =>
  Math.abs(x - dieX) < Math.abs(best - dieX) ? x : best,
);
const heatStart: Point2[] = [
  [dieX, middle(die)],
  [dieX, middle(lid)],
];

export const HEAT_PATH = {
  liquid: [...heatStart, [dieX, middle(channels)]],
  air: [...heatStart, [dieX, middle(base)], [finX, base.top], [finX, fins.top - FIN_TIP_DROP]],
} as const satisfies Record<string, readonly Point2[]>;

export const CURRENT_AT: Point2 = [dieX, middle(die)];
