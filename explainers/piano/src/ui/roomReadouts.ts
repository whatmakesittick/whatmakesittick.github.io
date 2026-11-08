import { t } from '@core/i18n';
import type { RegisterId } from '../ids';
import { NOTES, STRETCH_PARTIAL, TOTAL_TENSION_T, decaySeconds, stretchCents } from '../model';
import { hertz, tenths, whole } from './format';
import type { ChapterReadouts } from './readouts';

const MODELLED_REGISTER: RegisterId = 'treble';

function isModelled(register: RegisterId): boolean {
  return register === MODELLED_REGISTER;
}

export const ROOM_READOUTS: ChapterReadouts = {
  note: ({ register }) =>
    t(`chapters.room.noteValue.${register}`, { hz: hertz(NOTES[register].hz) }),
  strings: ({ register }) =>
    t(`chapters.room.stringsValue.${register}`, { count: whole(NOTES[register].strings) }),
  stretch: ({ register }) =>
    t(isModelled(register) ? 'chapters.room.stretchModel' : 'chapters.room.stretchValue', {
      n: whole(STRETCH_PARTIAL[register]),
      cents: whole(stretchCents(register)),
    }),
  decay: ({ register, pedal }) =>
    t(isModelled(register) ? 'chapters.room.decayModel' : 'chapters.room.decayValue', {
      seconds: tenths(decaySeconds(pedal, register)),
    }),
  tension: () => t('chapters.room.tensionValue', { tonnes: whole(TOTAL_TENSION_T) }),
};
