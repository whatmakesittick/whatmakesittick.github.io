import { smoothstep } from '@core/math';
import { STAND_LENGTH_M, TOP_DRIVE } from '../../constants';

export function standShare(bitDepth: number): number {
  const share = (bitDepth % STAND_LENGTH_M) / STAND_LENGTH_M;
  return share < 0 ? share + 1 : share;
}

export function quillHeight(bitDepth: number): number {
  const share = standShare(bitDepth);
  const travel = STAND_LENGTH_M;
  const drilling = 1 - TOP_DRIVE.liftShare;
  if (share < drilling) return TOP_DRIVE.quillLow + travel * (1 - share / drilling);
  return TOP_DRIVE.quillLow + travel * smoothstep(share, drilling, 1);
}
