import { CatmullRomCurve3, CylinderGeometry, TubeGeometry, Vector3 } from 'three';
import type { Group } from 'three';
import type { Extent } from '@core/scene/regions';
import { BUSBAR, MANIFOLD, RACK, ROW_PIPE } from '../../../model';
import type { BoxSpec } from '../../../model';
import { label, namedGroup } from '../context';
import { QD_Y, QD_Z } from './compute';
import {
  COMPUTE_BANDS,
  POST_M,
  RACK_X,
  SHELF_BANDS,
  SKIN_M,
  SPAN,
  SWITCH_BANDS,
  TRAY_Z,
  around,
  middle,
} from './dims';
import { RACK_FINISHES } from './finishes';
import { box, rod } from './kit';
import type { Kit, Look } from './kit';

const BAR = { width: 0.036, depth: 0.024, gap: 0.008 } as const;
const CLIP = { width: 0.1, tall: 0.012 } as const;
const STANDOFF_M = 0.016;
const CROSSBAR = { tall: 0.03, depth: 0.012, gap: 0.003 } as const;
const PIPE_RADIUS = 0.022;
const PIPE_BOTTOM = 0.3;
const PIPE_TOP = RACK.height + 0.06;
const STUB_RADIUS = 0.008;
const COLLAR = { radius: 0.011, length: 0.01 } as const;
const COLLAR_GAP_M = 0.012;
const FITTING = { radius: 0.03, length: 0.03 } as const;
const HOSE_RADIUS = 0.018;
const HOSE_SWAY_M = 0.025;
const CLAMP_EVERY_M = 0.5;
const CLAMP = { tall: 0.02, depth: 0.012 } as const;
const BAR_FACE = BUSBAR.z - BAR.depth / 2;
const BAR_BACK = BUSBAR.z + BAR.depth / 2;
const CROSSBAR_Z: Extent = [
  MANIFOLD.z + PIPE_RADIUS + CROSSBAR.gap,
  MANIFOLD.z + PIPE_RADIUS + CROSSBAR.gap + CROSSBAR.depth,
];
const ZONES = [BUSBAR.lower, BUSBAR.upper];
const PIPES: ReadonlyArray<readonly [number, Look]> = [
  [MANIFOLD.supplyX, 'pipeSupply'],
  [MANIFOLD.returnX, 'pipeReturn'],
];

function inZone(band: Extent): boolean {
  const centre = middle(band);
  return ZONES.some(([from, to]) => centre > from && centre < to);
}

function bars(): BoxSpec[] {
  const offset = (BAR.width + BAR.gap) / 2;
  return ZONES.flatMap((zone) =>
    [-offset, offset].map((dx) =>
      box(around(RACK_X + dx, BAR.width), zone, around(BUSBAR.z, BAR.depth)),
    ),
  );
}

function clips(): BoxSpec[] {
  return [...SHELF_BANDS, ...COMPUTE_BANDS, ...SWITCH_BANDS]
    .filter(inZone)
    .map((band) =>
      box(around(RACK_X, CLIP.width), around(middle(band), CLIP.tall), [
        TRAY_Z[1],
        BAR_FACE + 0.002,
      ]),
    );
}

function mounts(): { spines: BoxSpec[]; standoffs: BoxSpec[]; crossbars: BoxSpec[] } {
  const inner: Extent = [SPAN.x[0] + SKIN_M + POST_M, SPAN.x[1] - SKIN_M - POST_M];
  const ends = ZONES.flatMap(([from, to]) => [from + CROSSBAR.tall / 2, to - CROSSBAR.tall / 2]);
  return {
    spines: ZONES.map((zone) =>
      box(around(RACK_X, BAR.gap), zone, around(BUSBAR.z, BAR.depth * 0.8)),
    ),
    standoffs: ends.map((y) =>
      box(around(RACK_X, STANDOFF_M), around(y, STANDOFF_M), [BAR_BACK, CROSSBAR_Z[0]]),
    ),
    crossbars: ends.map((y) => box(inner, around(y, CROSSBAR.tall), CROSSBAR_Z)),
  };
}

