import type { PartInfo } from '@core/explainer';
import type { PartId } from '../state';

export const PART_INFO: Record<PartId, PartInfo> = {
  mainRotor: { labelKey: 'parts.mainRotor', side: 'right' },
  markedBlade: { labelKey: 'parts.markedBlade', side: 'right' },
  swashplate: { labelKey: 'parts.swashplate', side: 'left' },
  fuselage: { labelKey: 'parts.fuselage', side: 'left' },
  tailBoom: { labelKey: 'parts.tailBoom', side: 'right' },
  tailRotor: { labelKey: 'parts.tailRotor', side: 'left' },
  skids: { labelKey: 'parts.skids', side: 'left' },
};

export const PART_IDS = Object.keys(PART_INFO) as PartId[];
