import { Group } from 'three';
import type { BufferGeometry, ColorRepresentation, Object3D } from 'three';
import { STRUCTURE_GROUP } from '@core/scene/materials';
import { anchorAt } from '@core/scene/parts';
import type { SectionId } from '../../../ids';
import { depthToY, tubularRadius, unitsPerMetreAt } from '../../../model/scale';
import { SEABED_DEPTH_M, TOTAL_DEPTH_M } from '../../../model/wellPlan';
import { ANCHOR_LIFT, SEGMENTS, WELL_TUBES } from '../../constants';
import { PAINT } from '../../finishes';
import { mergePainted } from '../../geometry/merge';
import { BACK_HALF, tubeGeometry } from '../../geometry/tubes';
import { holeIntervals, isCasedSection, tubeWall } from '../../geometry/wellColumn';
import type { HoleInterval } from '../../geometry/wellColumn';
import { partMesh } from '../context';
import type { EmphasisGroup, PartContext } from '../context';

type Painted = readonly [BufferGeometry, ColorRepresentation];

export type CasingAnchorId = 'conductor' | 'surfaceCasing' | 'intermediateCasing';

interface CasingString {
  shoe: number;
  object: Group;
}

interface TubeSpan {
  outer: number;
  inner: number;
  top: number;
  bottom: number;
}

interface StringSpec {
  inches: number;
  top: number;
  shoe: number;
  openHole: { top: number; radius: number };
  outerWall: number;
  cementTop: number;
  color: ColorRepresentation;
}

const SECTION_PARTS: Partial<Record<SectionId, CasingAnchorId>> = {
  conductor: 'conductor',
  surface: 'surfaceCasing',
  intermediate: 'intermediateCasing',
};

const SHADES: readonly ColorRepresentation[] = [
  PAINT.conductor,
  PAINT.surfaceCasing,
  PAINT.intermediateCasing,
  PAINT.productionCasing,
];

const LABEL_DEPTH_SHARE = [0.5, 0.35, 0.6] as const;
const DEFAULT_LABEL_SHARE = 1 / 2;

function halfTube(span: TubeSpan): BufferGeometry {
  return tubeGeometry({
    outer: span.outer,
    inner: span.inner,
    top: depthToY(span.top),
    bottom: depthToY(span.bottom),
    segments: SEGMENTS.halfTube,
    arc: BACK_HALF,
  });
}

function cementTop(interval: HoleInterval): number {
  if (interval.index < WELL_TUBES.cementedToSeabed) return SEABED_DEPTH_M;
  return Math.max(SEABED_DEPTH_M, interval.top - WELL_TUBES.cementRiseM);
}

function casingPieces(spec: StringSpec): Painted[] {
  const outer = tubularRadius(spec.inches);
  const inner = outer - tubeWall(spec.inches);
  const gap = WELL_TUBES.cementGap;
  const pieces: Painted[] = [
    [halfTube({ outer, inner, top: spec.top, bottom: spec.shoe }), spec.color],
    [
      halfTube({
        outer: spec.openHole.radius - gap,
        inner: outer,
        top: Math.max(spec.openHole.top, spec.cementTop),
        bottom: spec.shoe,
      }),
      PAINT.cement,
    ],
  ];
  if (spec.cementTop < spec.openHole.top && spec.outerWall > outer + gap) {
    pieces.push([
      halfTube({
        outer: spec.outerWall - gap,
        inner: outer,
        top: spec.cementTop,
        bottom: spec.openHole.top,
      }),
      PAINT.cement,
    ]);
  }
  const shoeTop = spec.shoe - WELL_TUBES.shoeHeight / unitsPerMetreAt(spec.shoe);
  pieces.push([
    halfTube({ outer: outer + WELL_TUBES.shoeLip, inner, top: shoeTop, bottom: spec.shoe }),
    PAINT.shoe,
  ]);
  return pieces;
}

function innerRadius(inches: number): number {
  return tubularRadius(inches) - tubeWall(inches);
}

function previousWall(intervals: readonly HoleInterval[], index: number): number {
  for (let previous = index - 1; previous >= 0; previous--) {
    const section = intervals[previous].section;
    if (isCasedSection(section)) return innerRadius(section.casingInches);
  }
  return intervals[0].radius;
}

export class CasingsPart {
  readonly object = new Group();
  readonly anchors: Partial<Record<CasingAnchorId, Object3D>> = {};
  private readonly strings: CasingString[] = [];
  private readonly liner: Group | null;

  constructor(context: PartContext) {
    const intervals = holeIntervals();
    intervals
      .filter((interval) => isCasedSection(interval.section))
      .forEach((interval) => {
        this.addString(context, interval, intervals);
      });
    this.liner = this.createLiner(context, intervals);
  }

  setDepth(depth: number, finished: boolean): void {
    this.strings.forEach((casing) => {
      casing.object.visible = finished || depth > casing.shoe;
    });
    if (this.liner) this.liner.visible = finished;
  }

  private addString(
    context: PartContext,
    interval: HoleInterval,
    intervals: readonly HoleInterval[],
  ) {
    const { section, index } = interval;
    const part = SECTION_PARTS[section.id];
    const group: EmphasisGroup = part ?? STRUCTURE_GROUP;
    const spec: StringSpec = {
      inches: section.casingInches,
      top: SEABED_DEPTH_M,
      shoe: section.shoeDepth,
      openHole: { top: interval.top, radius: interval.radius },
      outerWall: previousWall(intervals, index),
      cementTop: cementTop(interval),
      color: SHADES[Math.min(index, SHADES.length - 1)],
    };
    const object = new Group();
    object.add(partMesh(context, mergePainted(casingPieces(spec)), group, 'casing'));
    this.object.add(object);
    this.strings.push({ shoe: section.shoeDepth, object });
    if (part)
      this.anchors[part] = this.anchorFor(
        object,
        spec,
        LABEL_DEPTH_SHARE[index] ?? DEFAULT_LABEL_SHARE,
        index,
      );
  }

  private anchorFor(object: Group, spec: StringSpec, share: number, index: number): Object3D {
    const depth = SEABED_DEPTH_M + (spec.shoe - SEABED_DEPTH_M) * share;
    const side = index % 2 === 0 ? 1 : -1;
    return anchorAt(object, side * tubularRadius(spec.inches), depthToY(depth), ANCHOR_LIFT);
  }

  private createLiner(context: PartContext, intervals: readonly HoleInterval[]): Group | null {
    const lastCased = [...intervals].reverse().find((interval) => isCasedSection(interval.section));
    const last = intervals[intervals.length - 1];
    if (!lastCased || lastCased === last) return null;
    const spec: StringSpec = {
      inches: WELL_TUBES.linerInches,
      top: lastCased.bottom - WELL_TUBES.linerLapM,
      shoe: TOTAL_DEPTH_M,
      openHole: { top: last.top, radius: last.radius },
      outerWall: innerRadius(lastCased.section.casingInches),
      cementTop: lastCased.bottom - WELL_TUBES.linerLapM,
      color: PAINT.liner,
    };
    const object = new Group();
    object.add(partMesh(context, mergePainted(casingPieces(spec)), STRUCTURE_GROUP, 'casing'));
    object.visible = false;
    this.object.add(object);
    return object;
  }
}
