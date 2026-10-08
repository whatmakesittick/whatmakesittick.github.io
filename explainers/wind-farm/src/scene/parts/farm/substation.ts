import { Mesh } from 'three';
import type { BufferGeometry, Group } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { MaterialFinish } from '@core/scene/materials';
import type { AssemblyState, Point } from '../../../ids';
import { SUBSTATION } from '../../../model';
import { SUBSTATION_HEIGHT_M } from '../../constants';
import { FINISHES } from '../../finishes';
import { finishMesh, label, namedGroup } from '../context';
import type { PartContext } from '../context';
import { mergeParts, slab } from './geometry';
import { GlowSwitch } from './glowSwitch';
import {
  BUSBAR,
  BUSBAR_GLOW_FINISH,
  RADIATOR_FINISH,
  TRANSFORMER_FINISH,
  YARD_STEEL_FINISH,
} from './gridConstants';
import { groundRange } from './ground';
import { busbar, gantry, GANTRY, transformerPieces } from './yard';

const PART = 'substation';
const YARD_FINISHES = {
  gravel: FINISHES.gravel,
  concrete: FINISHES.concrete,
  transformer: TRANSFORMER_FINISH,
  radiator: RADIATOR_FINISH,
  steel: YARD_STEEL_FINISH,
  roof: FINISHES.paintShade,
} as const satisfies Record<string, MaterialFinish>;

type YardPiece = keyof typeof YARD_FINISHES;
const HALF_WIDTH = SUBSTATION.width / 2;
const HALF_DEPTH = SUBSTATION.depth / 2;
const PAD_RAISE_M = 0.3;
const PAD_SINK_M = 1.5;
const FENCE = { inset: 1, height: 2.4, thickness: 0.12, postPitch: 8, post: 0.22 } as const;
const BUILDING = { minX: -54, maxX: -32, minZ: 14, maxZ: 30, height: 5.5, eave: 0.6, roof: 0.5 };
const TRANSFORMER_SITES: readonly (readonly [number, number])[] = [
  [30, -14],
  [30, 14],
];
const GANTRY_XS = [-20, -6, 8] as const;
const GANTRY_HALF_SPAN = 18;
const BUSBAR_ZS = [-7, 0, 7] as const;
const BUSBAR_DROP_M = 3;
const EXIT_GANTRY_X = HALF_WIDTH - 6;
const EXIT_HALF_SPAN = 9;

export const SUBSTATION_RANGE = groundRange([SUBSTATION.x, SUBSTATION.z], HALF_WIDTH, HALF_DEPTH);
export const YARD_LEVEL = SUBSTATION_RANGE.high + PAD_RAISE_M;
export const LINE_EXIT: Point = [
  SUBSTATION.x + EXIT_GANTRY_X,
  YARD_LEVEL + GANTRY.height,
  SUBSTATION.z,
];
export const EXIT_HALF_SPAN_M = EXIT_HALF_SPAN;

function fence(): BufferGeometry[] {
  const x = HALF_WIDTH - FENCE.inset;
  const z = HALF_DEPTH - FENCE.inset;
  const half = FENCE.thickness / 2;
  const panels = [
    slab([-x, 0, -z - half], [x, FENCE.height, -z + half]),
    slab([-x, 0, z - half], [x, FENCE.height, z + half]),
    slab([-x - half, 0, -z], [-x + half, FENCE.height, z]),
    slab([x - half, 0, -z], [x + half, FENCE.height, z]),
  ];
  const corners: Point[] = [
    [-x, 0, -z],
    [x, 0, -z],
    [x, 0, z],
    [-x, 0, z],
  ];
  const posts = corners.flatMap((corner, index) => {
    const next = corners[(index + 1) % corners.length];
    const length = Math.hypot(next[0] - corner[0], next[2] - corner[2]);
    const count = Math.round(length / FENCE.postPitch);
    return Array.from({ length: count }, (_, step) => {
      const share = step / count;
      const postX = corner[0] + (next[0] - corner[0]) * share;
      const postZ = corner[2] + (next[2] - corner[2]) * share;
      const p = FENCE.post / 2;
      return slab([postX - p, 0, postZ - p], [postX + p, FENCE.height + p, postZ + p]);
    });
  });
  return [...panels, ...posts];
}

function building(): { walls: BufferGeometry; roof: BufferGeometry } {
  const { minX, maxX, minZ, maxZ, height, eave, roof } = BUILDING;
  return {
    walls: slab([minX, 0, minZ], [maxX, height, maxZ]),
    roof: slab([minX - eave, height, minZ - eave], [maxX + eave, height + roof, maxZ + eave]),
  };
}

function steelwork(): BufferGeometry[] {
  const portals = GANTRY_XS.flatMap((x) => gantry(x, GANTRY_HALF_SPAN));
  const exit = gantry(EXIT_GANTRY_X, EXIT_HALF_SPAN);
  return [...portals, ...exit, ...fence()];
}

function busbars(): BufferGeometry {
  const busbarY = GANTRY.height - BUSBAR_DROP_M;
  const bars = BUSBAR_ZS.map((z) =>
    busbar(GANTRY_XS[0], GANTRY_XS[GANTRY_XS.length - 1], busbarY, z),
  );
  const merged = mergeGeometries(bars);
  bars.forEach((bar) => bar.dispose());
  if (!merged) throw new Error('Substation busbars do not share attributes');
  return merged;
}

function pieces(): Record<YardPiece, BufferGeometry[]> {
  const transformers = TRANSFORMER_SITES.map(transformerPieces);
  const { walls, roof } = building();
  const pad = slab(
    [-HALF_WIDTH, SUBSTATION_RANGE.low - PAD_SINK_M - YARD_LEVEL, -HALF_DEPTH],
    [HALF_WIDTH, 0, HALF_DEPTH],
  );
  return {
    gravel: [pad],
    concrete: [walls, ...transformers.map((piece) => piece.plinth)],
    transformer: transformers.flatMap((piece) => piece.body),
    radiator: transformers.flatMap((piece) => piece.fins),
    steel: steelwork(),
    roof: [roof, ...transformers.flatMap((piece) => piece.bushings)],
  };
}

export class Substation {
  readonly group: Group;
  private readonly busbars: Mesh;
  private readonly glow: GlowSwitch;

  constructor(context: PartContext) {
    this.group = namedGroup(PART);
    this.group.position.set(SUBSTATION.x, YARD_LEVEL, SUBSTATION.z);
    const yard = pieces();
    (Object.keys(YARD_FINISHES) as YardPiece[]).forEach((piece) => {
      const geometry = mergeParts(yard[piece]);
      const mesh = finishMesh(context, geometry, PART, YARD_FINISHES[piece]);
      mesh.name = PART;
      this.group.add(mesh);
    });
    this.glow = new GlowSwitch(
      context,
      PART,
      { plain: YARD_STEEL_FINISH, glowing: BUSBAR_GLOW_FINISH },
      { halfWidth: BUSBAR.radius, perMetre: BUSBAR.perMetre },
    );
    this.busbars = new Mesh(context.tracker.track(busbars()), this.glow.material);
    this.busbars.name = PART;
    this.group.add(this.busbars);
    label(context, PART, this.group, [0, SUBSTATION_HEIGHT_M, 0]);
  }

  setState(state: AssemblyState): void {
    this.glow.apply(this.busbars, state.view.cables);
  }

  widen(cameraDistance: number): void {
    this.glow.widen(cameraDistance);
  }
}
