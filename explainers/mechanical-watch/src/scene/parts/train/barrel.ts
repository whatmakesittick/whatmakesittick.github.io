import { Group } from 'three';
import type { BufferGeometry, Object3D } from 'three';
import { toRadians } from '@core/math';
import { anchorAt } from '@core/scene/parts';
import { WHEEL_CENTRES } from '../../../model/layout';
import { LEVELS } from '../../../model/scale';
import { wheelSpec } from '../../../model/train';
import { ANCHOR_LIFT_MM, BARREL_DRUM, SEGMENTS, WHEEL_LABELS, WHEEL_TOOTH } from '../../constants';
import { FINISHES } from '../../finishes';
import { extrudeOutline } from '../../geometry/extrude';
import { formProfile } from '../../geometry/gear';
import { mergeGrouped } from '../../geometry/merge';
import { annularSector, circlePoints, polarDeg } from '../../geometry/outline';
import { ring } from '../../geometry/solids';
import { layeredMesh } from '../context';
import type { PartContext } from '../context';

const ORIGIN = { x: 0, y: 0 };
const FULL_CIRCLE = Math.PI * 2;

function openSector(inner: number, outer: number) {
  const half = toRadians(BARREL_DRUM.sectorDeg) / 2;
  const centre = toRadians(BARREL_DRUM.sectorCentreDeg);
  return annularSector(
    ORIGIN,
    inner,
    outer,
    centre + half,
    centre - half + FULL_CIRCLE,
    SEGMENTS.disc,
  );
}

function barrelGeometry(phase: number): BufferGeometry {
  const spec = wheelSpec('barrel');
  const { floor, wall, lid, wallInner, wallOuter, journalRadius } = BARREL_DRUM;
  const [teethBottom, teethTop] = LEVELS.barrelTeeth;
  const teeth = extrudeOutline(
    formProfile(spec.teeth, spec.radiusMm, WHEEL_TOOTH, phase),
    teethBottom,
    teethTop,
    [circlePoints({ ...ORIGIN, r: wallInner }, SEGMENTS.disc)],
  );
  return mergeGrouped([
    { geometry: teeth },
    { geometry: ring(ORIGIN, journalRadius, wallInner, floor, SEGMENTS.disc) },
    { geometry: extrudeOutline(openSector(wallInner, wallOuter), wall[0], wall[1]) },
    { geometry: extrudeOutline(openSector(journalRadius, wallOuter), lid[0], lid[1]) },
  ]);
}

export class BarrelPart {
  readonly object = new Group();
  readonly anchor: Object3D;
  readonly label: Object3D;

  constructor(context: PartContext, frame: Object3D, phase: number) {
    const centre = WHEEL_CENTRES.barrel;
    this.object.position.set(centre.x, centre.y, 0);
    const finish = context.surfaces.grained(BARREL_DRUM.wallOuter, FINISHES.brass);
    this.object.add(
      layeredMesh(context, barrelGeometry(phase), 'barrel', [finish, FINISHES.brass]),
    );
    frame.add(this.object);
    const top = BARREL_DRUM.lid[1] + ANCHOR_LIFT_MM;
    const labelAt = polarDeg(centre, WHEEL_LABELS.barrel.radius, WHEEL_LABELS.barrel.deg);
    this.anchor = anchorAt(frame, centre.x, centre.y, top);
    this.label = anchorAt(frame, labelAt.x, labelAt.y, LEVELS.barrelTeeth[1] + ANCHOR_LIFT_MM);
  }

  setAngle(degrees: number): void {
    this.object.rotation.z = toRadians(degrees);
  }
}
