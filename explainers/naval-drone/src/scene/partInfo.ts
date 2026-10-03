import type { PartInfo } from '@core/explainer';
import type { LabelSide } from '@core/scene/labelLayout';
import { PART_IDS } from '../ids';
import type { PartId } from '../ids';

const LEFT_PARTS: ReadonlySet<PartId> = new Set<PartId>([
  'waterjet',
  'engine',
  'fuelTanks',
  'electronicsBay',
  'intake',
  'duct',
  'driveShaft',
  'impeller',
  'wake',
  'jetStream',
  'wettedLength',
  'backupPanel',
  'backupLink',
  'groundStation',
  'companions',
  'shipRadar',
  'hull',
]);

function labelSide(id: PartId): LabelSide {
  return LEFT_PARTS.has(id) ? 'left' : 'right';
}

export const PART_INFO: Record<PartId, PartInfo> = Object.fromEntries(
  PART_IDS.map((id) => [id, { labelKey: `parts.${id}`, side: labelSide(id) }]),
) as Record<PartId, PartInfo>;

export const LABEL_PRIORITY: readonly PartId[] = [
  'impeller',
  'steeringNozzle',
  'reverseBucket',
  'nozzle',
  'stator',
  'intake',
  'duct',
  'driveShaft',
  'jetStream',
  'wettedLength',
  'spray',
  'bowWave',
  'wake',
  'chines',
  'sprayRails',
  'cameraDome',
  'bowCamera',
  'starlinkPanels',
  'backupPanel',
  'satLink',
  'backupLink',
  'videoGhost',
  'satellite',
  'backupSatellite',
  'groundStation',
  'payloadBay',
  'engine',
  'fuelTanks',
  'electronicsBay',
  'waterjet',
  'missileRails',
  'ship',
  'shipRadar',
  'companions',
  'hull',
];
