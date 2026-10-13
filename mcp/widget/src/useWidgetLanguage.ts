import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { DEFAULT_LANGUAGE } from '../../../src/core/i18n/languages.ts';
import type { WidgetHost } from './bridge.ts';
import { EMPTY_CATALOGUE } from './catalogue.ts';
import { NO_SIGNALS, languageOf, withContext, withInput, withResult } from './i18n/language.ts';
import type { LanguagePack, Packs } from './i18n/packs.ts';
import type { SceneSession } from './scene.ts';

const LANGUAGE_PATIENCE_MS = 1500;

export function useWidgetLanguage(host: WidgetHost, packs: Packs, session: SceneSession) {
  const [signals, setSignals] = useState(() => withContext(NO_SIGNALS, host.context()));
  const lang = languageOf(signals);
  const [pack, setPack] = useState<LanguagePack | undefined>(
    () => packs.ready(lang) ?? packs.ready(DEFAULT_LANGUAGE),
  );
  const [settled, setSettled] = useState(() => (packs.ready(lang) ? lang : undefined));
  const [patient, setPatient] = useState(true);
  const [failed, setFailed] = useState(false);
  const langRef = useRef(lang);
  langRef.current = lang;
  const packRef = useRef(pack);
  packRef.current = pack;

  useEffect(() => {
    const offs = [
      host.on('input', (args) => setSignals((s) => withInput(s, args))),
      host.on('result', (result) => setSignals((s) => withResult(s, result))),
      host.on('context', (c) => setSignals((s) => withContext(s, c))),
    ];
    return () => offs.forEach((off) => off());
  }, [host]);

  useEffect(() => {
    packs
      .load(DEFAULT_LANGUAGE)
      .then((english) => setPack((current) => current ?? english))
      .catch((error: unknown) => {
        console.warn('[wmit-widget] no catalogue', error);
        setFailed(true);
      });
  }, [packs]);

  useEffect(() => {
    void session.setLanguage(lang);
    if (pack?.lang === lang) return setSettled(lang);
    let live = true;
    const timer = setTimeout(() => setPatient(false), LANGUAGE_PATIENCE_MS);
    packs
      .load(lang)
      .then((next) => live && langRef.current === next.lang && setPack(next))
      .catch((error: unknown) => console.warn('[wmit-widget] language', lang, error))
      .finally(() => live && langRef.current === lang && setSettled(lang));
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [lang, session]);

  useEffect(() => {
    if (pack) document.documentElement.lang = pack.lang;
  }, [pack?.lang]);

  const refresh = useCallback(() => {
    const current = packRef.current;
    if (!current) return;
    void packs
      .refresh(current.lang)
      .then((next) => next && setPack((p) => (p?.lang === next.lang ? next : p)));
  }, [packs]);

  const shown: LanguagePack = pack ?? {
    lang: DEFAULT_LANGUAGE,
    catalogue: EMPTY_CATALOGUE,
    strings: packs.englishStrings,
  };
  return { pack: shown, waiting: !failed && (!pack || (patient && settled !== lang)), refresh };
}
