import { TorusGeometry } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { BufferGeometry, Group, Mesh, MeshStandardMaterial } from 'three';
import { FULL_TURN, toRadians } from '@core/math';
import type { MaterialFinish } from '@core/scene/materials';
import type { Steps } from '@core/scene/pacing';
import { HEAT_LOOK, SEGMENTS } from '../constants';
import { FINISHES, PALETTE } from '../finishes';
import { bladeGeometry } from '../geometry/blade';
import {
  SHAFTS,
  STATION_X,
  casingAt,
  cowlAt,
  hubAt,
  turbineCasingAt,
  turbineHubAt,
  reversed,
  sampled,
} from '../geometry/profiles';
import type { RadiusAt } from '../geometry/profiles';
import { closedLoop, line, revolve, ring, smooth } from '../geometry/revolve';
import type { ProfilePoint, Strand } from '../geometry/revolve';
import {
  BLADE_ROWS,
  appendRing,
  emptyRing,
  handed,
  ringGeometry,
  rowBlade,
} from '../geometry/rows';
import type { RowKind, RowPart, RowSpec, SpoolId } from '../geometry/rows';
import { discLoop, offsetCurve, shell, shellStrands, stripeTexture } from '../geometry/shells';
import type { DiscSpec } from '../geometry/shells';
import type { EmphasisGroup, PartContext } from './context';
import {
  STRUCTURE_GROUP,
  coreMaterial,
  cutMaterial,
  glowScale,
  label,
  mesh,
  namedGroup,
  polar,
} from './context';
import { applyHeat, heatProfileAt } from './heat';
import { applySpinMarks } from './spinMarks';
import { applyBrushed } from './detailPatches';

interface RowGroup {
  readonly part: RowPart;
  readonly kind: RowKind;
  readonly spool: SpoolId | null;
  readonly finish: MaterialFinish;
  readonly heatGain: number;
}

const ROW_GROUPS: readonly RowGroup[] = [
  { part: 'booster', kind: 'rotor', spool: 'inner', finish: FINISHES.booster, heatGain: 0 },
  { part: 'booster', kind: 'stator', spool: null, finish: FINISHES.compressorStator, heatGain: 0 },
  {
    part: 'compressorRotor',
    kind: 'rotor',
    spool: 'outer',
    finish: FINISHES.compressorRotor,
    heatGain: 0,
  },
  {
    part: 'compressorStator',
    kind: 'stator',
    spool: null,
    finish: FINISHES.compressorStator,
    heatGain: 0,
  },
  {
    part: 'hpTurbine',
    kind: 'rotor',
    spool: 'outer',
    finish: FINISHES.hpTurbine,
    heatGain: HEAT_LOOK.hptGain,
  },
  {
    part: 'hpTurbine',
    kind: 'stator',
    spool: null,
    finish: FINISHES.hptStator,
    heatGain: HEAT_LOOK.hptGain,
  },
  {
    part: 'lpTurbine',
    kind: 'rotor',
    spool: 'inner',
    finish: FINISHES.lpTurbine,
    heatGain: HEAT_LOOK.lptGain,
  },
  {
    part: 'lpTurbine',
    kind: 'stator',
    spool: null,
    finish: FINISHES.lptStator,
    heatGain: HEAT_LOOK.lptGain,
  },
];

const ROW_PHASE = 0.37;
const SHROUD = { gap: 0.004, depth: 0.014, overhang: 0.004 } as const;

interface BearingHousing {
  readonly from: number;
  readonly to: number;
  readonly bore: number;
  readonly rim: number;
  readonly web: number;
}

const BEARING_HOUSINGS: readonly BearingHousing[] = [
  { from: -1.64, to: -1.5, bore: 0.18, rim: 0.4, web: 0.018 },
  { from: 1.035, to: 1.1, bore: 0.18, rim: 0.5, web: 0.02 },
  { from: 2.13, to: 2.24, bore: 0.1, rim: 0.52, web: 0.02 },
];

