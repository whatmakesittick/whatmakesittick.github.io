import type { EngineId } from '../ids';
import type { CycleBox } from './format';

export type DiagramPoint = readonly [x: number, y: number];

export type NodeKind = 'tank' | 'pump' | 'boostPump' | 'burner' | 'turbine' | 'chamber';

export type TankSide = 'oxygen' | 'fuel';

export type DiagramStream = TankSide | 'oxygenRichGas' | 'fuelRichGas' | 'overboard';

export interface DiagramNode {
  kind: NodeKind;
  label: CycleBox;
  centre: DiagramPoint;
  width: number;
  height: number;
  side?: TankSide;
}

export interface DiagramLink {
  points: readonly DiagramPoint[];
  stream: DiagramStream;
  thin?: boolean;
}

export interface CycleDiagram {
  nodes: readonly DiagramNode[];
  links: readonly DiagramLink[];
  shafts: readonly (readonly [DiagramPoint, DiagramPoint])[];
  overboardLabel?: DiagramPoint;
}

export const DIAGRAM_SIZE = { width: 640, height: 300 } as const;

const NODE_SIZES: Readonly<Record<NodeKind, readonly [width: number, height: number]>> = {
  tank: [80, 46],
  pump: [76, 36],
  boostPump: [56, 30],
  burner: [92, 36],
  turbine: [76, 36],
  chamber: [72, 72],
};

const TWIN_CHAMBER_HEIGHT = 56;
const OXYGEN_ROW = 60;
const FUEL_ROW = 240;
const MIDDLE_ROW = 150;
const TANK_X = 50;
const PUMP_X = 160;
const BURNER_X = 285;
const TURBINE_X = 400;
const CHAMBER_X = 500;

function node(kind: NodeKind, label: CycleBox, x: number, y: number): DiagramNode {
  const [width, height] = NODE_SIZES[kind];
  return { kind, label, centre: [x, y], width, height };
}

function tank(side: TankSide, x: number): DiagramNode {
  const row = side === 'oxygen' ? OXYGEN_ROW : FUEL_ROW;
  return { ...node('tank', side, x, row), side };
}

function chamber(y: number, height: number): DiagramNode {
  return { ...node('chamber', 'chamber', CHAMBER_X, y), height };
}

const TANKS = [tank('oxygen', TANK_X), tank('fuel', TANK_X)];

const SINGLE_SHAFT_PUMPS = [
  node('pump', 'pump', PUMP_X, OXYGEN_ROW),
  node('pump', 'pump', PUMP_X, FUEL_ROW),
  node('turbine', 'turbine', PUMP_X, MIDDLE_ROW),
];

const SINGLE_SHAFT: readonly [DiagramPoint, DiagramPoint] = [
  [PUMP_X, OXYGEN_ROW],
  [PUMP_X, FUEL_ROW],
];

const TANK_FEEDS: readonly DiagramLink[] = [
  {
    points: [
      [90, OXYGEN_ROW],
      [122, OXYGEN_ROW],
    ],
    stream: 'oxygen',
  },
  {
    points: [
      [90, FUEL_ROW],
      [122, FUEL_ROW],
    ],
    stream: 'fuel',
  },
];

const MERLIN: CycleDiagram = {
  nodes: [
    ...TANKS,
    ...SINGLE_SHAFT_PUMPS,
    node('burner', 'gasGenerator', BURNER_X, 105),
    chamber(MIDDLE_ROW, NODE_SIZES.chamber[1]),
  ],
  shafts: [SINGLE_SHAFT],
  links: [
    ...TANK_FEEDS,
    {
      points: [
        [198, 60],
        [452, 60],
        [452, 138],
        [464, 138],
      ],
      stream: 'oxygen',
    },
    {
      points: [
        [198, 240],
        [452, 240],
        [452, 162],
        [464, 162],
      ],
      stream: 'fuel',
    },
    {
      points: [
        [270, 60],
        [270, 87],
      ],
      stream: 'oxygen',
      thin: true,
    },
    {
      points: [
        [300, 240],
        [300, 123],
      ],
      stream: 'fuel',
      thin: true,
    },
    {
      points: [
        [239, 105],
        [185, 105],
        [185, 132],
      ],
      stream: 'fuelRichGas',
    },
    {
      points: [
        [122, 150],
        [62, 150],
      ],
      stream: 'overboard',
    },
  ],
  overboardLabel: [92, 172],
};

