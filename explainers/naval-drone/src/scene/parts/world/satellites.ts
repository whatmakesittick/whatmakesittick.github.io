import { DoubleSide, Group, LatheGeometry, Object3D, Vector2 } from 'three';
import type { BufferGeometry } from 'three';
import type { MaterialFinish } from '@core/scene/materials';
import { toRadians } from '@core/math';
import { spread } from '../../geometry/curves';
import type { Vec3 } from '../../geometry/surface';
import { mergeParts, partMesh } from '../context';
import type { EmphasisGroup, PartContext } from '../context';
import { canvasTexture, seededRandom } from '../surfaces';
import { box, rod } from './ship/kit';

export interface SatellitePart {
  object: Group;
  anchor: Object3D;
}

type Part = readonly [BufferGeometry[], MaterialFinish];

const TILT = toRadians(55);
const SCALE = 1.25;
const SIDES = [-1, 1] as const;
const FRAME_U = 0.9;
const TOP_FACES = [8, 16] as const;

const CELLS = {
  size: [512, 128],
  grid: [48, 10],
  colours: ['#0a1430', '#1a2d62', '#9aa8b8', '#c8ccd2'],
} as const;
const FOIL = { size: 256, facets: 1400, seed: 13, shade: [175, 80], reach: 20, repeat: 3 } as const;

const STARLINK = {
  foil: '#cdd3da',
  body: [9, 0.8, 4.6] as Vec3,
  panel: [1.9, 0.16, 1.9] as Vec3,
  pitch: 2.2,
  rows: 3,
  boom: [4.5, 6.2, 0.12] as const,
  wing: [21, 0.08, 4.2] as Vec3,
  spine: 0.07,
} as const;

const BACKUP = {
  foil: '#d6a743',
  body: [5, 5.5, 5] as Vec3,
  radiator: [4.2, 4.6, 0.12] as Vec3,
  deck: [3.5, 0.3, 3.5] as Vec3,
  wing: { from: 4.5, count: 3, panel: [3.2, 0.07, 2.8] as Vec3, gap: 0.15, yoke: 0.1 },
  dishes: [
    [1, 2.1, 0.55, 1.2, 1.4, 0.45],
    [-1, 1.2, 0.32, 1.6, 0.9, 0.5],
  ],
  rings: 6,
  segments: 32,
} as const;

function looks(
  context: PartContext,
  colour: string,
): Record<'foil' | 'cells' | 'white' | 'dark', MaterialFinish> {
  const { size, facets, seed, shade, reach, repeat } = FOIL;
  const random = seededRandom(seed);
  const grey = (alpha: number) => {
    const level = Math.round(shade[0] + random() * shade[1]);
    return `rgba(${level}, ${level}, ${level}, ${alpha})`;
  };
  const foil = canvasTexture(
    size,
    size,
    (pen) => {
      pen.fillStyle = grey(1);
      pen.fillRect(0, 0, size, size);
      for (let at = 0; at < facets; at += 1) {
        const [x, y] = [random() * size, random() * size];
        pen.fillStyle = grey(1 / 2);
        pen.beginPath();
        [0, 1, 2].forEach(() =>
          pen.lineTo(x + (random() - 1 / 2) * reach, y + (random() - 1 / 2) * reach),
        );
        pen.fill();
      }
    },
    true,
  );
  foil.repeat.set(repeat, repeat);
  const [width, height] = CELLS.size;
  const [columns, rows] = CELLS.grid;
  const [deep, bright, line, frame] = CELLS.colours;
  const cells = canvasTexture(width, height, (pen) => {
    const gradient = pen.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, deep);
    gradient.addColorStop(1, bright);
    pen.fillStyle = frame;
    pen.fillRect(0, 0, width, height);
    pen.fillStyle = gradient;
    pen.fillRect(0, 1, width * FRAME_U, height - 2);
    pen.fillStyle = line;
    for (let at = 1; at < columns; at += 1)
      pen.fillRect((at * width * FRAME_U) / columns, 0, 1, height);
    for (let at = 1; at < rows; at += 1) pen.fillRect(0, (at * height) / rows, width * FRAME_U, 1);
  });
  [foil, cells].forEach((texture) => context.tracker.track(texture));
  return {
    foil: {
      color: colour,
      map: foil,
      bumpMap: foil,
      metalness: 1,
      roughness: 0.32,
      envMapIntensity: 1.6,
      fog: false,
    },
    cells: { map: cells, metalness: 0.55, roughness: 0.22, envMapIntensity: 1.8, fog: false },
    white: { color: '#e7e6e0', roughness: 0.4, metalness: 0.3, side: DoubleSide, fog: false },
    dark: { color: '#2b2e33', roughness: 0.45, metalness: 0.5, fog: false },
  };
}

