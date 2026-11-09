import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { INTERNATIONAL } from "../lib/language";
import { useLocale } from "./LocaleContext";
import {
  TRANSLATIONS_PARAM,
  defaultTranslations,
  parseTranslations,
  readTranslationsCookie,
  writeTranslationsCookie,
} from "../lib/translations";
import useApi from "../hooks/useApi";

// The extra translations stacked under each hadith, on the international site only (a
// country's site reads in its own language alone). Pages are static, so the browser adds them:
// the reader's choice is saved in the hadith_tr cookie; a shared link can carry ?tr=bn,ur for
// that visit; until the reader chooses, the default (lib/translations defaultTranslations).
const ExtraTranslationsContext = createContext({ codes: [], setCodes: () => {} });

export function ExtraTranslationsProvider({ children }) {
  const { lang } = useLocale();
  const [codes, setState] = useState([]);

  useEffect(() => {
    if (!INTERNATIONAL) return;
    const shared = new URLSearchParams(window.location.search).get(TRANSLATIONS_PARAM);
    const saved = readTranslationsCookie();
    if (shared !== null) setState(parseTranslations(shared, lang));
    else if (saved !== null) setState(parseTranslations(saved, lang));
    else setState(defaultTranslations(lang));
  }, [lang]);

  const setCodes = useCallback(
    (next) => {
      const list = parseTranslations(next, lang);
      writeTranslationsCookie(list);
      setState(list);
    },
    [lang]
  );

  const value = useMemo(() => ({ codes, setCodes }), [codes, setCodes]);
  return <ExtraTranslationsContext.Provider value={value}>{children}</ExtraTranslationsContext.Provider>;
}

export const useExtraTranslations = () => useContext(ExtraTranslationsContext);

// `hadiths` with the reader's extra translations: `fetchWith(codes)` loads the same list (or
// hadith) from the API with ?translations=, in the browser; each hadith then gets that
// version's `extraLanguages` and `translations` (lib/translations extraTranslations). `key`
// names the list. Without extras (always on a country's site) the hadiths as they are.
export function useWithExtras(key, hadiths, fetchWith) {
  const { codes } = useExtraTranslations();
  const wanted = INTERNATIONAL && codes.length > 0 && Boolean(key);
  const joined = codes.join(",");
  const state = useApi(wanted ? `extras:${key}:${joined}` : null, () => fetchWith(codes), { enabled: wanted });
  return useMemo(() => {
    const list = Array.isArray(hadiths) ? hadiths : [];
    if (!wanted || !state.data) return list;
    const fetched = Array.isArray(state.data) ? state.data : [state.data];
    const byId = new Map(fetched.filter(Boolean).map((hadith) => [hadith.id, hadith]));
    return list.map((hadith) => {
      const extra = byId.get(hadith.id);
      return extra ? { ...hadith, extraLanguages: extra.extraLanguages, translations: extra.translations } : hadith;
    });
  }, [hadiths, state.data, wanted]);
}
