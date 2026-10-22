import { BEAM_M } from '../../../../../model';
import { HAZE, SCENE_LIMITS } from '../../../../constants';
import { GROUND_REACH } from '../../constants';
import { CONTACT_WIRE_RISE, RAIL } from '../constants';
import type { Span } from '../geometry/strip';

const SYSTEM_HEIGHT = 1.4;
const CONTACT_Y = RAIL.top + CONTACT_WIRE_RISE;
const MESSENGER_Y = CONTACT_Y + SYSTEM_HEIGHT;
const MAST_Z = -3.1;
const MAST_SECTION = 0.3;

export const TRACK_PERIOD = 2 * BEAM_M;

export const STRIP_SPAN: Span = { from: -GROUND_REACH, to: GROUND_REACH + TRACK_PERIOD };

export const RACK_REACH = {
  near: 150,
  far: SCENE_LIMITS.cameraMaxDistance + HAZE.far,
} as const;

export const SLEEPER = {
  perPeriod: 80,
  length: 2.6,
  width: 0.26,
  buried: 0.03,
} as const;

export const BASEPLATE = { length: 0.18, width: 0.32 } as const;

export const CATENARY = {
  contactY: CONTACT_Y,
  messengerY: MESSENGER_Y,
  sag: 0.42,
  sagSegments: 10,
  dropperShares: [0.12, 0.31, 0.5, 0.69, 0.88],
} as const;

export const MAST = {
  phase: TRACK_PERIOD / 4,
  z: MAST_Z,
  faceZ: MAST_Z + MAST_SECTION / 2,
  section: MAST_SECTION,
  flangeThickness: 0.022,
  webThickness: 0.014,
  top: MESSENGER_Y + 1,
  capThickness: 0.02,
  footing: { halfWidth: 0.45, top: 0.3, bottom: -0.1 },
} as const;

export const CANTILEVER = {
  upperY: MESSENGER_Y + 0.12,
  lowerY: CONTACT_Y - 0.15,
  apexZ: -0.1,
  reach: 0.45,
  registrationY: CONTACT_Y + 0.35,
  registrationEnd: 0.3,
  steadyArmStart: -0.9,
  steadyArmDrop: 0.03,
  insulatorLength: 0.6,
  hookRadius: 0.012,
  nearTube: { radius: 0.03, sides: 8 },
  farTube: { radius: 0.04, sides: 4 },
  steadyArm: { radius: 0.018, sides: 4 },
} as const;

export const INSULATOR = {
  core: 0.032,
  shed: 0.08,
  shedHalfThickness: 0.025,
  shedShares: [0.25, 0.5, 0.75],
  segments: 6,
} as const;
