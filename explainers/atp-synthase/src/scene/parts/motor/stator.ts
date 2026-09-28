import { CatmullRomCurve3, ExtrudeGeometry, Group, Shape } from 'three';
import type { BufferGeometry } from 'three';
import { toCreasedNormals } from 'three/addons/utils/BufferGeometryUtils.js';
import { smoothstep, toRadians } from '@core/math';
import { PICKUP_AZIMUTH_DEG, RELEASE_AZIMUTH_DEG } from '../../../model/rotor';
import { GATE, OSCP, PERIPHERAL_STALK, spanLength } from '../../../model/scale';
import { CHANNEL_FORM, DETAIL, GATE_FORM, OSCP_FORM, STALK_FORM } from '../../constants';
import type { Detail, ProfilePoint } from '../../constants';
import { coiledPair } from '../../geometry/coil';
import { mergeParts } from '../../geometry/merge';
import { ringLayout } from '../../geometry/ringLayout';
import type { RingLayout } from '../../geometry/ringLayout';
import { capsuleBetween, latheY, polar } from '../../geometry/solids';
import { finishMesh } from '../context';
import type { PartContext } from '../context';
import { Variants } from '../variants';
import { FINISHES } from '../../finishes';

const TWO = 2;
const QUARTER_TURN = Math.PI / 2;

function sectorShape(inner: number, outer: number, halfDeg: number): Shape {
  const start = toRadians(GATE.azimuthDeg - halfDeg);
  const end = toRadians(GATE.azimuthDeg + halfDeg);
  const shape = new Shape();
  shape.absarc(0, 0, outer, start, end, false);
  shape.absarc(0, 0, inner, end, start, true);
  shape.closePath();
  return shape;
}

export function gateGeometry(layout: RingLayout, detail: Detail): BufferGeometry {
  const { bevel } = GATE_FORM;
  const shape = sectorShape(
    GATE.innerRadius + layout.growth + bevel,
    GATE.outerRadius + layout.growth - bevel,
    GATE_FORM.arcHalfDeg,
  );
  const slab = new ExtrudeGeometry(shape, {
    depth: spanLength(GATE.span) - bevel * TWO,
    bevelEnabled: true,
    bevelSize: bevel,
    bevelThickness: bevel,
    bevelSegments: GATE_FORM.bevelSegments,
    curveSegments: detail.arc,
  });
  slab.rotateX(-QUARTER_TURN);
  slab.translate(0, GATE.span[0] + bevel, 0);
  const smooth = toCreasedNormals(slab, toRadians(GATE_FORM.creaseDeg));
  slab.dispose();
  return smooth;
}

function channelGeometry(
  layout: RingLayout,
  azimuthDeg: number,
  direction: 1 | -1,
  detail: Detail,
): BufferGeometry {
  const reach = GATE.span[1] + CHANNEL_FORM.reach;
  const profile = CHANNEL_FORM.profile.map(([heightShare, radiusShare]): ProfilePoint => [
    heightShare * direction,
    radiusShare,
  ]);
  const funnel = latheY(profile, reach, CHANNEL_FORM.mouthRadius, detail);
  const at = polar(azimuthDeg, layout.outerRadius + CHANNEL_FORM.ringGap, 0);
  return funnel.translate(at.x, at.y, at.z);
}

export function channelsGeometry(layout: RingLayout, detail: Detail): BufferGeometry {
  return mergeParts([
    channelGeometry(layout, RELEASE_AZIMUTH_DEG, 1, detail),
    channelGeometry(layout, PICKUP_AZIMUTH_DEG, -1, detail),
  ]);
}

export function stalkShift(y: number, growth: number): number {
  return growth * (1 - smoothstep(y, GATE.span[1], STALK_FORM.footReleaseY));
}

export function stalkGeometry(layout: RingLayout, detail: Detail): BufferGeometry {
  const azimuth = PERIPHERAL_STALK.azimuthDeg;
  const path = new CatmullRomCurve3(
    STALK_FORM.path.map(({ radius, y }) =>
      polar(azimuth, radius + stalkShift(y, layout.growth), y),
    ),
  );
  const { radius, span } = STALK_FORM.foot;
  const footRadius = PERIPHERAL_STALK.radius + layout.growth;
  const foot = capsuleBetween(
    polar(azimuth, footRadius, span[0] + radius),
    polar(azimuth, footRadius, span[1] - radius),
    radius,
    detail,
  );
  return mergeParts([coiledPair(path, STALK_FORM.coil, detail), foot]);
}

export function oscpGeometry(detail: Detail): BufferGeometry {
  const height = spanLength(OSCP.span) + OSCP_FORM.sink;
  const cap = latheY(OSCP_FORM.profile, height, OSCP.radius, detail);
  return cap.translate(0, OSCP.span[0] - OSCP_FORM.sink, 0);
}

export class StatorPart {
  readonly object = new Group();
  private readonly context: PartContext;
  private readonly variants: Variants<number>;

  constructor(context: PartContext, bladeCount: number) {
    this.context = context;
    this.variants = new Variants(this.object, (count) => this.build(count));
    this.object.add(
      finishMesh(context, oscpGeometry(DETAIL.hero), 'peripheralStalk', FINISHES.stator),
    );
    this.setBladeCount(bladeCount);
  }

  setBladeCount(bladeCount: number): void {
    this.variants.show(bladeCount);
  }

  private build(bladeCount: number): Group {
    const layout = ringLayout(bladeCount);
    const variant = new Group();
    variant.add(
      finishMesh(this.context, gateGeometry(layout, DETAIL.hero), 'subunitA', FINISHES.gate),
      finishMesh(this.context, channelsGeometry(layout, DETAIL.hero), 'subunitA', FINISHES.channel),
      finishMesh(
        this.context,
        stalkGeometry(layout, DETAIL.hero),
        'peripheralStalk',
        FINISHES.stator,
      ),
    );
    return variant;
  }
}
