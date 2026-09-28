import type { Mesh, Object3D } from 'three';
import { toRadians } from '@core/math';
import { anchorAt } from '@core/scene/parts';
import { mainspringCoil } from '../../../model/kinematics';
import { MAINSPRING } from '../../../model/layout';
import { MAINSPRING_BLADE } from '../../../model/train';
import { ANCHOR_LIFT_MM, BARREL_DRUM, MAINSPRING_RIBBON } from '../../constants';
import { RibbonGeometry } from '../../geometry/ribbon';
import type { RibbonSection } from '../../geometry/ribbon';
import { chained } from '../../geometry/spiral';
import type { SpiralSegment } from '../../geometry/spiral';
import { partMesh } from '../context';
import type { PartContext } from '../context';

const FULL_CIRCLE = Math.PI * 2;
const PITCH = MAINSPRING_BLADE.thicknessMm;
const WALL_HOOK_RADIUS = BARREL_DRUM.wallInner - MAINSPRING_RIBBON.wallGap - PITCH / 2;
const ARBOR_HOOK_RADIUS = MAINSPRING.arborRadiusMm + PITCH / 2;
const WALL_HOOK = toRadians(MAINSPRING_RIBBON.hookDeg);

const SECTION: RibbonSection = {
  halfWidth: (PITCH * MAINSPRING_RIBBON.drawnThicknessShare) / 2,
  bottom: MAINSPRING_RIBBON.span[0],
  top: MAINSPRING_RIBBON.span[1],
};

interface CoilShape {
  readonly outerTail: number;
  readonly coilSweep: number;
  readonly inner: number;
  readonly outer: number;
}

function coilShape(reserve: number): CoilShape {
  const coil = mainspringCoil(reserve);
  const inner = coil.innerRadiusMm + PITCH / 2;
  const outer = coil.outerRadiusMm - PITCH / 2;
  const gap = Math.max(0, WALL_HOOK_RADIUS - outer);
  const outerTail = Math.max(
    MAINSPRING_RIBBON.minOuterTail,
    gap * MAINSPRING_RIBBON.outerTailPerMm,
  );
  return { outerTail, coilSweep: FULL_CIRCLE * (coil.coils - 1), inner, outer };
}

const RUN_DOWN = coilShape(0);

const MAINSPRING_BASE_SWEEP =
  MAINSPRING_RIBBON.restInnerTail + RUN_DOWN.outerTail + RUN_DOWN.coilSweep;

export const ARBOR_HOOK_ANGLE = WALL_HOOK + MAINSPRING_BASE_SWEEP;

export function mainspringSegments(reserve: number, arborDeg: number): SpiralSegment[] {
  const shape = coilShape(reserve);
  const total = MAINSPRING_BASE_SWEEP + toRadians(arborDeg);
  const innerTail = total - shape.outerTail - shape.coilSweep;
  return chained({ radius: WALL_HOOK_RADIUS, angle: WALL_HOOK }, [
    { toRadius: shape.outer, sweep: shape.outerTail, samples: MAINSPRING_RIBBON.outerTailSamples },
    { toRadius: shape.inner, sweep: shape.coilSweep, samples: MAINSPRING_RIBBON.coilSamples },
    { toRadius: ARBOR_HOOK_RADIUS, sweep: innerTail, samples: MAINSPRING_RIBBON.innerTailSamples },
  ]);
}

export class MainspringPart {
  readonly mesh: Mesh;
  readonly label: Object3D;
  private readonly ribbon: RibbonGeometry;

  constructor(context: PartContext, barrel: Object3D) {
    this.ribbon = new RibbonGeometry(mainspringSegments(0, 0));
    this.mesh = partMesh(context, this.ribbon.geometry, 'mainspring', 'blued');
    this.mesh.frustumCulled = false;
    barrel.add(this.mesh);
    this.label = anchorAt(barrel, 0, 0, SECTION.top + ANCHOR_LIFT_MM);
  }

  setReserve(reserve: number, arborDeg: number): void {
    const segments = mainspringSegments(reserve, arborDeg);
    this.ribbon.write(segments, SECTION);
    const coil = mainspringCoil(reserve);
    const middle = (coil.innerRadiusMm + coil.outerRadiusMm) / 2;
    const angle = toRadians(BARREL_DRUM.sectorCentreDeg);
    this.label.position.set(
      middle * Math.cos(angle),
      middle * Math.sin(angle),
      this.label.position.z,
    );
  }
}
