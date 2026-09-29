import { CylinderGeometry, Group } from 'three';
import type { BufferGeometry } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { PartId } from '../../../ids';
import { INJECTOR, INLETS, PREBURNERS, STREAM_PATHS, TURBOPUMPS } from '../../../model';
import type { Point, PumpSide } from '../../../model';
import {
  BODY_INNER,
  BODY_OUTER,
  DUCT_RADIUS,
  FLANGE_BOLTS,
  HOT_GAS_RING,
  INJECTOR_DOME,
  INJECTOR_FACE,
  INLET,
  SEGMENTS,
} from '../../constants';
import { circleStrand, lineStrand, smoothStrand } from '../../geometry/profile';
import { revolveShell } from '../../geometry/revolve';
import type { ProfilePoint } from '../../geometry/revolve';
import { closedShell } from '../../geometry/shells';
import { tubeAlong } from '../../geometry/tube';
import { partMesh, shellMeshes } from '../context';
import type { EmphasisGroup, PartContext } from '../context';
import { addBoltRing } from './mount';
import { PreburnerPart } from './preburner';
import { TurbopumpPart } from './turbopump';

const PROFILE_SAMPLES = 96;
const TUBE_SAMPLES = 48;
const PUMP_SIDES: readonly PumpSide[] = ['oxygen', 'methane'];
const INLET_GROUPS: Readonly<Record<PumpSide, PartId>> = {
  oxygen: 'oxygenInlet',
  methane: 'methaneInlet',
};

export function inletOutline(radius: number, bottom: number): ProfilePoint[] {
  const flange = radius + INLET.flangeWidth;
  const points: ProfilePoint[] = [
    [flange, INLET.top],
    [flange, INLET.top - INLET.flange],
    [radius + 0.6, INLET.top - INLET.flange - 0.6],
  ];
  for (let y = INLET.bellowsTop; y > INLET.bellowsBottom; y -= INLET.bellowsPitch) {
    points.push([radius, y], [radius + INLET.bellowsSwell, y - INLET.bellowsPitch / 2]);
  }
  points.push([radius, INLET.bellowsBottom], [radius, bottom]);
  return points;
}

const PUMP_OUTLET_INDEX = 2;
const PREBURNER_BOTTOM_INDEX = 1;
const TURBINE_INDEX = 3;
const CHANNEL_TOP = INJECTOR.y - 3;

function oxygenDischarge(): readonly Point[] {
  const [path] = STREAM_PATHS.liquidOxygen;
  return path.slice(PUMP_OUTLET_INDEX);
}

function hotGasDuct(side: PumpSide): readonly Point[] {
  const [path] = side === 'oxygen' ? STREAM_PATHS.oxygenRichGas : STREAM_PATHS.methaneRichGas;
  return path.slice(PREBURNER_BOTTOM_INDEX, TURBINE_INDEX + 1);
}

const DOME_ENTRY_INDEX = 6;

function domeDuct(side: PumpSide): readonly Point[] {
  const [path] = side === 'oxygen' ? STREAM_PATHS.oxygenRichGas : STREAM_PATHS.methaneRichGas;
  return path.slice(TURBINE_INDEX, DOME_ENTRY_INDEX + 1);
}

export function injectorElements(): { radius: number; angle: number }[] {
  return INJECTOR_FACE.rings.flatMap((radius, ring) => {
    const count = INJECTOR_FACE.firstRingCount * (ring + 1);
    return Array.from({ length: count }, (_, index) => ({
      radius,
      angle: ((index + (ring % 2) * 0.5) / count) * Math.PI * 2,
    }));
  });
}

function elementGeometry(): BufferGeometry {
  const elements = injectorElements()
    .filter(({ angle, radius }) => radius * Math.cos(angle) <= INJECTOR_FACE.elementRadius)
    .map(({ radius, angle }) => {
      const element = new CylinderGeometry(
        INJECTOR_FACE.elementRadius,
        INJECTOR_FACE.elementRadius * 0.7,
        INJECTOR_FACE.elementHeight,
        8,
      );
      element.translate(
        radius * Math.sin(angle),
        INJECTOR_FACE.bottom - INJECTOR_FACE.elementHeight / 2,
        radius * Math.cos(angle),
      );
      return element;
    });
  const merged = mergeGeometries(elements);
  elements.forEach((element) => element.dispose());
  if (!merged) throw new Error('Cannot merge injector elements');
  return merged;
}

function isChannelPoint([, , z]: Point): boolean {
  return z === 0;
}

export function coolantLine(): Point[] {
  const [path] = STREAM_PATHS.liquidMethane;
  const manifold = path.findIndex(
    (point, index) => index > PUMP_OUTLET_INDEX + 1 && isChannelPoint(point),
  );
  return path.slice(PUMP_OUTLET_INDEX, manifold + 1);
}

export function coolantReturn(): Point[] {
  const [path] = STREAM_PATHS.liquidMethane;
  const top = path.findIndex(([, y, z]) => z === 0 && Math.abs(y - CHANNEL_TOP) < 1e-6);
  return path.slice(top);
}

export class PowerheadPart {
  readonly object = new Group();
  readonly pumps: Readonly<Record<PumpSide, TurbopumpPart>>;
  readonly preburners: Readonly<Record<PumpSide, PreburnerPart>>;

