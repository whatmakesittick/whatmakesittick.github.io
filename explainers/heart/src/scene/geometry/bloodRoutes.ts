import { CHAMBERS, VALVES } from '../../model';
import type { Point } from '../../model';
import { PULMONARY_RING, VESSELS, VESSEL_WALL_MM } from '../constants';
import type { VesselName } from '../constants';
import type { PathLeg } from './bloodPath';

export interface BloodRouteStyle {
  readonly depthMm: number;
  readonly chamberSpread: number;
  readonly vesselSpread: number;
}

type Leg = PathLeg;

function behind(point: Point, depth: number): Point {
  return [point[0], point[1], Math.min(point[2], -depth)];
}

function lumen(name: VesselName, style: BloodRouteStyle): number {
  return (VESSELS[name].route.radius - VESSEL_WALL_MM) * style.vesselSpread;
}

function vesselLeg(
  name: VesselName,
  style: BloodRouteStyle,
  reverse: boolean,
  zone: Leg['zone'],
): Leg {
  const points = [...VESSELS[name].route.points];
  return {
    points: reverse ? points.reverse() : points,
    radius: lumen(name, style),
    zone,
    chamber: false,
  };
}

function chamberLeg(
  points: readonly Point[],
  radius: number,
  zone: Leg['zone'],
  style: BloodRouteStyle,
): Leg {
  return {
    points: points.map((point) => behind(point, style.depthMm)),
    radius,
    zone,
    chamber: true,
  };
}

function aortaUntil(count: number, style: BloodRouteStyle): Leg {
  return {
    points: VESSELS.aorta.route.points.slice(0, count),
    radius: lumen('aorta', style),
    zone: 'artery',
    chamber: false,
  };
}

function rightHeart(inlet: VesselName, outlet: VesselName, style: BloodRouteStyle): Leg[] {
  const spread = style.chamberSpread;
  return [
    vesselLeg(inlet, style, true, 'vein'),
    chamberLeg(
      [CHAMBERS.rightAtrium.centre],
      CHAMBERS.rightAtrium.radii[0] * spread,
      'atrium',
      style,
    ),
    chamberLeg(
      [VALVES.tricuspid.centre, CHAMBERS.rightVentricle.centre],
      CHAMBERS.rightVentricle.radii[0] * spread,
      'ventricle',
      style,
    ),
    chamberLeg(
      [
        [-15, -8, 2],
        [-9, 10, 10],
      ],
      lumen('pulmonaryTrunk', style),
      'ventricle',
      style,
    ),
    {
      points: [PULMONARY_RING, ...VESSELS.pulmonaryTrunk.route.points.slice(1)],
      radius: lumen('pulmonaryTrunk', style),
      zone: 'artery',
      chamber: false,
    },
    vesselLeg(outlet, style, false, 'artery'),
  ];
}

function leftHeart(inlet: VesselName, outlet: readonly Leg[], style: BloodRouteStyle): Leg[] {
  const spread = style.chamberSpread;
  return [
    vesselLeg(inlet, style, true, 'vein'),
    chamberLeg(
      [CHAMBERS.leftAtrium.centre],
      CHAMBERS.leftAtrium.radii[0] * spread,
      'atrium',
      style,
    ),
    chamberLeg(
      [VALVES.mitral.centre, CHAMBERS.leftVentricle.centre],
      CHAMBERS.leftVentricle.radii[0] * spread,
      'ventricle',
      style,
    ),
    chamberLeg(
      [
        [8, -10, -4],
        [2, 6, -4],
      ],
      lumen('aorta', style),
      'ventricle',
      style,
    ),
    ...outlet,
  ];
}

const ARCH_BRANCH_AT = { brachiocephalic: 5, leftCarotid: 6, leftSubclavian: 7 } as const;

function archBranch(name: keyof typeof ARCH_BRANCH_AT, style: BloodRouteStyle): Leg[] {
  return [aortaUntil(ARCH_BRANCH_AT[name], style), vesselLeg(name, style, false, 'artery')];
}

export function venousRoutes(style: BloodRouteStyle): Leg[][] {
  return [
    rightHeart('superiorVenaCava', 'leftPulmonaryArtery', style),
    rightHeart('superiorVenaCava', 'rightPulmonaryArtery', style),
    rightHeart('inferiorVenaCava', 'leftPulmonaryArtery', style),
    rightHeart('inferiorVenaCava', 'rightPulmonaryArtery', style),
  ];
}

export function arterialRoutes(style: BloodRouteStyle): Leg[][] {
  return [
    leftHeart('pulmonaryVein0', [aortaUntil(VESSELS.aorta.route.points.length, style)], style),
    leftHeart('pulmonaryVein1', archBranch('brachiocephalic', style), style),
    leftHeart('pulmonaryVein2', archBranch('leftCarotid', style), style),
    leftHeart('pulmonaryVein3', archBranch('leftSubclavian', style), style),
  ];
}