const RS25: CycleDiagram = {
  nodes: [
    tank('oxygen', 42),
    tank('fuel', 42),
    node('boostPump', 'boostPump', 112, OXYGEN_ROW),
    node('boostPump', 'boostPump', 112, FUEL_ROW),
    node('pump', 'pump', 184, OXYGEN_ROW),
    node('pump', 'pump', 184, FUEL_ROW),
    node('burner', 'preburner', 290, 110),
    node('burner', 'preburner', 290, 190),
    node('turbine', 'turbine', TURBINE_X, OXYGEN_ROW),
    node('turbine', 'turbine', TURBINE_X, FUEL_ROW),
    chamber(MIDDLE_ROW, NODE_SIZES.chamber[1]),
  ],
  shafts: [
    [
      [184, OXYGEN_ROW],
      [TURBINE_X, OXYGEN_ROW],
    ],
    [
      [184, FUEL_ROW],
      [TURBINE_X, FUEL_ROW],
    ],
  ],
  links: [
    {
      points: [
        [82, 60],
        [84, 60],
      ],
      stream: 'oxygen',
    },
    {
      points: [
        [82, 240],
        [84, 240],
      ],
      stream: 'fuel',
    },
    {
      points: [
        [140, 60],
        [146, 60],
      ],
      stream: 'oxygen',
    },
    {
      points: [
        [140, 240],
        [146, 240],
      ],
      stream: 'fuel',
    },
    {
      points: [
        [184, 78],
        [184, 146],
        [464, 146],
      ],
      stream: 'oxygen',
    },
    {
      points: [
        [184, 222],
        [184, 190],
        [244, 190],
      ],
      stream: 'fuel',
    },
    {
      points: [
        [214, 190],
        [214, 110],
        [244, 110],
      ],
      stream: 'fuel',
    },
    {
      points: [
        [262, 146],
        [262, 128],
      ],
      stream: 'oxygen',
      thin: true,
    },
    {
      points: [
        [262, 146],
        [262, 172],
      ],
      stream: 'oxygen',
      thin: true,
    },
    {
      points: [
        [336, 110],
        [400, 110],
        [400, 78],
      ],
      stream: 'fuelRichGas',
    },
    {
      points: [
        [336, 190],
        [400, 190],
        [400, 222],
      ],
      stream: 'fuelRichGas',
    },
    {
      points: [
        [438, 60],
        [452, 60],
        [452, 128],
        [464, 128],
      ],
      stream: 'fuelRichGas',
    },
    {
      points: [
        [438, 240],
        [452, 240],
        [452, 166],
        [464, 166],
      ],
      stream: 'fuelRichGas',
    },
  ],
};

const RD180: CycleDiagram = {
  nodes: [
    ...TANKS,
    ...SINGLE_SHAFT_PUMPS,
    node('burner', 'preburner', BURNER_X, 105),
    chamber(96, TWIN_CHAMBER_HEIGHT),
    chamber(200, TWIN_CHAMBER_HEIGHT),
  ],
  shafts: [SINGLE_SHAFT],
  links: [
    ...TANK_FEEDS,
    {
      points: [
        [198, 60],
        [285, 60],
        [285, 87],
      ],
      stream: 'oxygen',
    },
    {
      points: [
        [320, 240],
        [320, 123],
      ],
      stream: 'fuel',
      thin: true,
    },
    {
      points: [
        [239, 105],
        [185, 105],
        [185, 132],
      ],
      stream: 'oxygenRichGas',
    },
    {
      points: [
        [198, 150],
        [446, 150],
        [446, 90],
        [464, 90],
      ],
      stream: 'oxygenRichGas',
    },
    {
      points: [
        [446, 150],
        [446, 192],
        [464, 192],
      ],
      stream: 'oxygenRichGas',
    },
    {
      points: [
        [198, 240],
        [458, 240],
        [458, 214],
        [464, 214],
      ],
      stream: 'fuel',
    },
    {
      points: [
        [458, 214],
        [458, 110],
        [464, 110],
      ],
      stream: 'fuel',
    },
  ],
};

const RAPTOR: CycleDiagram = {
  nodes: [
    ...TANKS,
    node('pump', 'pump', PUMP_X, OXYGEN_ROW),
    node('pump', 'pump', PUMP_X, FUEL_ROW),
    node('burner', 'preburner', BURNER_X, 110),
    node('burner', 'preburner', BURNER_X, 190),
    node('turbine', 'turbine', TURBINE_X, OXYGEN_ROW),
    node('turbine', 'turbine', TURBINE_X, FUEL_ROW),
    chamber(MIDDLE_ROW, NODE_SIZES.chamber[1]),
  ],
  shafts: [
    [
      [PUMP_X, OXYGEN_ROW],
      [TURBINE_X, OXYGEN_ROW],
    ],
    [
      [PUMP_X, FUEL_ROW],
      [TURBINE_X, FUEL_ROW],
    ],
  ],
  links: [
    ...TANK_FEEDS,
    {
      points: [
        [160, 78],
        [160, 110],
        [239, 110],
      ],
      stream: 'oxygen',
    },
    {
      points: [
        [160, 222],
        [160, 190],
        [239, 190],
      ],
      stream: 'fuel',
    },
    {
      points: [
        [190, 110],
        [190, 178],
        [239, 178],
      ],
      stream: 'oxygen',
      thin: true,
    },
    {
      points: [
        [204, 190],
        [204, 122],
        [239, 122],
      ],
      stream: 'fuel',
      thin: true,
    },
    {
      points: [
        [331, 110],
        [400, 110],
        [400, 78],
      ],
      stream: 'oxygenRichGas',
    },
    {
      points: [
        [331, 190],
        [400, 190],
        [400, 222],
      ],
      stream: 'fuelRichGas',
    },
    {
      points: [
        [438, 60],
        [452, 60],
        [452, 132],
        [464, 132],
      ],
      stream: 'oxygenRichGas',
    },
    {
      points: [
        [438, 240],
        [452, 240],
        [452, 168],
        [464, 168],
      ],
      stream: 'fuelRichGas',
    },
  ],
};

export const CYCLE_DIAGRAMS: Readonly<Record<EngineId, CycleDiagram>> = {
  merlin: MERLIN,
  rs25: RS25,
  rd180: RD180,
  raptor: RAPTOR,
};
