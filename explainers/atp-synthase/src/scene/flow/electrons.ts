import { smoothstep } from '@core/math';
import { ELECTRON_FORM } from '../constants';
import { setLerp } from './points';
import type { BeadPose } from './points';

const LEGS = ELECTRON_FORM.stops.length - 1;

export function poseElectron(progress: number, out: BeadPose): BeadPose {
  const travelled = progress * LEGS;
  const leg = Math.min(LEGS - 1, Math.floor(travelled));
  const hop = smoothstep(travelled - leg, ELECTRON_FORM.hopFrom, 1);
  const { stops, edgeShare } = ELECTRON_FORM;
  setLerp(out.position, stops[leg], stops[leg + 1], hop);
  out.scale = smoothstep(progress, 0, edgeShare) * (1 - smoothstep(progress, 1 - edgeShare, 1));
  return out;
}
