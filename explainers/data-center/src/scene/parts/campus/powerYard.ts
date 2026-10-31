import type { PartId } from '../../../ids';
import { boxes, partGroup } from './kit';
import type { PieceBuilder } from './kit';
import { GANTRY } from '../../../model';

const PARTS: readonly PartId[] = ['gridLine', 'substation', 'transformers'];

export const buildPowerYard: PieceBuilder = (context, root) => {
  PARTS.forEach((id) =>
    boxes(context, id, 'steel', [GANTRY], partGroup(context, id, root, GANTRY.base)),
  );
  return {};
};
