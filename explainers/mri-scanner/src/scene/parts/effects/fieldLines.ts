import {
  BufferAttribute,
  BufferGeometry,
  CatmullRomCurve3,
  Float32BufferAttribute,
  Group,
  Mesh,
  TubeGeometry,
  Vector3,
} from 'three';
import type { Object3D, ShaderMaterial } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { clamp } from '@core/math';
import { anchorAt } from '@core/scene/parts';
import type { Fringe } from '../../../ids';
import { BORE, FLOOR_Y, ISOCENTRE, ROOM } from '../../../model/layout';
import { registered } from '../context';
import type { PartContext } from '../context';
import { advanceOffset, flowMaterial, ribbonMaterial } from './glow';
import { FIELD_LINES, FRINGE } from './looks';
import { ellipseRibbon, fieldLoop, fieldLoopSpecs, loopAzimuths, placeLoop } from './paths';

const CURVE_TYPE = 'centripetal';
const COMPONENTS = 3;
const FRINGE_REACH = { side: ROOM.x[1], along: Math.min(-ROOM.z[0], ROOM.z[1]) } as const;
const LABEL_ANGLE = Math.PI / 4;

function loopTube(points: readonly (readonly [number, number, number])[]): BufferGeometry {
  const curve = new CatmullRomCurve3(
    points.map((point) => new Vector3(...point)),
    true,
    CURVE_TYPE,
  );
  const geometry = new TubeGeometry(
    curve,
    FIELD_LINES.tubularSegments,
    FIELD_LINES.tubeRadius,
    FIELD_LINES.radialSegments,
    true,
  );
  const dashes = Math.max(1, Math.round(curve.getLength() / FIELD_LINES.dashPeriod));
  const count = geometry.getAttribute('position').count;
  geometry.setAttribute('aDashes', new BufferAttribute(new Float32Array(count).fill(dashes), 1));
  return geometry;
}

function fieldTubes(): BufferGeometry {
  const tubes = fieldLoopSpecs().flatMap((spec) =>
    loopAzimuths(FIELD_LINES.planes).map((azimuth) =>
      loopTube(placeLoop(fieldLoop(spec), azimuth, ISOCENTRE)),
    ),
  );
  const merged = mergeGeometries(tubes);
  tubes.forEach((tube) => tube.dispose());
  if (!merged) throw new Error('Could not merge the field line tubes');
  return merged;
}

function ribbonGeometry(): BufferGeometry {
  const { segments } = FRINGE;
  const vertices = (segments + 1) * 2;
  const uv = Array.from({ length: vertices }, (_, index) => [
    Math.floor(index / 2) / segments,
    index % 2,
  ]).flat();
  const indices = Array.from({ length: segments }, (_, index) => {
    const a = index * 2;
    return [a, a + 1, a + 2, a + 1, a + 3, a + 2];
  }).flat();
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(vertices * COMPONENTS, COMPONENTS));
  geometry.setAttribute('uv', new Float32BufferAttribute(uv, 2));
  geometry.setIndex(indices);
  return geometry;
}

export class FieldLines {
  readonly lines = new Group();
  readonly fringe = new Group();
  readonly linesLabel: Object3D;
  readonly fringeLabel: Object3D;
  private readonly flow: ShaderMaterial;
  private readonly ribbon: BufferGeometry;
  private shownFringe: Fringe = { along: 0, side: 0 };

  constructor(context: PartContext) {
    this.lines.name = 'fieldLinesGroup';
    this.fringe.name = 'fringeLine';
    this.flow = registered(context, 'fieldLinesGroup', flowMaterial());
    const tubes = new Mesh(context.tracker.track(fieldTubes()), this.flow);
    this.lines.add(tubes);
    this.ribbon = context.tracker.track(ribbonGeometry());
    const ribbon = new Mesh(this.ribbon, registered(context, 'fringeLine', ribbonMaterial()));
    ribbon.position.set(ISOCENTRE[0], FLOOR_Y + FRINGE.lift, ISOCENTRE[2]);
    ribbon.frustumCulled = false;
    this.fringe.add(ribbon);
    this.linesLabel = anchorAt(
      this.lines,
      ISOCENTRE[0],
      ISOCENTRE[1] + BORE.radius,
      ISOCENTRE[2] - BORE.halfLength - FIELD_LINES.capClearance,
    );
    this.fringeLabel = anchorAt(this.fringe, ISOCENTRE[0], FLOOR_Y, ISOCENTRE[2]);
  }

  show(visible: boolean): void {
    this.lines.visible = visible;
    this.fringe.visible = visible;
  }

  setFringe({ along, side }: Fringe): void {
    const target = {
      along: clamp(along, 0, FRINGE_REACH.along),
      side: clamp(side, 0, FRINGE_REACH.side),
    };
    if (target.along === this.shownFringe.along && target.side === this.shownFringe.side) return;
    this.shownFringe = target;
    const position = this.ribbon.getAttribute('position') as BufferAttribute;
    ellipseRibbon(target.side, target.along, FRINGE.segments, FRINGE.halfWidth).forEach(
      ([x, z], index) => position.setXYZ(index, x, 0, z),
    );
    position.needsUpdate = true;
    this.ribbon.computeBoundingSphere();
    this.fringeLabel.position.set(
      ISOCENTRE[0] + target.side * Math.cos(LABEL_ANGLE),
      FLOOR_Y,
      ISOCENTRE[2] + target.along * Math.sin(LABEL_ANGLE),
    );
  }

  advance(deltaSeconds: number): boolean {
    if (!this.lines.visible) return false;
    advanceOffset(this.flow, deltaSeconds * FIELD_LINES.flowSpeed);
    return true;
  }
}
