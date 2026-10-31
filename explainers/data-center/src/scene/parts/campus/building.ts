import type { PartId } from '../../../ids';
import { boxes, partGroup } from './kit';
import type { PieceBuilder } from './kit';
import { SWITCHGEAR } from '../../../model';

const PARTS: readonly PartId[] = ['hall'];

export const buildBuilding: PieceBuilder = (context, root) => {
  PARTS.forEach((id) =>
    boxes(context, id, 'steel', [SWITCHGEAR], partGroup(context, id, root, SWITCHGEAR.base)),
  );
  return {};
};