function housingLoop(housing: BearingHousing): Strand[] {
  const { from, to, bore, rim, web } = housing;
  const cage = bore + 0.05;
  return closedLoop([
    [from, cage],
    [to - web, rim],
    [to, rim],
    [to, bore],
    [from, bore],
  ]);
}
const SPLITTER_NOSE = 0.012;
const SPLITTER_SAMPLES = 10;
const DISC = { rimHeight: 0.045, web: 0.016, boreHeight: 0.05, boreShare: 0.7 } as const;
const DRUM_WALL = 0.022;
const CASING_WALL = {
  booster: 0.035,
  compressor: 0.04,
  combustor: 0.035,
  hpt: 0.05,
  lpt: 0.035,
} as const;
const COWL_WALL = 0.03;
const COWL_SAMPLES = 24;
const FLANGE = { height: 0.035, width: 0.022 } as const;
const COMPRESSOR_FLANGES = [-1.1, -0.62, -0.18, 0.1] as const;
const LPT_FLANGES = [1.06, 1.45, 1.8, 2.12] as const;
const VSV_RINGS = 4;
const VSV_RING = { lift: 0.07, tube: 0.008 } as const;
const HP_LINK = { from: 0.08, to: 0.8, inner: 0.27, outer: 0.295 } as const;
const MID_FRAME = { x: 1.055, width: 0.05, count: 10 } as const;
const REAR_FRAME = { x: 2.2, width: 0.08, count: 8, hub: 0.53, tip: 0.91 } as const;

export interface Spools {
  readonly inner: Group;
  readonly outer: Group;
}

function groupKey(part: RowPart, kind: RowKind): string {
  return `${part}-${kind}`;
}

function rowsOf(group: RowGroup): RowSpec[] {
  return BLADE_ROWS.filter((row) => row.part === group.part && row.kind === group.kind);
}

function shroudRing(row: RowSpec): BufferGeometry {
  return ring(
    row.from - SHROUD.overhang,
    row.to + SHROUD.overhang,
    row.hub + SHROUD.gap,
    row.hub + SHROUD.gap + SHROUD.depth,
    SEGMENTS.small,
  );
}

function rowsGeometry(rows: readonly RowSpec[]): BufferGeometry {
  const buffers = emptyRing();
  rows
    .filter((row) => row.kind === 'stator')
    .forEach((row) => {
      const shroud = shroudRing(row);
      appendRing(buffers, shroud, 1, 0, heatProfileAt((row.from + row.to) / 2));
      shroud.dispose();
    });
  rows.forEach((row) => {
    const blade = rowBlade(row);
    const index = BLADE_ROWS.indexOf(row);
    appendRing(
      buffers,
      blade,
      row.count,
      index * ROW_PHASE,
      heatProfileAt((row.from + row.to) / 2),
    );
    blade.dispose();
  });
  return ringGeometry(buffers);
}

function lodGeometry(rows: readonly RowSpec[]): BufferGeometry {
  const strands: Strand[] = rows.flatMap((row) =>
    closedLoop([
      [row.from, row.tip],
      [row.to, row.tip],
      [row.to, row.hub],
      [row.from, row.hub],
    ]),
  );
  return revolve(strands, SEGMENTS.small);
}

function rowDiscs(rows: readonly RowSpec[], bore: number): Strand[] {
  return rows.flatMap((row) => {
    const width = row.to - row.from;
    const disc: DiscSpec = {
      x: (row.from + row.to) / 2,
      width: width * 1.05,
      rim: row.hub + 0.002,
      bore,
      rimHeight: DISC.rimHeight,
      web: DISC.web,
      boreWidth: width * DISC.boreShare,
      boreHeight: DISC.boreHeight,
    };
    return discLoop(disc);
  });
}

function drum(
  hub: RadiusAt,
  from: number,
  to: number,
  rows: readonly RowSpec[],
  bore: number,
): BufferGeometry {
  return revolve(
    [...shellStrands(offsetCurve(hub, -DRUM_WALL), hub, from, to), ...rowDiscs(rows, bore)],
    SEGMENTS.disc,
  );
}

function flanges(at: RadiusAt, positions: readonly number[], wall: number): Strand[] {
  return positions.flatMap((x) =>
    closedLoop([
      [x - FLANGE.width / 2, at(x) + wall + FLANGE.height],
      [x + FLANGE.width / 2, at(x) + wall + FLANGE.height],
      [x + FLANGE.width / 2, at(x) + wall - 0.002],
      [x - FLANGE.width / 2, at(x) + wall - 0.002],
    ]),
  );
}

function casing(
  at: RadiusAt,
  from: number,
  to: number,
  wall: number,
  flangeAt: readonly number[] = [],
): BufferGeometry {
  return revolve(
    [...shellStrands(at, offsetCurve(at, wall), from, to), ...flanges(at, flangeAt, wall)],
    SEGMENTS.core,
  );
}

