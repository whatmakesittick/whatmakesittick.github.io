import type { PartInfo } from '@core/explainer';
import type { PartId } from '../state';

export const PART_INFO: Record<PartId, PartInfo> = {
  piston: { labelKey: 'parts.piston', side: 'left' },
  connectingRod: { labelKey: 'parts.connectingRod', side: 'right' },
  crankshaft: { labelKey: 'parts.crankshaft', side: 'left' },
  flywheel: { labelKey: 'parts.flywheel', side: 'right' },
  cylinder: { labelKey: 'parts.cylinder', side: 'right' },
  combustionChamber: { labelKey: 'parts.combustionChamber', side: 'right' },
  intakeValve: { labelKey: 'parts.intakeValve', side: 'left' },
  exhaustValve: { labelKey: 'parts.exhaustValve', side: 'right' },
  intakeCam: { labelKey: 'parts.intakeCam', side: 'left' },
  exhaustCam: { labelKey: 'parts.exhaustCam', side: 'right' },
  intakePort: { labelKey: 'parts.intakePort', side: 'left' },
  exhaustPort: { labelKey: 'parts.exhaustPort', side: 'right' },
  sparkPlug: { labelKey: 'parts.sparkPlug', side: 'right' },
  injector: { labelKey: 'parts.injector', side: 'right' },
};

export const PART_IDS = Object.keys(PART_INFO) as PartId[];
