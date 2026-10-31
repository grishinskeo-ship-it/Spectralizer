import { LANG_LABELS } from '../i18n/strings';
import { LANGS, useI18n } from '../i18n/I18nContext';

export function LanguageSwitch() {
  const { lang, setLang } = useI18n();

  return (
    <div className="lang-switch" role="group" aria-label="Language">
      {LANGS.map((code) => (
        <button
          key={code}
          type="button"
          className={code === lang ? 'active' : ''}
          onClick={() => setLang(code)}
        >
          {LANG_LABELS[code]}
        </button>
      ))}
    </div>
  );
}