function splitterStrands(): Strand[] {
  const back = STATION_X.fanCaseEnd;
  const front = STATION_X.splitter;
  const nose: ProfilePoint = [front - SPLITTER_NOSE, (cowlAt(front) + casingAt(front)) / 2];
  const outer = sampled(cowlAt, front, back, SPLITTER_SAMPLES);
  const inner = reversed(sampled(casingAt, front, back, SPLITTER_SAMPLES));
  return [
    [nose, ...outer],
    line(outer[outer.length - 1], inner[0]),
    inner,
    line(inner[inner.length - 1], nose),
  ];
}

function combustorOuterCasing(): BufferGeometry {
  const inner = smooth(
    [
      [0.15, 0.565],
      [0.2, 0.66],
      [0.27, 0.79],
      [0.45, 0.8],
      [0.62, 0.79],
      [0.72, 0.695],
    ],
    12,
  );
  const outer = inner.map(([x, r]) => [x, r + CASING_WALL.combustor] as const);
  return revolve(
    [
      outer,
      line(outer[outer.length - 1], inner[inner.length - 1]),
      [...inner].reverse(),
      line(inner[0], outer[0]),
    ],
    SEGMENTS.core,
  );
}

function combustorInnerCasing(): BufferGeometry {
  const outer = smooth(
    [
      [0.15, 0.47],
      [0.22, 0.41],
      [0.3, 0.375],
      [0.62, 0.38],
      [0.72, 0.525],
    ],
    12,
  );
  const inner = outer.map(([x, r]) => [x, r - CASING_WALL.combustor] as const);
  return revolve(
    [
      outer,
      line(outer[outer.length - 1], inner[inner.length - 1]),
      [...inner].reverse(),
      line(inner[0], outer[0]),
    ],
    SEGMENTS.core,
  );
}

function strutRing(
  x: number,
  width: number,
  hub: number,
  tip: number,
  count: number,
): BufferGeometry {
  const strut = bladeGeometry({
    hub,
    tip,
    stations: 3,
    samples: 6,
    chord: () => width,
    stagger: () => 0,
    camber: () => 0,
    thickness: () => 0.22,
  });
  strut.translate(x, 0, 0);
  const buffers = emptyRing();
  appendRing(buffers, handed(strut, 'stator'), count, FULL_TURN / (count * 2));
  strut.dispose();
  return ringGeometry(buffers);
}

function mergeAll(pieces: BufferGeometry[]): BufferGeometry {
  const merged = mergeGeometries(pieces);
  pieces.forEach((piece) => piece.dispose());
  if (!merged) throw new Error('Cannot merge core pieces');
  return merged;
}

export class CorePart {
  private readonly rowMeshes: Mesh[] = [];
  private readonly lodMeshes: Mesh[] = [];
  private far = false;
  private readonly context: PartContext;
  private readonly engine: Group;
  private readonly spools: Spools;

  constructor(context: PartContext, engine: Group, spools: Spools) {
    this.context = context;
    this.engine = engine;
    this.spools = spools;
  }

  *build(): Steps<void> {
    this.buildShafts();
    yield;
    for (const group of ROW_GROUPS) {
      this.buildRows(group);
      yield;
    }
    this.buildDrums();
    this.buildBearings();
    yield;
    this.buildCasings();
    yield;
    this.buildLabels();
  }

  setFar(far: boolean): void {
    if (far === this.far) return;
    this.far = far;
    this.rowMeshes.forEach((row) => (row.visible = !far));
    this.lodMeshes.forEach((lod) => (lod.visible = far));
  }

  get lodTargets(): readonly Mesh[] {
    return this.lodMeshes;
  }

  private parentOf(spool: SpoolId | null): Group {
    if (spool === 'inner') return this.spools.inner;
    if (spool === 'outer') return this.spools.outer;
    return this.engine;
  }

  private bladeMaterial(group: RowGroup): MeshStandardMaterial {
    const surface = coreMaterial(this.context, group.part, group.finish);
    if (group.heatGain === 0) return surface;
    return applyHeat(
      surface,
      this.context.heat,
      glowScale(this.context, group.part),
      group.heatGain,
    );
  }

