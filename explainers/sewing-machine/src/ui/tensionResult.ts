import { t } from '@core/i18n';
import { requireElement, setText } from '@core/ui/dom';
import { watchLocalized } from '@core/ui/subscribe';
import type { Tension } from '../model';
import type { SewingStore } from '../state';

const RESULT_KEYS: Record<Tension, string> = {
  loose: 'sections.tension.result.loose',
  balanced: 'sections.tension.result.balanced',
  tight: 'sections.tension.result.tight',
};

export function mountTensionResult(root: Document, store: SewingStore): void {
  const result = requireElement(root, '[data-readout="tension-result"]');
  watchLocalized(
    store,
    (state) => state.tension,
    (tension) => {
      setText(result, t(RESULT_KEYS[tension]));
      result.dataset.tension = tension;
    },
  );
}
