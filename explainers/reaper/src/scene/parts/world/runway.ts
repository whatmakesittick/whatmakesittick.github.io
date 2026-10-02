import { AdditiveBlending, Color, PlaneGeometry } from 'three';
import type { BufferGeometry } from 'three';
import { box } from '@core/scene/geometry/box';
import { PointCloud, createPointMaterial } from '@core/scene/pointCloud';
import { RUNWAY } from '../../../model/layout';
import { AIRFIELD } from '../../constants';
import { mergeParts, registered } from '../context';
import type { PartContext } from '../context';

type Extent = readonly [number, number];
type Triple = [number, number, number];

interface Lamp {
  at: Triple;
  colour: string;
}

const QUARTER_TURN = Math.PI / 2;
const SIDES = [1, -1] as const;
const EPSILON = 1e-6;
const ENDS = [
  [RUNWAY.x[0], -1],
  [RUNWAY.x[1], 1],
] as const;

export function slab(x: Extent, z: Extent, top: number): BufferGeometry {
  return box({
    minX: x[0],
    maxX: x[1],
    minY: top - AIRFIELD.slabDepth,
    maxY: top,
    minZ: z[0],
    maxZ: z[1],
  });
}

export function stripe(x: number, z: number, length: number, width: number): BufferGeometry {
  const plane = new PlaneGeometry(length, width);
  plane.rotateX(-QUARTER_TURN);
  plane.translate(x, AIRFIELD.surface + AIRFIELD.markingLift, z);
  return plane;
}

function thresholdBars(edge: number, inward: number): BufferGeometry[] {
  const { threshold } = AIRFIELD.runway;
  const pitch = threshold.width + threshold.gap;
  const x = edge + inward * (threshold.inset + threshold.length / 2);
  return Array.from({ length: threshold.bars }, (_, bar) => {
    const offset = (bar - (threshold.bars - 1) / 2) * pitch;
    const z = RUNWAY.z + offset + Math.sign(offset) * pitch;
    return stripe(x, z, threshold.length, threshold.width);
  });
}

function aimingMarks(edge: number, inward: number): BufferGeometry[] {
  const { aiming } = AIRFIELD.runway;
  const x = edge + inward * aiming.at;
  return SIDES.map((side) =>
    stripe(x, RUNWAY.z + side * aiming.offset, aiming.length, aiming.width),
  );
}

function centreline(): BufferGeometry[] {
  const { dash, gap, width, inset } = AIRFIELD.runway.centreline;
  const dashes: BufferGeometry[] = [];
  for (let x = RUNWAY.x[0] + inset; x < RUNWAY.x[1] - inset; x += dash + gap) {
    dashes.push(stripe(x + dash / 2, RUNWAY.z, dash, width));
  }
  return dashes;
}

function edgeLines(): BufferGeometry[] {
  const { edge } = AIRFIELD.runway;
  const [start, end] = RUNWAY.x;
  return SIDES.map((side) =>
    stripe(
      (start + end) / 2,
      RUNWAY.z + side * (RUNWAY.halfWidth - edge.inset),
      end - start,
      edge.width,
    ),
  );
}

export function runwayMarkings(): BufferGeometry {
  return mergeParts([
    ...ENDS.flatMap(([edge, outward]) => [
      ...thresholdBars(edge, -outward),
      ...aimingMarks(edge, -outward),
    ]),
    ...centreline(),
    ...edgeLines(),
  ]);
}

function chevronArm(tipX: number, outward: number, side: number): BufferGeometry {
  const { blastPad } = AIRFIELD.runway;
  const half = RUNWAY.halfWidth;
  const arm = half / Math.cos(blastPad.angle);
  const plane = stripe(0, 0, arm, blastPad.width);
  plane.rotateY(Math.atan2(-side * Math.cos(blastPad.angle), outward * Math.sin(blastPad.angle)));
  plane.translate(
    tipX + (outward * arm * Math.sin(blastPad.angle)) / 2,
    0,
    RUNWAY.z + (side * half) / 2,
  );
  return plane;
}

export function chevrons(): BufferGeometry {
  const { blastPad } = AIRFIELD.runway;
  return mergeParts(
    ENDS.flatMap(([edge, outward]) =>
      Array.from({ length: blastPad.chevrons }, (_, index) => {
        const tipX = edge + outward * blastPad.spacing * (index + 0.5);
        return SIDES.map((side) => chevronArm(tipX, outward, side));
      }).flat(),
    ),
  );
}

export function blastPads(): BufferGeometry {
  const { length } = AIRFIELD.runway.blastPad;
  const half = RUNWAY.halfWidth;
  const top = AIRFIELD.surface - AIRFIELD.steps.pad;
  return mergeParts(
    ENDS.map(([edge, outward]) =>
      slab(outward < 0 ? [edge - length, edge] : [edge, edge + length], [-half, half], top),
    ),
  );
}

export function shoulders(): BufferGeometry {
  const reach = AIRFIELD.runway.blastPad.length + AIRFIELD.runway.shoulder;
  const half = RUNWAY.halfWidth + AIRFIELD.runway.shoulder;
  return slab(
    [RUNWAY.x[0] - reach, RUNWAY.x[1] + reach],
    [-half, half],
    AIRFIELD.surface - AIRFIELD.steps.shoulder,
  );
}

function runwayLamps(): Lamp[] {
  const { spacing, lift, endLights, endOffset, colours } = AIRFIELD.lights;
  const [start, end] = RUNWAY.x;
  const half = RUNWAY.halfWidth + AIRFIELD.runway.shoulder / 2;
  const lamps: Lamp[] = [];
  for (let x = start; x <= end + EPSILON; x += spacing) {
    SIDES.forEach((side) => lamps.push({ at: [x, lift, side * half], colour: colours.edge }));
  }
  for (let index = 0; index < endLights; index += 1) {
    const z = -half + (2 * half * index) / (endLights - 1);
    lamps.push({ at: [start - endOffset, lift, z], colour: colours.start });
    lamps.push({ at: [end + endOffset, lift, z], colour: colours.end });
  }
  return lamps;
}

function taxiwayLamps(): Lamp[] {
  const { taxiway } = AIRFIELD;
  const { taxiSpacing, taxiOffset, lift, colours } = AIRFIELD.lights;
  const lamps: Lamp[] = [];
  for (let x = taxiway.x[0]; x <= taxiway.x[1]; x += taxiSpacing) {
    SIDES.forEach((side) =>
      lamps.push({
        at: [x, lift, taxiway.z + side * (taxiway.halfWidth + taxiOffset)],
        colour: colours.taxi,
      }),
    );
  }
  return lamps;
}

export function airfieldLights(context: PartContext): PointCloud {
  const lamps = [...runwayLamps(), ...taxiwayLamps()];
  const material = registered(
    context,
    'runway',
    createPointMaterial(context.textures.glow, AIRFIELD.lights.edgeSize, AdditiveBlending),
  );
  material.toneMapped = false;
  const cloud = context.tracker.track(new PointCloud(lamps.length, material));
  const tint = new Color();
  lamps.forEach(({ at, colour }, index) => {
    tint.set(colour);
    cloud.setPoint(index, ...at);
    cloud.setColor(index, tint.r, tint.g, tint.b, 1);
  });
  cloud.commit();
  return cloud;
}
