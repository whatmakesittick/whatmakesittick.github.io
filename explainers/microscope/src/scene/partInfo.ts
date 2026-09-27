import type { PartInfo } from '@core/explainer';
import type { PartId } from '../state';

export const PART_INFO: Record<PartId, PartInfo> = {
  lamp: { labelKey: 'parts.lamp', side: 'left' },
  fieldDiaphragm: { labelKey: 'parts.fieldDiaphragm', side: 'right' },
  condenser: { labelKey: 'parts.condenser', side: 'left' },
  irisDiaphragm: { labelKey: 'parts.irisDiaphragm', side: 'right' },
  stage: { labelKey: 'parts.stage', side: 'left' },
  specimen: { labelKey: 'parts.specimen', side: 'right' },
  objective: { labelKey: 'parts.objective', side: 'left' },
  nosepiece: { labelKey: 'parts.nosepiece', side: 'right' },
  tube: { labelKey: 'parts.tube', side: 'left' },
  intermediateImage: { labelKey: 'parts.intermediateImage', side: 'right' },
  eyepiece: { labelKey: 'parts.eyepiece', side: 'left' },
  eye: { labelKey: 'parts.eye', side: 'left' },
  retina: { labelKey: 'parts.retina', side: 'right' },
  focusKnob: { labelKey: 'parts.focusKnob', side: 'right' },
};

export const PART_IDS = Object.keys(PART_INFO) as PartId[];

export const LABEL_PRIORITY: readonly PartId[] = [
  'objective',
  'eyepiece',
  'condenser',
  'specimen',
  'eye',
  'intermediateImage',
  'retina',
  'stage',
  'lamp',
  'focusKnob',
  'tube',
  'nosepiece',
  'irisDiaphragm',
  'fieldDiaphragm',
];
