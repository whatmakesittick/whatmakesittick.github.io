import { PartBuilder } from '@core/figure/body/partBuilder';
import type { PartId } from '../../../ids';
import type { PartContext } from '../context';
import { RUNNER_FINISHES } from './finishes';
import type { RunnerFinish } from './finishes';

export class RunnerPartBuilder extends PartBuilder<PartId, RunnerFinish> {
  constructor(context: PartContext) {
    super(context, RUNNER_FINISHES);
  }
}
