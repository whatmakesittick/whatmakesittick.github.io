import { CatmullRomCurve3, Group } from 'three';
import type { BufferGeometry } from 'three';
import { toRadians } from '@core/math';
import { axleBulgeAzimuth, bladeAzimuth } from '../../../model/rotor';
import { AXLE, C_RING, spanLength } from '../../../model/scale';
import { AXLE_FORM, BLADE } from '../../constants';
import type { Detail } from '../../constants';
import { coiledPair } from '../../geometry/coil';
import { mergeParts } from '../../geometry/merge';
import { ringLayout } from '../../geometry/ringLayout';
import type { RingLayout } from '../../geometry/ringLayout';
import { capsuleBetween, latheY, polar, sphereAt } from '../../geometry/solids';
import { finishMesh } from '../context';
import type { PartContext } from '../context';
import { Variants } from '../variants';
import type { MotorLook } from './look';

function bladeParts(layout: RingLayout, blade: number, detail: Detail): BufferGeometry[] {
  const azimuth = bladeAzimuth(blade, 0, layout.bladeCount);
  const [bottom, top] = C_RING.height;
  const outer = BLADE.outerHelixRadius;
  const inner = BLADE.innerHelixRadius;
  const innerReach = inner + BLADE.innerHelixInset;
  const outerTop = polar(azimuth, layout.outerHelixCentre, top - outer);
  const innerTop = polar(azimuth, layout.innerHelixCentre, top - innerReach);
  return [
    capsuleBetween(
      polar(azimuth, layout.outerHelixCentre, bottom + outer),
      outerTop,
      outer,
      detail,
    ),
    capsuleBetween(
      polar(azimuth, layout.innerHelixCentre, bottom + innerReach),
      innerTop,
      inner,
      detail,
    ),
    capsuleBetween(innerTop, outerTop, inner, detail),
  ];
}

export function ringGeometry(layout: RingLayout, detail: Detail): BufferGeometry {
  const blades = Array.from({ length: layout.bladeCount }, (_, blade) => blade);
  return mergeParts(blades.flatMap((blade) => bladeParts(layout, blade, detail)));
}

export function carboxylGeometry(layout: RingLayout, detail: Detail): BufferGeometry {
  const blades = Array.from({ length: layout.bladeCount }, (_, blade) => blade);
  return mergeParts(
    blades.map((blade) =>
      sphereAt(
        polar(bladeAzimuth(blade, 0, layout.bladeCount), layout.carboxylRadius, 0),
        BLADE.carboxylRadius,
        detail,
      ),
    ),
  );
}

function footGeometry(detail: Detail): BufferGeometry {
  const [bottom] = AXLE.foot;
  const height = spanLength(AXLE.foot);
  const knob = latheY(AXLE_FORM.footProfile, height, AXLE.footRadius, detail);
  knob.translate(0, bottom, 0);
  const lumps = AXLE_FORM.footLumps.map((lump) =>
    sphereAt(
      polar(
        lump.azimuthDeg,
        AXLE.footRadius * lump.radiusShare,
        bottom + height * lump.heightShare,
      ),
      lump.size,
      detail,
    ),
  );
  return mergeParts([knob, ...lumps]);
}

function gammaGeometry(detail: Detail): BufferGeometry {
  const [bottom] = AXLE.gamma;
  const shares = AXLE_FORM.bulgeShares;
  const rise = spanLength(AXLE.gamma) / (shares.length - 1);
  const bulgeAzimuth = axleBulgeAzimuth(0);
  const centreline = new CatmullRomCurve3(
    shares.map((share, index) =>
      polar(bulgeAzimuth, AXLE.bulgeOffset * share, bottom + rise * index),
    ),
  );
  return coiledPair(centreline, AXLE_FORM.coil, detail);
}

export function axleGeometry(detail: Detail): BufferGeometry {
  return mergeParts([footGeometry(detail), gammaGeometry(detail)]);
}

export class RotorPart {
  readonly object = new Group();
  private readonly context: PartContext;
  private readonly look: MotorLook;
  private readonly rings: Variants<number>;

  constructor(context: PartContext, look: MotorLook, bladeCount: number) {
    this.context = context;
    this.look = look;
    this.rings = new Variants(this.object, (count) => this.buildRing(count));
    this.object.add(
      finishMesh(
        context,
        axleGeometry(look.detail),
        look.group('centralStalk'),
        look.finishes.axle,
      ),
    );
    this.setBladeCount(bladeCount);
  }

  setAngle(rotorDeg: number): void {
    this.object.rotation.y = toRadians(rotorDeg);
  }

  setBladeCount(bladeCount: number): void {
    this.rings.show(bladeCount);
  }

  private buildRing(bladeCount: number): Group {
    const layout = ringLayout(bladeCount);
    const { detail, finishes } = this.look;
    const group = this.look.group('cRing');
    const ring = new Group();
    ring.add(
      finishMesh(this.context, ringGeometry(layout, detail), group, finishes.ring),
      finishMesh(this.context, carboxylGeometry(layout, detail), group, finishes.carboxyl),
    );
    return ring;
  }
}
