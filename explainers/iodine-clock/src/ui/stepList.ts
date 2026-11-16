import { t } from '@core/i18n';
import type { Disposer } from '@core/ui/disposers';
import { queryAll, requireElement, setText } from '@core/ui/dom';
import { parseOption } from '@core/ui/parse';
import { watchLocalized } from '@core/ui/subscribe';
import { STEP_IDS } from '../ids';
import type { PhaseId, StepId } from '../ids';
import { phaseIdAt } from '../model';
import { stepStateAt } from '../model/steps';
import type { ClockStore } from '../state';

const STEP_LIST = '[data-steps]';
const STEP_ITEM = 'li[data-step]';
const STEP_STATE = '[data-step-state]';

interface StepRow {
  item: HTMLElement;
  step: StepId;
  label: HTMLElement;
}

function rowOf(item: HTMLElement): StepRow {
  return {
    item,
    step: parseOption(item.dataset.step, STEP_IDS),
    label: requireElement(item, STEP_STATE),
  };
}

function showRow({ item, step, label }: StepRow, phase: PhaseId): void {
  const state = stepStateAt(step, phase);
  item.dataset.state = state;
  setText(label, t(`steps.state.${state}`));
}

export function mountStepList(root: ParentNode, store: ClockStore): Disposer {
  const list = requireElement(root, STEP_LIST);
  const rows = queryAll(list, STEP_ITEM).map(rowOf);
  return watchLocalized(
    store,
    (state) => phaseIdAt(state.phase),
    (phase) => rows.forEach((row) => showRow(row, phase)),
  );
}