  private buildRows(group: RowGroup): void {
    const rows = rowsOf(group);
    const parent = namedGroup(groupKey(group.part, group.kind), this.parentOf(group.spool));
    this.rowMeshes.push(mesh(this.context, parent, rowsGeometry(rows), this.bladeMaterial(group)));
    const light = group.kind === 'rotor' ? PALETTE.rotor : PALETTE.stator;
    const texture = this.context.tracker.track(
      stripeTexture(rows[0].count, light, PALETTE.casingDark),
    );
    const lod = mesh(
      this.context,
      parent,
      lodGeometry(rows),
      coreMaterial(this.context, group.part, { ...FINISHES.lod, map: texture }),
    );
    lod.visible = false;
    this.lodMeshes.push(lod);
  }

  private buildShafts(): void {
    const { inner, outer } = SHAFTS;
    const innerShaft = namedGroup('innerShaft', this.spools.inner);
    mesh(
      this.context,
      innerShaft,
      ring(inner.from, inner.to, inner.inner, inner.outer, SEGMENTS.small),
      applyBrushed(
        applySpinMarks(coreMaterial(this.context, 'innerShaft', FINISHES.innerShaft), 'helix'),
      ),
    );
    const outerShaft = namedGroup('outerShaft', this.spools.outer);
    mesh(
      this.context,
      outerShaft,
      ring(outer.from, outer.to, outer.inner, outer.outer, SEGMENTS.small),
      applyBrushed(
        applySpinMarks(coreMaterial(this.context, 'outerShaft', FINISHES.outerShaft), 'helix'),
      ),
    );
    mesh(
      this.context,
      outerShaft,
      ring(HP_LINK.from, HP_LINK.to, HP_LINK.inner, HP_LINK.outer, SEGMENTS.disc),
      applyBrushed(
        applySpinMarks(coreMaterial(this.context, 'outerShaft', FINISHES.outerShaft), 'helix'),
      ),
    );
  }

  private spinning(group: EmphasisGroup, finish: MaterialFinish): MeshStandardMaterial {
    return applyBrushed(applySpinMarks(coreMaterial(this.context, group, finish), 'index'));
  }

  private buildBearings(): void {
    mesh(
      this.context,
      this.engine,
      revolve(BEARING_HOUSINGS.flatMap(housingLoop), SEGMENTS.disc),
      coreMaterial(this.context, STRUCTURE_GROUP, FINISHES.bearing),
    );
  }

  private buildDrums(): void {
    const booster = BLADE_ROWS.filter((row) => row.part === 'booster' && row.kind === 'rotor');
    const compressor = BLADE_ROWS.filter((row) => row.part === 'compressorRotor');
    const hpt = BLADE_ROWS.filter((row) => row.part === 'hpTurbine' && row.kind === 'rotor');
    const lpt = BLADE_ROWS.filter((row) => row.part === 'lpTurbine' && row.kind === 'rotor');
    const lpBore = SHAFTS.inner.outer + 0.003;
    const hpBore = SHAFTS.outer.outer + 0.003;
    const innerDrum = FINISHES.innerDrum;
    const outerDrum = FINISHES.outerDrum;
    mesh(
      this.context,
      this.spools.inner,
      drum(hubAt, -2.1, -1.6, booster, lpBore),
      this.spinning('booster', innerDrum),
    );
    mesh(
      this.context,
      this.spools.outer,
      drum(hubAt, STATION_X.compressorStart, STATION_X.compressorEnd, compressor, hpBore),
      this.spinning('compressorRotor', outerDrum),
    );
    mesh(
      this.context,
      this.spools.outer,
      drum(turbineHubAt, 0.72, 1.03, hpt, hpBore),
      this.spinning('hpTurbine', outerDrum),
    );
    mesh(
      this.context,
      this.spools.inner,
      drum(turbineHubAt, STATION_X.lptStart, STATION_X.lptEnd, lpt, lpBore),
      this.spinning('lpTurbine', innerDrum),
    );
    mesh(
      this.context,
      this.engine,
      shell(offsetCurve(hubAt, -0.03), hubAt, -1.6, STATION_X.compressorStart, SEGMENTS.core),
      coreMaterial(this.context, STRUCTURE_GROUP, FINISHES.strut),
    );
  }

