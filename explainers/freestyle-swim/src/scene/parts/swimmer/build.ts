import { PartBuilder as FigurePartBuilder } from '@core/figure/body/partBuilder';
import type { PartId } from '../../../ids';
import { FINISHES } from '../../finishes';
import type { Finish } from '../../finishes';
import type { PartContext } from '../context';

export class PartBuilder extends FigurePartBuilder<PartId, Finish> {
  constructor(context: PartContext) {
    super(context, FINISHES);
  }
}
