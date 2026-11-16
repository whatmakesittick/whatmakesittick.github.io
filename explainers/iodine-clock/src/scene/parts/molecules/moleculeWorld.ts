import { Vector3 } from 'three';
import type { Object3D } from 'three';
import { UNDIMMED_GROUP } from '@core/scene/materials';
import type { AssemblyState, PartId } from '../../../ids';
import { HELIX_GEOMETRY, MAX_DRAWN_COUNTS } from '../../../model';
import { ATOM_LOOK, IODINE_SPOT, LANDOLT_SPOT } from '../../constants';
import { namedGroup } from '../context';
import type { PartContext, Section } from '../context';
import { AtomBatch } from './atomBatch';
import type { AtomCapacity, BondCapacity } from './atomBatch';
import { Crowd } from './crowd';
import { Glows, LabelPicker } from './draw';
import type { DrawContext } from './draw';
import { buildHaze } from './haze';
import { Helix } from './helix';
import { IodineEvent } from './iodineEvent';
import { LandoltEvent } from './landolt';
import { buildWater } from './water';

const EVENT_EXTRA = 6;
const FEEDER_ATOMS = 10;
const IODATE_LEGS = 3;
const SULFATE_LEGS = 4;
const HALO_CAPACITY = 48;
const FLASH_CAPACITY = 16;
const SPOT_CAPACITY = 2;

const PICKED_PARTS: readonly PartId[] = [
  'iodate',
  'bisulfite',
  'sulfate',
  'iodide',
  'hydrogenIon',
  'iodine',
  'triiodide',
];

function capacities(): { atoms: AtomCapacity; bonds: BondCapacity } {
  const iodate = MAX_DRAWN_COUNTS.iodate + EVENT_EXTRA;
  const bisulfite = MAX_DRAWN_COUNTS.bisulfite + EVENT_EXTRA;
  const sulfate = MAX_DRAWN_COUNTS.sulfate + EVENT_EXTRA;
  const iodine = MAX_DRAWN_COUNTS.iodine * 2 + FEEDER_ATOMS;
  return {
    atoms: {
      iodate: { I: iodate, O: iodate * IODATE_LEGS },
      bisulfite: { S: bisulfite, O: bisulfite * IODATE_LEGS, H: bisulfite },
      sulfate: { S: sulfate, O: sulfate * SULFATE_LEGS },
      iodide: { I: MAX_DRAWN_COUNTS.iodide + EVENT_EXTRA },
      hydrogenIon: { H: MAX_DRAWN_COUNTS.hydrogenIon + EVENT_EXTRA },
      iodine: { I: iodine },
      triiodide: { I: IODATE_LEGS },
      polyiodide: { I: HELIX_GEOMETRY.maxChainAtoms },
    },
    bonds: {
      iodate: iodate * IODATE_LEGS,
      bisulfite: bisulfite * SULFATE_LEGS,
      sulfate: sulfate * SULFATE_LEGS,
      iodine,
      triiodide: 1,
    },
  };
}

export function buildMoleculeWorld(context: PartContext, parent: Object3D): Section {
  const root = namedGroup('moleculeWorld', parent);
  buildHaze(context, root);
  const water = buildWater(context, root);
  const { atoms, bonds } = capacities();
  const draw: DrawContext = {
    batch: new AtomBatch(context, root, atoms, bonds),
    halos: new Glows(context, root, 'hydrogenIon', {
      capacity: HALO_CAPACITY,
      size: ATOM_LOOK.hydrogenHalo,
    }),
    flashes: new Glows(context, root, 'iodine', {
      capacity: FLASH_CAPACITY,
      size: ATOM_LOOK.flashSize,
    }),
    sparkles: new Glows(context, root, 'polyiodide', {
      capacity: HELIX_GEOMETRY.maxChainAtoms,
      size: ATOM_LOOK.sparkleSize,
    }),
    labels: new LabelPicker(PICKED_PARTS, root, context.labels),
  };
  const spots = new Glows(context, root, UNDIMMED_GROUP, {
    capacity: SPOT_CAPACITY,
    size: ATOM_LOOK.spotSize,
  });
  const landoltSpot = new Vector3(...LANDOLT_SPOT);
  const iodineSpot = new Vector3(...IODINE_SPOT);
  const crowd = new Crowd();
  const landolt = new LandoltEvent();
  const iodine = new IodineEvent();
  const helix = new Helix(context, root);
  return {
    root,
    setState: (state: AssemblyState) => {
      water.setState(state);
      spots.begin();
      const glow = state.landolt.active ? ATOM_LOOK.spotAlpha : 0;
      spots.add(landoltSpot, ATOM_LOOK.spot, glow);
      spots.add(iodineSpot, ATOM_LOOK.spot, glow);
      spots.end();
      draw.batch.begin();
      draw.halos.begin();
      draw.flashes.begin();
      draw.sparkles.begin();
      draw.labels.begin();
      crowd.draw(draw, state);
      landolt.draw(draw, state);
      iodine.draw(draw, state);
      helix.draw(draw, state);
      draw.batch.end();
      draw.halos.end();
      draw.flashes.end();
      draw.sparkles.end();
      draw.labels.end();
    },
  };
}
