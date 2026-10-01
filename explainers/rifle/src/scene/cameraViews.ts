import type { FramedView } from '@core/scene/cameraViews';
import type { CameraView, RegionId } from '../ids';

export const CAMERA_VIEWS: Readonly<Record<CameraView, FramedView<RegionId>>> = {
  hero: { region: 'rifle', direction: [0.15, 0.25, 1], margin: 1.05 },
  action: { region: 'receiver', direction: [0.2, 0.2, 1], margin: 1.15 },
  cartridge: { region: 'chamber', direction: [0.3, 0.25, 1], margin: 1.2 },
  barrel: { region: 'barrel', direction: [0.1, 0.3, 1], margin: 1.08 },
  gasSystem: { region: 'gasSystem', direction: [0.1, 0.35, 1], margin: 1.1 },
  reload: { region: 'reloadBay', direction: [0.3, 0.25, 1], margin: 1.12 },
};
