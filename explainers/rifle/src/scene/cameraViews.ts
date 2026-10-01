import type { FramedView } from '@core/scene/cameraViews';
import type { CameraView, RegionId } from '../ids';

export const CAMERA_VIEWS: Readonly<Record<CameraView, FramedView<RegionId>>> = {
  hero: { region: 'rifle', direction: [0.6, 0.3, 1], margin: 1 },
  action: { region: 'receiver', direction: [0.35, 0.25, 1], margin: 1.1 },
  cartridge: { region: 'chamber', direction: [0.3, 0.25, 1], margin: 1.2 },
  barrel: { region: 'barrel', direction: [0.45, 0.3, 1], margin: 1.02 },
  gasSystem: { region: 'gasSystem', direction: [0.25, 0.35, 1], margin: 1.02 },
  reload: { region: 'reloadBay', direction: [0.4, 0.25, 1], margin: 1.05 },
};
