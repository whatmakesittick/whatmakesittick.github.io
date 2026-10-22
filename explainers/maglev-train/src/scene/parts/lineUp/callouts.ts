import type { Object3D } from 'three';
import { THEME } from '../../../theme';
import { label, namedGroup } from '../context';
import type { PartContext } from '../context';
import { flatMesh } from '../inset/flat';
import { merged, segment, triangle } from '../inset/strokes';
import { TextPlate } from '../inset/textPlate';
import { bracket, grown, towardViewer } from './bracket';
import type { Bracket, BracketSpec, BracketStyle } from './bracket';
import { CALLOUTS } from './constants';

export const CALLOUTS_NAME = 'gapCallouts';
const PART = 'gapCallouts';
const QUARTER_TURN = Math.PI / 2;
const HALO_OPACITY = 0.82;
const PLATE_FILL = `${THEME.inset}e6`;
const LABEL_LIFT = 0.7;

const STYLE: BracketStyle = {
  arrowLength: CALLOUTS.arrow.length,
  arrowHalf: CALLOUTS.arrow.half,
  stem: CALLOUTS.stem,
};

interface CalloutSpec {
  readonly bracket: BracketSpec;
  readonly plate: { readonly u: number; readonly y: number; readonly width: number };
  readonly text: string;
}

function transrapidCallout(): CalloutSpec {
  const spec = CALLOUTS.transrapid;
  const line = towardViewer(spec.lineZ);
  return {
    bracket: {
      line,
      top: spec.top,
      bottom: spec.bottom,
      extension: [towardViewer(spec.fromZ), line + CALLOUTS.overshoot],
    },
    plate: { u: towardViewer(spec.plate.z), y: spec.plate.y, width: spec.plate.width },
    text: spec.text,
  };
}

function scmaglevCallout(): CalloutSpec {
  const spec = CALLOUTS.scmaglev;
  const line = towardViewer(spec.lineZ);
  return {
    bracket: {
      line,
      top: spec.top,
      bottom: spec.bottom,
      extension: [line - spec.extentZ, line + spec.extentZ],
    },
    plate: { u: towardViewer(spec.plate.z), y: spec.plate.y, width: spec.plate.width },
    text: spec.text,
  };
}

export const CALLOUT_SPECS: readonly CalloutSpec[] = [transrapidCallout(), scmaglevCallout()];

function strokes(brackets: readonly Bracket[], width: number, grow: number) {
  return merged(
    brackets.flatMap((shape) => [
      ...shape.segments.map(([a, b]) => segment(a, b, width)),
      ...shape.arrows.map((arrow) => triangle(...grown(arrow, grow))),
    ]),
  );
}

function addPlate(context: PartContext, parent: Object3D, spec: CalloutSpec): void {
  const plate = new TextPlate(
    context,
    PART,
    {
      width: spec.plate.width,
      height: CALLOUTS.plateHeight,
      pixelsPerMetre: CALLOUTS.pixelsPerMetre,
      fontShare: CALLOUTS.plateFontShare,
      ink: '#ffffff',
      plate: PLATE_FILL,
      rim: THEME.insetLine,
      depthTest: false,
    },
    CALLOUTS.order.plate,
  );
  plate.show(spec.text);
  plate.mesh.position.set(spec.plate.u, spec.plate.y, 0);
  parent.add(plate.mesh);
}

export function buildCallouts(context: PartContext): Object3D {
  const group = namedGroup(CALLOUTS_NAME);
  group.position.x = CALLOUTS.x;
  group.rotation.y = QUARTER_TURN;
  const brackets = CALLOUT_SPECS.map((spec) => bracket(spec.bracket, STYLE));
  const halo = strokes(brackets, CALLOUTS.halo, CALLOUTS.arrow.halo);
  const core = strokes(brackets, CALLOUTS.core, 0);
  group.add(
    flatMesh(
      context,
      halo,
      PART,
      { colour: THEME.inset, opacity: HALO_OPACITY, depthTest: false },
      CALLOUTS.order.halo,
    ),
    flatMesh(
      context,
      core,
      PART,
      { colour: THEME.insetLine, depthTest: false },
      CALLOUTS.order.core,
    ),
  );
  CALLOUT_SPECS.forEach((spec) => addPlate(context, group, spec));
  const lead = CALLOUT_SPECS[0].plate;
  label(context, 'gapCallouts', group, [lead.u, lead.y + LABEL_LIFT, 0]);
  return group;
}
