import type { PartInfo } from '@core/explainer';
import type { PartId } from '../state';

export const PART_INFO: Record<PartId, PartInfo> = {
  wing: { labelKey: 'parts.wing', side: 'right' },
  fuselage: { labelKey: 'parts.fuselage', side: 'left' },
  tail: { labelKey: 'parts.tail', side: 'left' },
  lift: { labelKey: 'parts.lift', side: 'right' },
  weight: { labelKey: 'parts.weight', side: 'left' },
  drag: { labelKey: 'parts.drag', side: 'left' },
  field: { labelKey: 'parts.field', side: 'left' },
  thermal: { labelKey: 'parts.thermal', side: 'right' },
  cumulus: { labelKey: 'parts.cumulus', side: 'left' },
  wind: { labelKey: 'parts.wind', side: 'left' },
  ridge: { labelKey: 'parts.ridge', side: 'right' },
  rotor: { labelKey: 'parts.rotor', side: 'left' },
  wave: { labelKey: 'parts.wave', side: 'right' },
  lenticular: { labelKey: 'parts.lenticular', side: 'left' },
};

export const PART_IDS = Object.keys(PART_INFO) as PartId[];

export const LABEL_PRIORITY: readonly PartId[] = [
  'lift',
  'weight',
  'drag',
  'wing',
  'thermal',
  'cumulus',
  'field',
  'ridge',
  'wind',
  'wave',
  'lenticular',
  'rotor',
  'fuselage',
  'tail',
];