  private buildCasings(): void {
    const { context, engine } = this;
    const splitter = namedGroup('splitter', engine);
    mesh(
      context,
      splitter,
      revolve(splitterStrands(), SEGMENTS.shell),
      cutMaterial(context, 'splitter', FINISHES.splitter),
    );
    label(context, 'splitter', splitter, polar(STATION_X.splitter, 0.93, toRadians(58)));
    const cowl = namedGroup('bypassDuct', engine);
    const [cowlOuter, ...cowlInside] = shellStrands(
      offsetCurve(cowlAt, -COWL_WALL),
      cowlAt,
      STATION_X.fanCaseEnd,
      2.1,
      COWL_SAMPLES,
    );
    mesh(
      context,
      cowl,
      revolve([cowlOuter], SEGMENTS.shell),
      cutMaterial(context, 'bypassDuct', FINISHES.cowl),
    );
    mesh(
      context,
      cowl,
      revolve(cowlInside, SEGMENTS.shell),
      cutMaterial(context, 'bypassDuct', FINISHES.cowlCavity),
    );
    label(context, 'bypassDuct', cowl, polar(-0.5, 1.37, toRadians(42)));
    this.casingMesh(
      'booster',
      casing(casingAt, STATION_X.fanCaseEnd, -1.55, CASING_WALL.booster),
      FINISHES.boosterCasing,
    );
    this.casingMesh(
      'compressorStator',
      casing(casingAt, -1.55, STATION_X.compressorEnd, CASING_WALL.compressor, COMPRESSOR_FLANGES),
      FINISHES.compressorCasing,
    );
    this.casingMesh('compressorStator', this.vsvRings(), FINISHES.compressorCasing);
    this.casingMesh('combustor', combustorOuterCasing(), FINISHES.combustorCasing);
    this.casingMesh('combustor', combustorInnerCasing(), FINISHES.combustorCasing);
    this.casingMesh(
      'hpTurbine',
      casing(turbineCasingAt, 0.72, 1.05, CASING_WALL.hpt),
      FINISHES.turbineCasing,
    );
    this.casingMesh(
      'lpTurbine',
      casing(turbineCasingAt, 1.05, STATION_X.lptEnd + 0.01, CASING_WALL.lpt, LPT_FLANGES),
      FINISHES.turbineCasing,
    );
    this.casingMesh(
      STRUCTURE_GROUP,
      strutRing(
        MID_FRAME.x,
        MID_FRAME.width,
        turbineHubAt(MID_FRAME.x) - 0.01,
        turbineCasingAt(MID_FRAME.x) + 0.01,
        MID_FRAME.count,
      ),
      FINISHES.strut,
    );
    this.casingMesh(
      STRUCTURE_GROUP,
      strutRing(REAR_FRAME.x, REAR_FRAME.width, REAR_FRAME.hub, REAR_FRAME.tip, REAR_FRAME.count),
      FINISHES.strut,
    );
  }

  private vsvRings(): BufferGeometry {
    const stators = BLADE_ROWS.filter((row) => row.part === 'compressorStator').slice(0, VSV_RINGS);
    return mergeAll(
      stators.map((row) => {
        const x = (row.from + row.to) / 2;
        const torus = new TorusGeometry(
          casingAt(x) + CASING_WALL.compressor + VSV_RING.lift,
          VSV_RING.tube,
          6,
          SEGMENTS.core,
        );
        torus.rotateY(Math.PI / 2);
        torus.translate(x, 0, 0);
        return torus;
      }),
    );
  }

  private casingMesh(group: EmphasisGroup, geometry: BufferGeometry, finish: MaterialFinish): void {
    mesh(this.context, this.engine, geometry, coreMaterial(this.context, group, finish));
  }

  private buildLabels(): void {
    const { context, engine } = this;
    const anchors = namedGroup('coreLabels', engine);
    label(context, 'booster', anchors, polar(-1.84, 0.74, toRadians(42)));
    label(context, 'compressorRotor', anchors, polar(-0.72, 0.56, toRadians(52)));
    label(context, 'compressorStator', anchors, polar(-0.22, 0.55, toRadians(68)));
    label(context, 'compressor', anchors, polar(-0.45, 0.6, toRadians(60)));
    label(context, 'outerShaft', anchors, polar(-0.3, SHAFTS.outer.outer, toRadians(62)));
    label(context, 'innerShaft', anchors, polar(1.34, SHAFTS.inner.outer, toRadians(62)));
    label(context, 'hpTurbine', anchors, polar(0.9, 0.68, toRadians(50)));
    label(context, 'lpTurbine', anchors, polar(1.62, 0.82, toRadians(50)));
  }
}
