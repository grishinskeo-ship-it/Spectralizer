import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { LANGS, STRINGS, detectLang, interpolate, type Lang } from './strings';

interface I18nValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(detectLang);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    try {
      window.localStorage.setItem('spectralizer-lang', next);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    const title = STRINGS[lang]?.appTitle ?? STRINGS.en.appTitle;
    if (title) {
      document.title = title;
    }
    const locale = lang === 'de' ? 'de_DE' : lang === 'ru' ? 'ru_RU' : 'en_US';
    document.querySelector('meta[property="og:locale"]')?.setAttribute('content', locale);
  }, [lang]);

  const t = useCallback((key: string, vars?: Record<string, string | number>) => {
    const table = STRINGS[lang] ?? STRINGS.en;
    return interpolate(table[key] ?? STRINGS.en[key] ?? key, vars);
  }, [lang]);

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useI18n must be used inside I18nProvider');
  }
  return ctx;
}

export { LANGS };
export type { Lang };
