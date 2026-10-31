import type { PartId } from '../../../ids';
import { boxes, partGroup } from './kit';
import type { PieceBuilder } from './kit';
import { SWITCHGEAR } from '../../../model';

const PARTS: readonly PartId[] = ['generators'];

export const buildGenerators: PieceBuilder = (context, root) => {
  PARTS.forEach((id) =>
    boxes(context, id, 'steel', [SWITCHGEAR], partGroup(context, id, root, SWITCHGEAR.base)),
  );
  return {};
};
