import { Group, LatheGeometry, Vector2 } from 'three';
import type { BufferGeometry, Object3D } from 'three';
import { toRadians } from '@core/math';
import { anchorAt } from '@core/scene/parts';
import { WINDING_PINION_CENTRE } from '../../../model/layout';
import {
  CROWN_RADIUS_MM,
  CROWN_SPAN_X_MM,
  STEM_AXIS_Z_MM,
  STEM_START_X_MM,
} from '../../../model/scale';
import { WINDING } from '../../../model/train';
import {
  ANCHOR_LIFT_MM,
  CROWN_KNOB,
  SEGMENTS,
  STEM,
  WINDING_PINION,
  WINDING_TOOTH,
} from '../../constants';
import { extrudeOutline, latheZ } from '../../geometry/extrude';
import type { LathePoint } from '../../geometry/extrude';
import { formProfile, gearModule, toothPitch } from '../../geometry/gear';
import { merge } from '../../geometry/merge';
import { block } from '../../geometry/solids';
import { partMesh } from '../context';
import type { PartContext } from '../context';

const QUARTER_TURN = Math.PI / 2;
const FLUTE_SHARPNESS = 3;
const STEM_LABEL_X = 13;
const NECK_STEP = { share: 0.92, length: 0.12 } as const;
const FLUTE_MARGIN = 0.1;
const FACE_TOOTH_SHARE = 0.5;
const CROWN_FACE_SHARE = 0.5;

function alongX(geometry: BufferGeometry): BufferGeometry {
  geometry.rotateY(QUARTER_TURN);
  return geometry;
}

function stemGeometry(): BufferGeometry {
  const { radius, end, groove } = STEM;
  const grooveStart = groove.at - groove.width / 2;
  const grooveEnd = groove.at + groove.width / 2;
  const profile: LathePoint[] = [
    [0, STEM_START_X_MM],
    [radius, STEM_START_X_MM],
    [radius, grooveStart],
    [groove.radius, grooveStart],
    [groove.radius, grooveEnd],
    [radius, grooveEnd],
    [radius, end],
    [0, end],
  ];
  return alongX(latheZ(profile, SEGMENTS.arbor));
}

function faceTooth(index: number, pitch: number): BufferGeometry {
  const { inner, outer, height } = WINDING_PINION.faceTeeth;
  const width = (inner + outer) * Math.sin(pitch / 2) * FACE_TOOTH_SHARE;
  const tooth = block([0, (inner + outer) / 2, height / 2], [width, outer - inner, height]);
  tooth.rotateZ(index * pitch);
  return tooth;
}

function pinionGeometry(): BufferGeometry {
  const [start, end] = WINDING_PINION.span;
  const leaves = formProfile(
    WINDING.windingPinionLeaves,
    WINDING.windingPinionRadiusMm,
    WINDING_TOOTH,
  );
  const pitch = toothPitch(WINDING.windingPinionLeaves);
  const teeth = Array.from({ length: WINDING.windingPinionLeaves }, (_, index) => {
    const tooth = faceTooth(index, pitch);
    tooth.translate(0, 0, end);
    return tooth;
  });
  return alongX(merge([extrudeOutline(leaves, start, end), ...teeth]));
}

function crownProfile(): Vector2[] {
  const [start, end] = CROWN_SPAN_X_MM;
  const { neckRadius, neckEnd, bodyEnd, endRadius, faceDome } = CROWN_KNOB;
  const points: LathePoint[] = [
    [0, start],
    [neckRadius, start],
    [neckRadius, neckEnd],
    [CROWN_RADIUS_MM * NECK_STEP.share, neckEnd],
    [CROWN_RADIUS_MM, neckEnd + NECK_STEP.length],
    [CROWN_RADIUS_MM, bodyEnd],
    [(CROWN_RADIUS_MM + endRadius) / 2, end - faceDome],
    [endRadius, end - faceDome / 2],
    [endRadius * CROWN_FACE_SHARE, end],
    [0, end],
  ];
  return points.map(([radius, x]) => new Vector2(radius, x));
}

function crownGeometry(): BufferGeometry {
  const geometry = new LatheGeometry(crownProfile(), SEGMENTS.crown);
  const position = geometry.getAttribute('position');
  const { neckEnd, bodyEnd, flutes, fluteDepth } = CROWN_KNOB;
  for (let index = 0; index < position.count; index += 1) {
    const along = position.getY(index);
    if (along <= neckEnd + FLUTE_MARGIN || along >= bodyEnd) continue;
    const x = position.getX(index);
    const z = position.getZ(index);
    const angle = Math.atan2(x, z);
    const groove = Math.abs(Math.cos((angle * flutes) / 2)) ** FLUTE_SHARPNESS;
    const scale = 1 - (fluteDepth / CROWN_RADIUS_MM) * groove;
    position.setX(index, x * scale);
    position.setZ(index, z * scale);
  }
  geometry.computeVertexNormals();
  geometry.rotateX(QUARTER_TURN);
  return alongX(geometry);
}

export class KeylessPart {
  readonly object = new Group();
  readonly anchor: Object3D;
  readonly labels: Readonly<Record<'stem' | 'windingPinion' | 'crown', Object3D>>;

  constructor(context: PartContext, frame: Object3D) {
    this.object.position.set(0, 0, STEM_AXIS_Z_MM);
    this.object.add(
      partMesh(context, stemGeometry(), 'stem', 'steel'),
      partMesh(context, pinionGeometry(), 'windingPinion', 'steel'),
      partMesh(context, crownGeometry(), 'crown', 'case'),
    );
    frame.add(this.object);
    const pinionTop =
      WINDING.windingPinionRadiusMm +
      WINDING_TOOTH.addendum *
        gearModule(WINDING.windingPinionLeaves, WINDING.windingPinionRadiusMm);
    const crownEnd = anchorAt(frame, CROWN_SPAN_X_MM[1] + ANCHOR_LIFT_MM, 0, STEM_AXIS_Z_MM);
    this.anchor = crownEnd;
    this.labels = {
      crown: crownEnd,
      stem: anchorAt(frame, STEM_LABEL_X, 0, STEM_AXIS_Z_MM + STEM.radius + ANCHOR_LIFT_MM),
      windingPinion: anchorAt(
        frame,
        WINDING_PINION_CENTRE.x + 0.3,
        0,
        STEM_AXIS_Z_MM + pinionTop + ANCHOR_LIFT_MM,
      ),
    };
  }

  setAngle(degrees: number): void {
    this.object.rotation.x = toRadians(degrees);
  }
}
