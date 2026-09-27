import type { PartInfo } from '@core/explainer';
import type { PartId } from '../state';

export const PART_INFO: Record<PartId, PartInfo> = {
  needle: { labelKey: 'parts.needle', side: 'right' },
  needleBar: { labelKey: 'parts.needleBar', side: 'left' },
  presserFoot: { labelKey: 'parts.presserFoot', side: 'right' },
  throatPlate: { labelKey: 'parts.throatPlate', side: 'right' },
  feedDogs: { labelKey: 'parts.feedDogs', side: 'left' },
  hook: { labelKey: 'parts.hook', side: 'left' },
  bobbinCase: { labelKey: 'parts.bobbinCase', side: 'right' },
  bobbin: { labelKey: 'parts.bobbin', side: 'left' },
  takeUpLever: { labelKey: 'parts.takeUpLever', side: 'left' },
  tensionDiscs: { labelKey: 'parts.tensionDiscs', side: 'right' },
  spool: { labelKey: 'parts.spool', side: 'right' },
  handwheel: { labelKey: 'parts.handwheel', side: 'left' },
  fabric: { labelKey: 'parts.fabric', side: 'left' },
  topThread: { labelKey: 'parts.topThread', side: 'right' },
  bobbinThread: { labelKey: 'parts.bobbinThread', side: 'right' },
};

export const PART_IDS = Object.keys(PART_INFO) as PartId[];

export const LABEL_PRIORITY: readonly PartId[] = [
  'handwheel',
  'spool',
  'takeUpLever',
  'tensionDiscs',
  'needleBar',
  'presserFoot',
  'needle',
  'hook',
  'throatPlate',
  'fabric',
  'feedDogs',
  'bobbinCase',
  'bobbin',
  'topThread',
  'bobbinThread',
];
