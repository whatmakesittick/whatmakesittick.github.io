import type { PartId } from '../../../ids';
import { DETAIL } from '../../constants';
import type { Detail } from '../../constants';
import { HERO_FINISHES, ROW_FINISHES } from '../../finishes';
import type { MotorFinishes } from '../../finishes';
import type { EmphasisGroup } from '../context';

export type MotorPartId = Extract<
  PartId,
  'cRing' | 'centralStalk' | 'subunitA' | 'peripheralStalk' | 'alphaSubunits' | 'betaSubunits'
>;

export interface MotorLook {
  readonly detail: Detail;
  readonly finishes: MotorFinishes;
  group(part: MotorPartId): EmphasisGroup;
}

export const HERO_LOOK: MotorLook = {
  detail: DETAIL.hero,
  finishes: HERO_FINISHES,
  group: (part) => part,
};

export const ROW_LOOK: MotorLook = {
  detail: DETAIL.row,
  finishes: ROW_FINISHES,
  group: () => 'neighbourMotors',
};
