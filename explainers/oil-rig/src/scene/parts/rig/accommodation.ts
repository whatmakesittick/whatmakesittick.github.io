import { CircleGeometry, Group, MeshStandardMaterial } from 'three';
import type { BufferGeometry, ColorRepresentation, Object3D } from 'three';
import { box } from '@core/scene/geometry/box';
import { extrudePlan, planShape } from '@core/scene/geometry/extrude';
import type { PlanPoint } from '@core/scene/geometry/extrude';
import { STRUCTURE_GROUP } from '@core/scene/materials';
import { anchorAt } from '@core/scene/parts';
import {
  ACCOMMODATION,
  ACCOMMODATION_ROOF,
  HELIDECK,
  HELIDECK_TOP,
  HULL,
  SEGMENTS,
} from '../../constants';
import { BAND_SURFACE, PAINT } from '../../finishes';
import { barGeometry, rodGeometry } from '../../geometry/bars';
import type { Point } from '../../geometry/bars';
import { mergePainted } from '../../geometry/merge';
import { tubeGeometry } from '../../geometry/tubes';
import { helideckTexture } from '../canvasTextures';
import { partMesh, registeredMesh } from '../context';
import type { PartContext } from '../context';

type Painted = readonly [BufferGeometry, ColorRepresentation];

export interface AccommodationPart {
  object: Group;
  helideckAnchor: Object3D;
}

const QUARTER_TURN = Math.PI / 2;
const DECK_LIFT = 0.02;
const LEG_RING_SHARE = 0.5;
const NET_THICKNESS = 0.08;
const STRUT_DROP = 2.5;
const STRUT_REACH = 0.9;
const DECAL = { polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 } as const;
const ROOF = { overhang: 0.25, thickness: 0.35 } as const;
const STAIR = { x: 16.5, z: 11, size: 3, extra: 3 } as const;

function floors(): Painted[] {
  const {
    minX,
    maxX,
    minZ,
    maxZ,
    floors: count,
    floorHeight,
    windowBand,
    windowInset,
  } = ACCOMMODATION;
  return Array.from({ length: count }, (_, floor): Painted[] => {
    const bottom = HULL.deck.top + floor * floorHeight;
    const glassBottom = bottom + floorHeight - windowBand;
    return [
      [box({ minX, maxX, minY: bottom, maxY: glassBottom, minZ, maxZ }), PAINT.white],
      [
        box({
          minX: minX + windowInset,
          maxX: maxX - windowInset,
          minY: glassBottom,
          maxY: bottom + floorHeight,
          minZ: minZ + windowInset,
          maxZ: maxZ - windowInset,
        }),
        PAINT.glass,
      ],
    ];
  }).flat();
}

function roof(): Painted {
  const { minX, maxX, minZ, maxZ } = ACCOMMODATION;
  const geometry = box({
    minX: minX - ROOF.overhang,
    maxX: maxX + ROOF.overhang,
    minY: ACCOMMODATION_ROOF,
    maxY: ACCOMMODATION_ROOF + ROOF.thickness,
    minZ: minZ - ROOF.overhang,
    maxZ: maxZ + ROOF.overhang,
  });
  return [geometry, PAINT.hullGrey];
}

function stairTower(): Painted {
  const { x, z, size, extra } = STAIR;
  const geometry = box({
    minX: x - size / 2,
    maxX: x + size / 2,
    minY: HULL.deck.top,
    maxY: ACCOMMODATION_ROOF + extra,
    minZ: z - size / 2,
    maxZ: z + size / 2,
  });
  return [geometry, PAINT.cream];
}

function octagon(radius: number): PlanPoint[] {
  const { centreX, centreZ, sides } = HELIDECK;
  return Array.from({ length: sides }, (_, index) => {
    const angle = Math.PI / sides + (index / sides) * Math.PI * 2;
    return { x: centreX + radius * Math.cos(angle), z: centreZ + radius * Math.sin(angle) };
  });
}

function deckPlate(): BufferGeometry {
  return extrudePlan(
    planShape(octagon(HELIDECK.radius)),
    HELIDECK_TOP - HELIDECK.thickness,
    HELIDECK_TOP,
  );
}

function net(): BufferGeometry {
  const { centreX, centreZ, radius, sides, net: width, netDrop } = HELIDECK;
  const ring = tubeGeometry({
    outer: radius + width,
    inner: radius,
    bottom: HELIDECK_TOP - netDrop - NET_THICKNESS,
    top: HELIDECK_TOP - netDrop,
    segments: sides,
    arc: { start: Math.PI / sides, length: Math.PI * 2 },
  });
  ring.translate(centreX, 0, centreZ);
  return ring;
}

function supports(): BufferGeometry[] {
  const { centreX, centreZ, radius, legs, legRadius, thickness } = HELIDECK;
  const underside = HELIDECK_TOP - thickness;
  const ring = radius * LEG_RING_SHARE;
  const legRods = Array.from({ length: legs }, (_, index) => {
    const angle = (index / legs) * Math.PI * 2;
    const x = centreX + ring * Math.cos(angle);
    const z = centreZ + ring * Math.sin(angle);
    return rodGeometry([x, ACCOMMODATION_ROOF, z], [x, underside, z], legRadius, SEGMENTS.rod);
  });
  const overhang: Point[] = [
    [ACCOMMODATION.maxX, ACCOMMODATION_ROOF - STRUT_DROP, centreZ],
    [centreX, ACCOMMODATION_ROOF - STRUT_DROP, ACCOMMODATION.maxZ],
  ];
  const struts = overhang.map((from) => {
    const outward: Point = [
      from[0] === ACCOMMODATION.maxX ? centreX + radius * STRUT_REACH : from[0],
      underside,
      from[2] === ACCOMMODATION.maxZ ? centreZ + radius * STRUT_REACH : from[2],
    ];
    return barGeometry(from, outward, legRadius * 2);
  });
  return [...legRods, ...struts];
}

function markedTop(context: PartContext): Group {
  const { centreX, centreZ, radius, sides, textureSize } = HELIDECK;
  const texture = context.tracker.track(helideckTexture(textureSize));
  const material = new MeshStandardMaterial({ ...BAND_SURFACE, ...DECAL, map: texture });
  const top = new CircleGeometry(radius, sides, Math.PI / sides);
  top.rotateX(-QUARTER_TURN);
  top.translate(centreX, HELIDECK_TOP + DECK_LIFT, centreZ);
  const group = new Group();
  group.add(registeredMesh(context, top, 'helideck', material));
  return group;
}

export function createAccommodation(context: PartContext): AccommodationPart {
  const object = new Group();
  const block = mergePainted([...floors(), roof(), stairTower()]);
  const helideck = mergePainted([
    [deckPlate(), PAINT.trim],
    [net(), PAINT.darkSteel],
    ...supports().map((part) => [part, PAINT.trim] as const),
  ]);
  object.add(
    partMesh(context, block, STRUCTURE_GROUP, 'painted'),
    partMesh(context, helideck, 'helideck', 'painted'),
    markedTop(context),
  );
  const { centreX, centreZ, radius } = HELIDECK;
  const diagonal = radius / Math.SQRT2;
  return {
    object,
    helideckAnchor: anchorAt(object, centreX - diagonal, HELIDECK_TOP, centreZ + diagonal),
  };
}
