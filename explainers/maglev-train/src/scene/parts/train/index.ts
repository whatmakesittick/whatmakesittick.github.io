import { ANCHOR_POINTS, MAGNETS, SECTION_EXTENTS, SKIDS, TRAIN } from '../../../model';
import { label, namedGroup, sceneAnchor } from '../context';
import type { PartContext, Section } from '../context';

const LEAD_X = (SECTION_EXTENTS[0][0] + SECTION_EXTENTS[0][1]) / 2;
const SECOND_X = (SECTION_EXTENTS[1][0] + SECTION_EXTENTS[1][1]) / 2;
const GUIDANCE_OUTER_Z = MAGNETS.guidance.faceZ + MAGNETS.guidance.depth;

export function buildTrain(context: PartContext): Section {
  const root = namedGroup('train');
  label(context, 'train', root, [LEAD_X, TRAIN.roof, 0]);
  label(context, 'wrapArms', root, [LEAD_X, TRAIN.armBottom, -TRAIN.width / 2]);
  label(context, 'supportMagnets', root, [
    LEAD_X,
    MAGNETS.support.top - MAGNETS.support.height,
    -MAGNETS.support.sideZ,
  ]);
  label(context, 'guidanceMagnets', root, [LEAD_X, MAGNETS.guidance.centreY, GUIDANCE_OUTER_Z]);
  label(context, 'eddyBrakes', root, [SECOND_X, MAGNETS.guidance.centreY, GUIDANCE_OUTER_Z]);
  label(context, 'skids', root, [SECOND_X, TRAIN.bodyBottom - SKIDS.height, -SKIDS.stripZ]);
  sceneAnchor(context, 'nose', root, ANCHOR_POINTS.nose);
  sceneAnchor(context, 'tail', root, ANCHOR_POINTS.tail);
  sceneAnchor(context, 'arm', root, ANCHOR_POINTS.arm);
  sceneAnchor(context, 'cut', root, ANCHOR_POINTS.cut);
  return { root, setState: () => undefined };
}
