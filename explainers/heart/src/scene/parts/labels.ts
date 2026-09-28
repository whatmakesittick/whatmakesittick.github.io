import type { Vector3 } from 'three';
import type { Object3D } from 'three';
import { anchorAt } from '@core/scene/parts';
import { PART_IDS } from '../../ids';
import type { AnchorId, PartId } from '../../ids';
import { APEX, AV_NODE, CHAMBERS, SINUS_NODE, VALVES } from '../../model';
import type { Point } from '../../model';
import { LABELS, VESSELS } from '../constants';
import type { VesselName } from '../constants';
import { displace } from '../geometry/contraction';
import type { Contraction, Offset } from '../geometry/contraction';
import type { Field } from '../geometry/field';
import { gradient } from '../geometry/field';
import { surfacePoint } from '../geometry/surfacePath';
import type { SurfaceMark } from '../geometry/surfacePath';
import { pointAtDistance, routeCurve } from '../geometry/vesselPath';
import { ringCentre } from '../regions';

export interface LabelSources {
  readonly envelope: Field;
  readonly chordae: Vector3;
  readonly coronary: Vector3;
  readonly hiddenCoronary: Vector3;
}

type Placement = { readonly cut: Point; readonly whole: Point };

function lifted(point: Point, lift: number): Point {
  return [point[0], point[1], point[2] + lift];
}

function onSurface(envelope: Field, mark: SurfaceMark, lift: number): Point {
  const hit = surfacePoint(envelope, mark);
  const normal = gradient(envelope, ...hit);
  return [hit[0] + normal[0] * lift, hit[1] + normal[1] * lift, hit[2] + normal[2] * lift];
}

function alongVessel(name: VesselName, share: number): Point {
  const curve = routeCurve(VESSELS[name].route);
  const point = pointAtDistance(curve, curve.getLength() * share);
  return [point.x, point.y, point.z];
}

function aboveRing(valve: 'pulmonary' | 'aortic', distance: number): Point {
  const centre = ringCentre(valve);
  const [nx, ny, nz] = VALVES[valve].normal;
  const size = Math.hypot(nx, ny, nz);
  return [
    centre[0] + (nx / size) * distance,
    centre[1] + (ny / size) * distance,
    centre[2] + (nz / size) * distance,
  ];
}

export class LabelAnchors {
  readonly labels = new Map<PartId, Object3D>();
  readonly anchors = new Map<AnchorId, Object3D>();
  private readonly placements = new Map<PartId, Placement>();
  private readonly apexRest: Point;
  private readonly outer: Contraction;
  private readonly moved: Offset = [0, 0, 0];

  constructor(parent: Object3D, sources: LabelSources, outer: Contraction) {
    this.outer = outer;
    const lift = LABELS.liftMm;
    const surface = (mark: SurfaceMark) => onSurface(sources.envelope, mark, lift);
    this.apexRest = onSurface(sources.envelope, { view: 'below', at: [APEX[0], APEX[2]] }, lift);
    const fixed = (point: Point): Placement => ({
      cut: lifted(point, lift),
      whole: lifted(point, lift),
    });
    const chamber = (point: Point, mark: SurfaceMark): Placement => ({
      cut: lifted(point, lift),
      whole: surface(mark),
    });
    const table: Record<PartId, Placement> = {
      rightAtrium: chamber(CHAMBERS.rightAtrium.centre, LABELS.surface.rightAtrium),
      rightVentricle: chamber(CHAMBERS.rightVentricle.centre, LABELS.surface.rightVentricle),
      leftAtrium: chamber(CHAMBERS.leftAtrium.centre, LABELS.surface.leftAtrium),
      leftVentricle: chamber(CHAMBERS.leftVentricle.centre, LABELS.surface.leftVentricle),
      septum: chamber(LABELS.septum, LABELS.surface.septum),
      wall: chamber(LABELS.wall, LABELS.surface.wall),
      apex: fixed(this.apexRest),
      tricuspidValve: fixed(ringCentre('tricuspid')),
      pulmonaryValve: fixed(ringCentre('pulmonary')),
      mitralValve: fixed(ringCentre('mitral')),
      aorticValve: fixed(ringCentre('aortic')),
      chordae: fixed([sources.chordae.x, sources.chordae.y, sources.chordae.z]),
      aorta: fixed(alongVessel('aorta', LABELS.vesselShare.aorta)),
      archBranches: fixed(alongVessel('brachiocephalic', LABELS.vesselShare.archBranches)),
      pulmonaryTrunk: {
        whole: lifted(alongVessel('pulmonaryTrunk', LABELS.vesselShare.pulmonaryTrunk), lift),
        cut: aboveRing('pulmonary', LABELS.trunkAboveRingMm),
      },
      pulmonaryArteries: fixed(
        alongVessel('leftPulmonaryArtery', LABELS.vesselShare.pulmonaryArteries),
      ),
      superiorVenaCava: fixed(alongVessel('superiorVenaCava', LABELS.vesselShare.superiorVenaCava)),
      inferiorVenaCava: fixed(alongVessel('inferiorVenaCava', LABELS.vesselShare.inferiorVenaCava)),
      pulmonaryVeins: fixed(alongVessel('pulmonaryVein0', LABELS.vesselShare.pulmonaryVeins)),
      coronaries: {
        whole: [sources.coronary.x, sources.coronary.y, sources.coronary.z],
        cut: [sources.hiddenCoronary.x, sources.hiddenCoronary.y, sources.hiddenCoronary.z],
      },
      sinusNode: fixed(SINUS_NODE.centre),
      avNode: fixed(AV_NODE),
      bundleBranches: fixed(LABELS.bundleBranches),
      purkinjeFibres: fixed(LABELS.purkinjeFibres),
      venousBlood: fixed(alongVessel('superiorVenaCava', LABELS.vesselShare.venousBlood)),
      arterialBlood: fixed(alongVessel('aorta', LABELS.vesselShare.arterialBlood)),
    };
    for (const id of PART_IDS) {
      const placement = table[id];
      this.placements.set(id, placement);
      this.labels.set(id, anchorAt(parent, ...placement.whole));
    }
    const named: Record<AnchorId, Point> = {
      apex: APEX,
      tricuspid: VALVES.tricuspid.centre,
      pulmonary: ringCentre('pulmonary'),
      mitral: VALVES.mitral.centre,
      aortic: VALVES.aortic.centre,
      sinusNode: SINUS_NODE.centre,
      avNode: AV_NODE,
      rightAtrium: CHAMBERS.rightAtrium.centre,
      rightVentricle: CHAMBERS.rightVentricle.centre,
      leftAtrium: CHAMBERS.leftAtrium.centre,
      leftVentricle: CHAMBERS.leftVentricle.centre,
    };
    for (const id of Object.keys(named) as AnchorId[])
      this.anchors.set(id, anchorAt(parent, ...named[id]));
  }

  setCutaway(cutaway: boolean): void {
    for (const [id, placement] of this.placements) {
      this.labels.get(id)?.position.set(...(cutaway ? placement.cut : placement.whole));
    }
  }

  setContraction(squeeze: number, emptying: number): void {
    displace(this.outer, this.apexRest, squeeze, emptying, this.moved);
    this.labels.get('apex')?.position.set(...this.moved);
  }
}
