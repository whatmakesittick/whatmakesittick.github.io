import type { Material } from 'three';
import type { MaterialFinish } from '@core/scene/materials';
import type { PartId } from '../../../ids';
import { FINISHES } from '../../finishes';
import { boxMatrix, instancesOf, namedGroup } from '../context';
import type { PartContext } from '../context';
import { patternedMaterial } from './cladding';
import type { SurfacePattern } from './cladding';
import { materialOf, partGroup, unitCube } from './kit';
import type { PieceBuilder } from './kit';
import { HALL_LABEL_POINT, SHELL_PIECES } from './shell';
import type { ShellLayer, ShellSurface } from './shell';

const PART: PartId = 'hall';

const TRIM: MaterialFinish = { color: '#3a3f45', roughness: 0.7, metalness: 0.25 };
const DOOR: MaterialFinish = { color: '#56606b', roughness: 0.5, metalness: 0.2 };
const ROLL_UP: MaterialFinish = { color: '#a4abb2', roughness: 0.45, metalness: 0.35 };
const MEMBRANE: MaterialFinish = { color: '#6c7176', roughness: 0.9 };
const SLAB: MaterialFinish = { color: '#8b8c89', roughness: 0.85 };
const BLOCK: MaterialFinish = { color: '#9d9fa0', roughness: 0.9 };

const CLADDING_PATTERN: SurfacePattern = {
  name: 'cladding',
  ribs: { axis: 'tangent', pitch: 0.25, crest: 0.2, flank: 0.1, depth: 0.035, valley: 0.16 },
  seams: { pitch: [0, 3.5, 0], width: 0.03, dark: 0.3 },
  mottle: 0.08,
  grime: 0.14,
};

const ROLL_UP_PATTERN: SurfacePattern = {
  name: 'rollUp',
  ribs: { axis: 'vertical', pitch: 0.1, crest: 0.6, flank: 0.15, depth: 0.012, valley: 0.18 },
};

const MEMBRANE_PATTERN: SurfacePattern = {
  name: 'membrane',
  seams: { pitch: [2, 0, 9], width: 0.04, dark: 0.12 },
  mottle: 0.07,
  underside: 0.45,
};

const SLAB_PATTERN: SurfacePattern = {
  name: 'slab',
  seams: { pitch: [6, 0, 6], width: 0.012, dark: 0.35 },
  mottle: 0.05,
};

const BLOCK_PATTERN: SurfacePattern = {
  name: 'block',
  seams: { pitch: [0.4, 0.2, 0.4], width: 0.01, dark: 0.22 },
  mottle: 0.05,
};

function surfaceMaterials(context: PartContext): Record<ShellSurface, Material> {
  const patterned = (finish: MaterialFinish, pattern: SurfacePattern) =>
    patternedMaterial(context, PART, finish, pattern);
  return {
    cladding: patterned(FINISHES.cladding, CLADDING_PATTERN),
    coping: materialOf(context, PART, 'steelLight'),
    plinth: materialOf(context, PART, 'concreteDark'),
    floor: patterned(SLAB, SLAB_PATTERN),
    roomWall: patterned(BLOCK, BLOCK_PATTERN),
    girder: materialOf(context, PART, 'steelDark'),
    roof: patterned(MEMBRANE, MEMBRANE_PATTERN),
    trim: materialOf(context, PART, TRIM),
    door: materialOf(context, PART, DOOR),
    rollUp: patterned(ROLL_UP, ROLL_UP_PATTERN),
    blade: materialOf(context, PART, 'steelLight'),
  };
}

export const buildBuilding: PieceBuilder = (context, root) => {
  const group = partGroup(context, PART, root, HALL_LABEL_POINT);
  const materials = surfaceMaterials(context);
  const layerGroup = (layer: ShellLayer) => {
    const parent = namedGroup(`hall-${layer}`, group);
    const pieces = SHELL_PIECES.filter((piece) => piece.layer === layer);
    new Set(pieces.map((piece) => piece.surface)).forEach((surface) => {
      const own = pieces.filter((piece) => piece.surface === surface);
      const matrices = own.map(({ box }) => boxMatrix(box));
      parent.add(instancesOf(context, unitCube(context), materials[surface], matrices));
    });
    return parent;
  };
  layerGroup('kept');
  const cut = layerGroup('cut');
  const caps = layerGroup('cap');
  return {
    setState(state) {
      cut.visible = !state.view.cutaway;
      caps.visible = state.view.cutaway;
    },
  };
};
