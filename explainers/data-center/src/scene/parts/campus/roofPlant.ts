import type { PartId } from '../../../ids';
import { ANCHOR_POINTS, CHILLER } from '../../../model';
import { sceneAnchor } from '../context';
import { boxes, partGroup } from './kit';
import type { PieceBuilder } from './kit';

const PARTS: readonly PartId[] = ['chiller', 'dryCoolers', 'facilityPipes', 'airHandlers'];

export const buildRoofPlant: PieceBuilder = (context, root) => {
  const groups = PARTS.map((id) => {
    const group = partGroup(context, id, root, CHILLER.base);
    boxes(context, id, 'steel', [CHILLER], group);
    return group;
  });
  sceneAnchor(context, 'roof', root, ANCHOR_POINTS.roof);
  return {
    setState(state) {
      groups[PARTS.indexOf('airHandlers')].visible = state.cooling === 'air';
    },
  };
};