function wing(size: Vec3): BufferGeometry {
  const slab = box(size, [0, 0, 0]);
  const uv = slab.getAttribute('uv');
  for (let at = 0; at < uv.count; at += 1) {
    const top = at >= TOP_FACES[0] && at < TOP_FACES[1];
    uv.setXY(at, top ? uv.getX(at) * FRAME_U : 1, uv.getY(at));
  }
  return slab.rotateX(TILT);
}

function satellite(
  context: PartContext,
  group: EmphasisGroup,
  parts: readonly Part[],
  offset: number,
) {
  const body = new Group();
  body.scale.setScalar(SCALE);
  body.position.x = -offset * SCALE;
  parts.forEach(([geometries, finish]) =>
    body.add(partMesh(context, mergeParts(geometries), group, finish)),
  );
  const anchor = new Object3D();
  anchor.position.x = body.position.x;
  const object = new Group();
  object.add(body, anchor);
  return { object, anchor };
}

export function createStarlinkSatellite(context: PartContext): SatellitePart {
  const look = looks(context, STARLINK.foil);
  const { body, panel, pitch, rows, boom, wing: size, spine } = STARLINK;
  const [from, to, radius] = boom;
  const end = to + size[0];
  const panels = spread(-rows / 2, rows / 2, rows).flatMap((row) =>
    SIDES.map((side) => box(panel, [row * pitch, -body[1] / 2, (side * pitch) / 2])),
  );
  return satellite(
    context,
    'satellite',
    [
      [[box(body, [0, 0, 0])], look.foil],
      [panels, look.white],
      [[wing(size).translate(to + size[0] / 2, 0, 0)], look.cells],
      [[rod([from, 0, 0], [to, 0, 0], radius), rod([to, 0, 0], [end, 0, 0], spine)], look.dark],
    ],
    (end - body[0] / 2) / 2,
  );
}

export function createBackupSatellite(context: PartContext): SatellitePart {
  const look = looks(context, BACKUP.foil);
  const { body, radiator, deck, wing: span, rings, segments } = BACKUP;
  const [width, height, depth] = body;
  const panels = SIDES.flatMap((side) =>
    spread(0, span.count - 1, span.count - 1).map((at) =>
      wing(span.panel)
        .rotateY(Math.PI / 2)
        .translate(0, 0, side * (span.from + span.panel[0] / 2 + at * (span.panel[0] + span.gap))),
    ),
  );
  const dishes = BACKUP.dishes.map(([side, radius, bowl, drop, out, tilt]) => {
    const profile = spread(0, 1, rings).map(
      (share) => new Vector2(share * radius, share * share * bowl),
    );
    return new LatheGeometry(profile, segments)
      .rotateX(Math.PI)
      .rotateZ(side * tilt)
      .translate(side * (width / 2 + out), -drop, 0);
  });
  const struts = BACKUP.dishes.map(([side, , bowl, drop, out]) =>
    rod([(side * width) / 2, bowl - drop, 0], [side * (width / 2 + out), -drop, 0], span.yoke),
  );
  return satellite(
    context,
    'backupSatellite',
    [
      [[box(body, [0, 0, 0])], look.foil],
      [SIDES.map((side) => box(radiator, [0, 0, (side * depth) / 2])), look.white],
      [panels, look.cells],
      [[box(deck, [0, -(height + deck[1]) / 2, 0]), ...dishes], look.white],
      [[...struts, rod([0, 0, -span.from], [0, 0, span.from], span.yoke)], look.dark],
    ],
    0,
  );
}
