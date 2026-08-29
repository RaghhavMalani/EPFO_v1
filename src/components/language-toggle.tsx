"use client";

import { useLanguage } from "@/lib/i18n/language-context";

export function LanguageToggle({ className = "" }: { className?: string }) {
  const { language, setLanguage } = useLanguage();

  return (
    <div className={`language-toggle ${className}`} role="group" aria-label="Choose language">
      <button
        type="button"
        onClick={() => setLanguage("en")}
        aria-pressed={language === "en"}
        className={language === "en" ? "language-toggle__option language-toggle__option--active" : "language-toggle__option"}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLanguage("hi")}
        aria-pressed={language === "hi"}
        className={language === "hi" ? "language-toggle__option language-toggle__option--active" : "language-toggle__option"}
      >
        हिं
      </button>
    </div>
  );
}