  constructor(context: PartContext) {
    this.buildBody(context);
    this.buildInjector(context);
    this.buildManifold(context);
    for (const side of PUMP_SIDES) this.buildInlet(context, side);
    this.pumps = {
      oxygen: new TurbopumpPart(context, 'oxygen', TURBOPUMPS.oxygen),
      methane: new TurbopumpPart(context, 'methane', TURBOPUMPS.methane),
    };
    this.preburners = {
      oxygen: new PreburnerPart(context, 'oxygen', PREBURNERS.oxygen),
      methane: new PreburnerPart(context, 'methane', PREBURNERS.methane),
    };
    for (const side of PUMP_SIDES) {
      this.object.add(this.pumps[side].object, this.preburners[side].object);
    }
    this.buildDucts(context);
  }

  private buildBody(context: PartContext): void {
    const { finishes } = context;
    const shell = revolveShell(
      closedShell(
        smoothStrand(BODY_OUTER, PROFILE_SAMPLES),
        smoothStrand(BODY_INNER, PROFILE_SAMPLES / 2),
      ),
      { segments: SEGMENTS.body },
    );
    shellMeshes(context, this.object, shell, 'injector', { outer: finishes.coat });
    addBoltRing(context, this.object, FLANGE_BOLTS, 'injector');
  }

  private buildInjector(context: PartContext): void {
    const { finishes } = context;
    const dome = revolveShell(
      closedShell(smoothStrand(INJECTOR_DOME.outer, 24), smoothStrand(INJECTOR_DOME.inner, 24)),
      { segments: SEGMENTS.body },
    );
    shellMeshes(context, this.object, dome, 'injector', { outer: finishes.coat });
    const { top, bottom, radius } = INJECTOR_FACE;
    const plate = revolveShell(
      {
        outline: [
          { strand: lineStrand([0.01, top], [radius, top]) },
          { strand: lineStrand([radius, top], [radius, bottom]) },
          { strand: lineStrand([radius, bottom], [0.01, bottom]) },
        ],
      },
      { segments: SEGMENTS.body },
    );
    shellMeshes(context, this.object, plate, 'injector', { outer: finishes.copper });
    this.object.add(partMesh(context, elementGeometry(), 'injector', finishes.brightSteel));
  }

  private buildManifold(context: PartContext): void {
    const { finishes } = context;
    const centre: ProfilePoint = [HOT_GAS_RING.radius, HOT_GAS_RING.y];
    const outer = circleStrand(centre, HOT_GAS_RING.tube, HOT_GAS_RING.steps);
    const bore = [...circleStrand(centre, HOT_GAS_RING.bore, HOT_GAS_RING.steps)].reverse();
    const shell = revolveShell(
      { outline: [{ strand: outer }], holes: [[{ strand: bore, inner: true }]] },
      { segments: SEGMENTS.body },
    );
    shellMeshes(context, this.object, shell, 'hotGasManifold', { outer: finishes.coat });
  }

  private buildInlet(context: PartContext, side: PumpSide): void {
    const { finishes } = context;
    const inlet = INLETS[side];
    const bottom = TURBOPUMPS[side].top - 1;
    const outer = inletOutline(inlet.radius, bottom);
    const bore = inlet.radius - INLET.wall;
    const inner = lineStrand([bore, bottom], [bore, INLET.top], 8);
    const holder = new Group();
    holder.position.set(inlet.centre[0], 0, inlet.centre[2]);
    const shell = revolveShell(closedShell(outer, inner), { segments: SEGMENTS.part });
    shellMeshes(context, holder, shell, INLET_GROUPS[side], { outer: finishes.steel });
    this.object.add(holder);
  }

  private buildDucts(context: PartContext): void {
    this.duct(context, oxygenDischarge(), DUCT_RADIUS.discharge, 'oxygenPump');
    for (const side of PUMP_SIDES) {
      this.duct(context, hotGasDuct(side), DUCT_RADIUS.hotGas, 'hotGasManifold');
      this.duct(context, domeDuct(side), DUCT_RADIUS.domeDuct, 'hotGasManifold');
    }
    this.duct(context, coolantLine(), DUCT_RADIUS.coolantLine, 'coolingChannels');
    this.duct(context, coolantReturn(), DUCT_RADIUS.coolantReturn, 'coolingChannels');
    const [, oxygenBleed] = STREAM_PATHS.liquidOxygen;
    const [, methaneBleed] = STREAM_PATHS.liquidMethane;
    this.duct(context, oxygenBleed, DUCT_RADIUS.bleed, 'oxygenPump');
    this.duct(context, methaneBleed, DUCT_RADIUS.bleed, 'methanePump');
  }

  private duct(
    context: PartContext,
    points: readonly Point[],
    radius: number,
    group: EmphasisGroup,
  ): void {
    const { finishes, cutaway } = context;
    const options = { radius, samples: TUBE_SAMPLES, radial: SEGMENTS.tube };
    const crossesCut = points.some(([, , z]) => z + radius > 0);
    if (!crossesCut) {
      this.object.add(partMesh(context, tubeAlong(points, options), group, finishes.duct));
      return;
    }
    this.object.add(
      cutaway.whole(partMesh(context, tubeAlong(points, options), group, finishes.duct)),
      cutaway.opened(
        partMesh(context, tubeAlong(points, { ...options, arc: 'back' }), group, finishes.duct),
      ),
    );
  }
}
