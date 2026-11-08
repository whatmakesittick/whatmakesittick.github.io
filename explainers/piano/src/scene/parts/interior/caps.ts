import { Mesh } from 'three';
import type { Group, Material } from 'three';
import { REGISTER_IDS } from '../../../ids';
import type { RegisterId } from '../../../ids';
import { PLAYED_KEY, SOUNDBOARD, cutX } from '../../../model';
import { FINISHES } from '../../finishes';
import { capGeometry, crossingsAtX } from '../../geometry/section';
import type { Ring, Slab } from '../../geometry/section';
import { namedGroup, partMesh } from '../context';
import type { EmphasisGroup, PartContext } from '../context';
import { BELLY_RAIL, PINBLOCK } from './constants';
import { BASS_BRIDGE, MAIN_BRIDGE } from './bridgePlan';
import { BELLY_RAIL_BOUNDS, BOARD_RING, RIB_LEVELS, RIB_RINGS, boardBottom } from './boardPlan';
import { BRIDGE_TOPS } from './bridges';
import { patchedMaterial } from './materials';
import type { ShaderPatch } from './patches';
import { PINBLOCK_BOUNDS } from './pins';
import { PLATE_SLABS } from './plate';
import { boundsRing } from './planMath';
import { RAIL_TOP } from './soundboard';

interface SlabSpec {
  readonly rings: readonly Ring[];
  readonly bottom: number | ((x: number, z: number) => number);
  readonly top: number;
}

type CapMotion = 'still' | 'breath' | 'board';

interface CapSet {
  readonly group: EmphasisGroup;
  readonly slabs: readonly SlabSpec[];
  readonly motion: CapMotion;
}

const CAP_SETS: readonly CapSet[] = [
  { group: 'plate', slabs: PLATE_SLABS, motion: 'still' },
  {
    group: 'soundboard',
    motion: 'board',
    slabs: [
      { rings: [BOARD_RING], bottom: (x, z) => boardBottom({ x, z }), top: SOUNDBOARD.topY },
      ...RIB_RINGS.map((ring) => ({
        rings: [ring],
        bottom: RIB_LEVELS.bottom,
        top: RIB_LEVELS.top,
      })),
    ],
  },
  {
    group: 'bridge',
    motion: 'breath',
    slabs: [
      { rings: [MAIN_BRIDGE.ring], bottom: SOUNDBOARD.topY, top: BRIDGE_TOPS.main },
      { rings: [BASS_BRIDGE.ring], bottom: SOUNDBOARD.topY, top: BRIDGE_TOPS.bass },
    ],
  },
  {
    group: 'structure',
    motion: 'still',
    slabs: [
      { rings: [boundsRing(PINBLOCK_BOUNDS)], bottom: PINBLOCK.bottom, top: PINBLOCK.top },
      { rings: [boundsRing(BELLY_RAIL_BOUNDS)], bottom: BELLY_RAIL.bottom, top: RAIL_TOP },
    ],
  },
];

function slabsAt(x: number, specs: readonly SlabSpec[]): Slab[] {
  return specs.map(({ rings, bottom, top }) => ({
    intervals: crossingsAtX(rings, x),
    bottom: typeof bottom === 'number' ? bottom : (z: number) => bottom(x, z),
    top,
  }));
}

export function capX(register: RegisterId): number {
  return cutX(PLAYED_KEY[register]);
}

export interface Caps {
  readonly root: Group;
  show(register: RegisterId, cutaway: boolean, cutAt: number): void;
  prepareAll(): void;
}

export function createCaps(
  context: PartContext,
  patches: Readonly<Record<Exclude<CapMotion, 'still'>, ShaderPatch>>,
): Caps {
  const root = namedGroup('caps');
  const sets = new Map<RegisterId, Group>();
  const moving = new Map<EmphasisGroup, Material>();
  const movingFor = (group: EmphasisGroup, motion: Exclude<CapMotion, 'still'>) => {
    const found = moving.get(group);
    if (found) return found;
    const material = patchedMaterial(context, {
      group,
      finish: FINISHES.section,
      patch: patches[motion],
      cut: false,
    });
    moving.set(group, material);
    return material;
  };
  const build = (register: RegisterId): Group => {
    const x = capX(register);
    const group = namedGroup(`caps-${register}`, root);
    CAP_SETS.forEach((set) => {
      const geometry = capGeometry(x, slabsAt(x, set.slabs));
      const mesh =
        set.motion === 'still'
          ? partMesh(context, geometry, set.group, FINISHES.section)
          : new Mesh(context.tracker.track(geometry), movingFor(set.group, set.motion));
      group.add(mesh);
    });
    sets.set(register, group);
    return group;
  };
  const setFor = (register: RegisterId) => sets.get(register) ?? build(register);
  return {
    root,
    show(register, cutaway, cutAt) {
      root.visible = cutaway;
      if (!cutaway) return;
      const current = setFor(register);
      sets.forEach((group, id) => (group.visible = id === register));
      current.position.x = cutAt - capX(register);
    },
    prepareAll() {
      REGISTER_IDS.forEach(setFor);
    },
  };
}
