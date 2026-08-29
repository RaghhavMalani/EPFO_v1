"use client";

import { dictionary, type DictionaryKey } from "@/lib/i18n/dictionary";
import { useLanguage } from "@/lib/i18n/language-context";

/** Renders a dictionary string in the current language, falling back to English. */
export function T({ id }: { id: DictionaryKey }) {
  const { language } = useLanguage();
  const entry = dictionary[id];
  if (!entry) return <>{id}</>;
  return <>{entry[language] ?? entry.en}</>;
}

/** For places that need the plain string rather than a rendered node (e.g. aria-label). */
export function useTranslation() {
  const { language } = useLanguage();
  return function translate(id: DictionaryKey) {
    const entry = dictionary[id];
    if (!entry) return id;
    return entry[language] ?? entry.en;
  };
}
