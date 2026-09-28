import { smoothstep } from '@core/math';
import { STRING, TOP_DRIVE } from '../../constants';

export function standShare(bitDepth: number): number {
  const share = (bitDepth % STRING.standLength) / STRING.standLength;
  return share < 0 ? share + 1 : share;
}

export function quillHeight(bitDepth: number): number {
  const share = standShare(bitDepth);
  const travel = STRING.standLength;
  const drilling = 1 - TOP_DRIVE.liftShare;
  if (share < drilling) return TOP_DRIVE.quillLow + travel * (1 - share / drilling);
  return TOP_DRIVE.quillLow + travel * smoothstep(share, drilling, 1);
}
