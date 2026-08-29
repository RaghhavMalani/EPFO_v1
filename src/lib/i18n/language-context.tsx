"use client";

import { createContext, useCallback, useContext, useSyncExternalStore, type ReactNode } from "react";

export type Language = "en" | "hi";

const STORAGE_KEY = "epfo-one-language";

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

function getSnapshot(): Language {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "hi" ? "hi" : "en";
  } catch {
    return "en";
  }
}

/** The server (and the client's first paint, to match) always renders English. */
function getServerSnapshot(): Language {
  return "en";
}

type LanguageContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
};

const LanguageContext = createContext<LanguageContextValue>({
  language: "en",
  setLanguage: () => {},
});

/**
 * Reads the persisted language via `useSyncExternalStore`, the sanctioned way to
 * subscribe a component to state that lives outside React (here, localStorage).
 * It renders English during SSR and the client's first paint for a hydration
 * match, then immediately reflects the stored preference.
 */
export function LanguageProvider({ children }: { children: ReactNode }) {
  const language = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setLanguage = useCallback((next: Language) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Ignore storage failures; the toggle still works for the current tab below.
    }
    // The native "storage" event only fires in *other* tabs, so this tab needs a
    // manual nudge to re-read the value it just wrote.
    window.dispatchEvent(new Event("storage"));
  }, []);

  return <LanguageContext.Provider value={{ language, setLanguage }}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  return useContext(LanguageContext);
}