export function buildBusbar(kit: Kit, root: Group): void {
  const group = namedGroup('busbar', root);
  const { spines, standoffs, crossbars } = mounts();
  kit.boxes(group, 'busbar', 'copper', [...bars(), ...clips()]);
  kit.boxes(group, 'busbar', RACK_FINISHES.insulator, [...spines, ...standoffs]);
  kit.boxes(group, 'busbar', 'steelDark', crossbars);
  label(kit.context, 'busbar', group, [RACK_X, BUSBAR.upper[1], BUSBAR.z]);
}

function riserHose(x: number) {
  const points = [
    [x, PIPE_TOP - FITTING.length, MANIFOLD.z],
    [x, PIPE_TOP + 0.08, MANIFOLD.z - HOSE_SWAY_M],
    [x, ROW_PIPE.y - 0.12, ROW_PIPE.z + HOSE_SWAY_M],
    [x, ROW_PIPE.y, ROW_PIPE.z],
  ].map(([px, py, pz]) => new Vector3(px, py, pz));
  return new TubeGeometry(new CatmullRomCurve3(points), 20, HOSE_RADIUS, 10);
}

export function buildManifold(kit: Kit, root: Group): Group {
  const group = namedGroup('manifold', root);
  const tracker = kit.context.tracker;
  const cylinder = tracker.track(new CylinderGeometry(1, 1, 1, 18));
  const pipeLength = PIPE_TOP - PIPE_BOTTOM;
  const stubLength = MANIFOLD.z - QD_Z;
  const clampYs = Array.from(
    { length: Math.floor(pipeLength / CLAMP_EVERY_M) },
    (_, index) => PIPE_BOTTOM + (index + 0.5) * CLAMP_EVERY_M,
  );
  PIPES.forEach(([x, look]) => {
    const pipe = rod([x, PIPE_BOTTOM + pipeLength / 2, MANIFOLD.z], PIPE_RADIUS, pipeLength);
    const fitting = rod(
      [x, PIPE_TOP - FITTING.length / 2, MANIFOLD.z],
      FITTING.radius,
      FITTING.length,
    );
    const collars = COMPUTE_BANDS.map(([bottom]) =>
      rod(
        [x, bottom + QD_Y, MANIFOLD.z - PIPE_RADIUS - COLLAR_GAP_M],
        COLLAR.radius,
        COLLAR.length,
        true,
      ),
    );
    kit.copies(group, 'manifold', look, cylinder, [pipe, ...collars]);
    kit.copies(group, 'manifold', 'steelLight', cylinder, [fitting]);
    kit.copies(group, 'manifold', RACK_FINISHES.insulator, tracker.track(riserHose(x)), [
      rod([0, 0, 0], 1, 1),
    ]);
    const post = x < RACK_X ? SPAN.x[0] + SKIN_M + POST_M : SPAN.x[1] - SKIN_M - POST_M;
    kit.boxes(
      group,
      'manifold',
      'steelDark',
      clampYs.map((y) =>
        box(
          x < RACK_X ? [post, x] : [x, post],
          around(y, CLAMP.tall),
          around(MANIFOLD.z + PIPE_RADIUS, CLAMP.depth),
        ),
      ),
    );
  });
  const stubs = PIPES.flatMap(([x]) =>
    COMPUTE_BANDS.map(([bottom]) =>
      rod([x, bottom + QD_Y, QD_Z + stubLength / 2], STUB_RADIUS, stubLength, true),
    ),
  );
  kit.copies(group, 'manifold', 'steelLight', cylinder, stubs);
  label(kit.context, 'manifold', group, [MANIFOLD.supplyX, BUSBAR.upper[0], MANIFOLD.z]);
  return group;
}
