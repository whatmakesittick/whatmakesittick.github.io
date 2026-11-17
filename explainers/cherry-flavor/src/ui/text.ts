import { t } from '@core/i18n';
import { ODORANT_IDS } from '../ids';
import type { FlavorReading, OdorantId, OdorantLevels, SniffId } from '../ids';
import { ODORANT_NOTE } from '../model';

export function smellText(reading: Pick<FlavorReading, 'smell'>): string {
  return t(`smells.${reading.smell}`);
}

export function perceptText(reading: Pick<FlavorReading, 'percept' | 'smell'>): string {
  return t(`percept.${reading.percept}`, { smell: smellText(reading) });
}

export function sniffText(sniff: SniffId): string {
  return t(`controls.sniffOptions.${sniff}`);
}

export function mainOdorant(profile: Readonly<OdorantLevels>): OdorantId {
  return ODORANT_IDS.reduce((top, id) => (profile[id] > profile[top] ? id : top));
}

export function mainShare(profile: Readonly<OdorantLevels>): number {
  const total = ODORANT_IDS.reduce((sum, id) => sum + profile[id], 0);
  return total === 0 ? 0 : profile[mainOdorant(profile)] / total;
}

export function mainText(profile: Readonly<OdorantLevels>): string {
  const odorant = mainOdorant(profile);
  return t('chapters.cherry.mainValue', {
    odorant: t(`odorants.${odorant}`),
    note: t(`notes.${ODORANT_NOTE[odorant]}`),
  });
}
