import type { Group } from 'three';
import type { AssemblyState, PartId, Point } from '../../../../ids';
import { label, namedGroup } from '../../context';
import type { Motion, PartContext } from '../../context';
import { buildBedplate } from './bedplate';
import { buildBrake } from './brake';
import { DECK_Y, FAST_SHAFT_RATIO } from './constants';
import { buildConverter, CONVERTER_FACE_Z } from './converter';
import { buildFrame } from './frame';
import { buildGearbox } from './gearbox';
import { buildGenerator } from './generator';
import { buildMainBearing } from './mainBearing';
import { buildMainShaft } from './mainShaft';
import { buildService } from './service';
import { buildYawDrives, DRIVE_TOP } from './yawDrives';

export interface Interior {
  readonly root: Group;
  setState(state: AssemblyState): void;
  animate(motion: Motion): void;
}

const INTERIOR_LABELS: readonly (readonly [PartId, Point])[] = [
  ['bedplate', [-2.2, DECK_Y, 1.2]],
  ['mainBearing', [-3.6, 105.6, 1.04]],
  ['mainShaft', [-2.4, 105.3, 0.52]],
  ['gearbox', [-0.5, 105.8, 1.15]],
  ['brakeDisc', [2.6, 105.5, 0.75]],
  ['generator', [4.4, 105.5, 0.75]],
  ['converter', [7.0, 105.4, CONVERTER_FACE_Z]],
  ['yawDrives', [0.8, DRIVE_TOP, 1.72]],
];

export function buildInterior(context: PartContext): Interior {
  const root = namedGroup('interior');
  buildBedplate(context, root);
  buildFrame(context, root);
  buildYawDrives(context, root);
  buildMainBearing(context, root);
  const mainShaft = buildMainShaft(context, root);
  buildGearbox(context, root);
  const brake = buildBrake(context, root);
  buildGenerator(context, root);
  buildConverter(context, root);
  buildService(context, root);
  INTERIOR_LABELS.forEach(([part, point]) => label(context, part, root, point));
  return {
    root,
    setState: (state) => brake.setBraked(state.rotor.braked),
    animate: (motion) => {
      mainShaft.rotation.x = motion.azimuth;
      brake.spin.rotation.x = FAST_SHAFT_RATIO * motion.azimuth;
    },
  };
}
